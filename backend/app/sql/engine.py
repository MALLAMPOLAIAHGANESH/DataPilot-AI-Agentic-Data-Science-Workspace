"""
sql/engine.py — Unified SQL Routing Engine for DataPilot-AI.

Routes queries seamlessly between local DuckDB (in-memory analytics over session DataFrames)
and remote Google Cloud BigQuery client.
"""
from __future__ import annotations

import duckdb
import pandas as pd
from typing import Any, Dict

from app.connectors.bigquery_connector import bq_client
from app.data.session_store import get_dataset
from app.data import session_store as store


def execute_workspace_query(query: str, source: str = "local", session_id: str = "default_session") -> dict:
    """Routes the query to either local DuckDB or live BigQuery."""
    try:
        if source == "bigquery":
            df_result = bq_client.execute_query(query)
        else:
            # Local execution using DuckDB against the active session DataFrame
            df = get_dataset(session_id)
            if df is None:
                raise ValueError("No active local dataset. Please upload a CSV first.")
            df_result = duckdb.query(query).to_df()

        return {
            "status": "success",
            "columns": df_result.columns.tolist(),
            "row_count": len(df_result),
            # Send top 100 rows to the UI to prevent browser memory crashes
            "data": df_result.head(100).to_dict(orient="records")
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


def execute_sql(query: str, session_id: str = "default_session") -> dict[str, Any]:
    """Shim for tool calls and Copilot interactions."""
    res = execute_workspace_query(query, source="local", session_id=session_id)
    if res.get("status") == "error":
        raise ValueError(res.get("message", "SQL execution failed"))
    return res


def join_datasets(
    dataset_id_1: str,
    dataset_id_2: str,
    left_on: str,
    right_on: str,
    how: str = "inner",
    new_name: str | None = None,
) -> dict[str, Any]:
    """
    Performs a deterministic relational join between two datasets and stores the result as a new dataset.
    how: 'inner' | 'left' | 'right' | 'outer'
    """
    df1 = store.get_df(dataset_id_1)
    df2 = store.get_df(dataset_id_2)

    if left_on not in df1.columns:
        raise ValueError(f"Column '{left_on}' not found in dataset 1.")
    if right_on not in df2.columns:
        raise ValueError(f"Column '{right_on}' not found in dataset 2.")

    merged_df = pd.merge(
        df1,
        df2,
        left_on=left_on,
        right_on=right_on,
        how=how,
        suffixes=("_left", "_right"),
    )

    filename_1 = store.get_filename(dataset_id_1).rsplit(".", 1)[0]
    filename_2 = store.get_filename(dataset_id_2).rsplit(".", 1)[0]
    merged_filename = new_name or f"{filename_1}_{how}_join_{filename_2}.csv"

    # Register in session store
    new_id = store._new_id()
    store._STORE[new_id] = {
        "df": merged_df,
        "filename": merged_filename,
        "schema": store._build_schema(merged_df),
        "quality": store._quality_score(merged_df),
    }

    return store.get_full_upload_response(new_id)
