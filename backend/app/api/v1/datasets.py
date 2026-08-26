"""
api/v1/datasets.py — complete v1 API router with SQL studio, BigQuery connectors,
auto-EDA, ML baseline, and executive report generator.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import HTMLResponse
from ...data import session_store as store
from ...agents import analyst_agent
from ...sql import engine as sql_engine
from ...connectors import bigquery_connector as bq_connector
from ...reports import report_generator as rep_gen

router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """Upload CSV/XLSX/JSON. Returns full dashboard payload."""
    try:
        contents   = await file.read()
        dataset_id = store.load_file(contents, file.filename or "upload")
        analyst_agent.reset_memory(dataset_id)
        return store.get_full_upload_response(dataset_id)
    except ValueError as e:
        raise HTTPException(400, detail={"code": "INVALID_FILE", "message": str(e)})
    except Exception as e:
        raise HTTPException(500, detail={"code": "UPLOAD_FAILED", "message": f"Upload failed: {e}"})


@router.get("/")
async def list_datasets():
    """List all currently loaded datasets in the session."""
    datasets = []
    for ds_id in store._STORE.keys():
        datasets.append(store.get_meta(ds_id))
    return {"datasets": datasets}


@router.get("/{dataset_id}")
async def get_dataset(dataset_id: str):
    _check(dataset_id)
    return store.get_full_upload_response(dataset_id)


@router.get("/{dataset_id}/preview")
async def preview_dataset(dataset_id: str, rows: int = 50):
    _check(dataset_id)
    df = store.get_df(dataset_id)
    sample = df.head(rows).where(df.notna(), other=None)
    return {
        "dataset_id":   dataset_id,
        "column_names": list(df.columns),
        "rows":         sample.to_dict(orient="records"),
        "total_rows":   len(df),
    }


@router.get("/{dataset_id}/schema")
async def get_schema(dataset_id: str):
    _check(dataset_id)
    return {"dataset_id": dataset_id, "schema": store.get_schema(dataset_id)}


@router.get("/{dataset_id}/profile")
async def get_profile(dataset_id: str):
    """Full statistical profile for Summary Statistics tab."""
    _check(dataset_id)
    import pandas as pd
    df = store.get_df(dataset_id)
    numeric = df.select_dtypes(include="number")
    profile = {}
    if not numeric.empty:
        desc = numeric.describe().round(4)
        profile = desc.to_dict()
    return {"dataset_id": dataset_id, "profile": profile}


@router.post("/{dataset_id}/chat")
async def chat(dataset_id: str, body: dict):
    _check(dataset_id)
    query = body.get("query", body.get("message", "")).strip()
    if not query:
        raise HTTPException(400, detail={"code": "EMPTY_QUERY", "message": "Query cannot be empty."})

    # Build schema context from the authoritative session_store
    df = store.get_df(dataset_id)
    schema_str = "\n".join(
        [f"- {col}: {str(df[col].dtype)}" for col in df.columns]
    )

    from ...llm import orchestrator
    try:
        reply = orchestrator.chat_with_data(
            user_message=query,
            schema_context=schema_str,
        )
    except Exception as e:
        error_msg = str(e)
        user_msg = f"AI Error: {error_msg}"
        if "API_KEY_INVALID" in error_msg or "API key not valid" in error_msg:
            user_msg = "Invalid Gemini API Key. Please provide a valid key from Google AI Studio."
        elif "quota" in error_msg.lower() or "RESOURCE_EXHAUSTED" in error_msg:
            user_msg = "Gemini API quota exceeded. Please wait a moment and retry."
        elif "No Gemini API keys" in error_msg:
            user_msg = "No GEMINI_API_KEY found in backend/.env."
        return {
            "response":   user_msg,
            "reply":      user_msg,
            "chart_data": None,
            "tool_calls": [],
            "error":      {"code": "AGENT_ERROR", "message": error_msg[:300]},
        }

    # Refresh preview after any tool may have mutated DATA_STORE["df"]
    from ...data import processing
    try:
        new_schema, new_preview, new_rows = processing.get_schema_and_preview()
    except Exception:
        new_schema, new_preview, new_rows = [], [], 0

    return {
        "response":   reply,
        "reply":      reply,
        "chart_data": None,
        "tool_calls": [],
        "rows":       new_rows,
        "schema_info": new_schema,
        "preview":    new_preview,
    }


@router.post("/{dataset_id}/eda")
async def run_eda(dataset_id: str):
    """Auto-generate EDA charts for the dataset."""
    _check(dataset_id)
    import pandas as pd
    from ...tools import dataset_tools as dt

    df     = store.get_df(dataset_id)
    charts = []

    numeric_cols     = list(df.select_dtypes(include="number").columns)
    categorical_cols = list(df.select_dtypes(include=["object", "category"]).columns)

    # Histogram for first numeric col
    if numeric_cols:
        charts.append(dt.generate_histogram(dataset_id, numeric_cols[0]))

    # Bar chart: first categorical × first numeric
    if categorical_cols and numeric_cols:
        charts.append(dt.generate_bar_chart(dataset_id, categorical_cols[0], numeric_cols[0]))

    # Scatter: first two numeric cols
    if len(numeric_cols) >= 2:
        charts.append(dt.generate_scatter_chart(dataset_id, numeric_cols[0], numeric_cols[1]))

    # Second histogram for second numeric
    if len(numeric_cols) >= 2:
        charts.append(dt.generate_histogram(dataset_id, numeric_cols[1]))

    return {"dataset_id": dataset_id, "charts": [c for c in charts if "error" not in c]}


# ── Phase 6: Multi-table SQL & Joins ──────────────────────────────

@router.post("/sql/query")
async def execute_sql_query(body: dict):
    """Executes SQL query across all loaded datasets."""
    query = body.get("query", "").strip()
    if not query:
        raise HTTPException(400, detail={"code": "EMPTY_QUERY", "message": "SQL query cannot be empty."})
    try:
        return sql_engine.execute_sql(query)
    except ValueError as e:
        raise HTTPException(400, detail={"code": "SQL_ERROR", "message": str(e)})
    except Exception as e:
        raise HTTPException(500, detail={"code": "EXECUTION_FAILED", "message": str(e)})


@router.post("/sql/join")
async def execute_join(body: dict):
    """Relational visual dataset join."""
    try:
        ds1 = body["dataset_id_1"]
        ds2 = body["dataset_id_2"]
        left_on = body["left_on"]
        right_on = body["right_on"]
        how = body.get("how", "inner")
        name = body.get("name")
        return sql_engine.join_datasets(ds1, ds2, left_on, right_on, how, name)
    except Exception as e:
        raise HTTPException(400, detail={"code": "JOIN_ERROR", "message": str(e)})


# ── Phase 6: BigQuery Connector ───────────────────────────────────

@router.get("/connectors/bigquery/test")
async def test_bigquery():
    """Test BigQuery connection and get public datasets."""
    return bq_connector.test_connection()


@router.post("/connectors/bigquery/query")
async def query_bigquery(body: dict):
    """Query BigQuery and optionally import result into DataPilot workspace."""
    query = body.get("query", "").strip()
    project_id = body.get("project_id")
    import_as_ds = body.get("import_as_dataset", True)
    if not query:
        raise HTTPException(400, detail={"code": "EMPTY_QUERY", "message": "Query cannot be empty."})
    try:
        return bq_connector.query_bigquery(query, project_id, import_as_ds)
    except Exception as e:
        raise HTTPException(500, detail={"code": "BIGQUERY_ERROR", "message": str(e)})


# ── Phase 7: Executive Report Generation ──────────────────────────

@router.get("/{dataset_id}/report")
async def get_executive_report(dataset_id: str):
    """Generates an executive intelligence HTML report."""
    _check(dataset_id)
    try:
        return rep_gen.generate_executive_report(dataset_id)
    except Exception as e:
        raise HTTPException(500, detail={"code": "REPORT_ERROR", "message": str(e)})


@router.get("/{dataset_id}/report/download", response_class=HTMLResponse)
async def download_executive_report_html(dataset_id: str):
    """Direct downloadable HTML executive report."""
    _check(dataset_id)
    report = rep_gen.generate_executive_report(dataset_id)
    return HTMLResponse(content=report["html"])


@router.get("/export/notebook")
async def export_jupyter_notebook():
    """Generates and downloads a .ipynb file from the active session."""
    import json
    from fastapi.responses import Response
    from ...data import processing
    from ...llm import orchestrator
    from ...reports.notebook_generator import generate_notebook_dict

    try:
        schema, _, _ = processing.get_schema_and_preview()
    except Exception:
        # Fallback to session store if processing DATA_STORE is empty
        schema = []
        if store._STORE:
            first_id = next(iter(store._STORE.keys()))
            schema = store.get_schema(first_id)

    session_history = orchestrator.SESSION_MEMORY
    notebook_dict = generate_notebook_dict(session_history, schema)
    notebook_json = json.dumps(notebook_dict, indent=2)

    return Response(
        content=notebook_json,
        media_type="application/x-ipynb+json",
        headers={
            "Content-Disposition": "attachment; filename=datapilot_analysis.ipynb"
        }
    )


def _check(dataset_id: str):
    if not store.exists(dataset_id):
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": f"Dataset '{dataset_id}' not found."})


# ── Phase 8: Data Quality Audit ───────────────────────────────────

@router.get("/quality/report")
async def get_data_quality_report():
    """
    Returns a detailed statistical health audit for the active dataset.
    Includes per-column outlier counts, skewness, IQR bounds, and an
    overall health score (0–100).
    """
    from ...data.quality import calculate_data_quality
    from ...data import processing

    # Prefer the most-recently-uploaded dataset from session_store
    df = None
    if store._STORE:
        latest_id = next(reversed(store._STORE))
        df = store.get_df(latest_id)
    else:
        # Fall back to the processing DATA_STORE (tool-calling path)
        df = processing.DATA_STORE.get("df")

    if df is None:
        raise HTTPException(
            status_code=400,
            detail={"code": "NO_DATASET", "message": "No active dataset loaded."},
        )

    report = calculate_data_quality(df)
    return {"status": "success", "report": report}