"""
api/v1/datasets.py — updated upload response + proper error shapes
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from ...data   import session_store as store
from ...agents import analyst_agent

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
    query = body.get("query", "").strip()
    if not query:
        raise HTTPException(400, detail={"code": "EMPTY_QUERY", "message": "Query cannot be empty."})
    try:
        result = analyst_agent.chat(dataset_id, query)
        return result
    except Exception as e:
        error_msg = str(e)
        user_msg = f"AI Error: {error_msg}"
        if "API_KEY_INVALID" in error_msg or "API key not valid" in error_msg or "INVALID_ARGUMENT" in error_msg:
            user_msg = "Invalid Gemini API Key. Please provide a valid key from Google AI Studio (starting with AIzaSy...)."
        elif "quota" in error_msg.lower() or "RESOURCE_EXHAUSTED" in error_msg:
            user_msg = "Gemini API quota exceeded on your key(s). Please add another key or wait a minute."
        elif "No Gemini API keys" in error_msg:
            user_msg = "No GEMINI_API_KEY found in backend/.env."

        return {
            "response":   user_msg,
            "chart_data": None,
            "tool_calls": [],
            "error":      {"code": "AGENT_ERROR", "message": error_msg[:300]},
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


def _check(dataset_id: str):
    if not store.exists(dataset_id):
        raise HTTPException(404, detail={"code": "NOT_FOUND", "message": f"Dataset '{dataset_id}' not found."})
