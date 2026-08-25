"""
sql/engine.py
In-memory SQL engine supporting multi-table queries and visual joins across all stored datasets.
Uses an in-memory SQLite connection dynamically populated with DataFrames.
"""
from __future__ import annotations

import sqlite3
import pandas as pd
import time
import re
from typing import Any
from ..data import session_store as store


def execute_sql(query: str) -> dict[str, Any]:
    """
    Executes a SQL query across all loaded datasets.
    Tables are registered under:
      - Cleaned file_name (e.g. 'titanic', 'movies')
      - dataset_id (e.g. 'ds_123')
      - 'df1', 'df2', etc. (by order of ingestion)
    """
    start_time = time.time()
    
    # Read-only security check: disallow mutating or file system statements
    forbidden = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "ATTACH", "DETACH", "PRAGMA"]
    clean_query = query.strip()
    query_upper = clean_query.upper()
    for word in forbidden:
        if re.search(r'\b' + word + r'\b', query_upper):
            raise ValueError(f"Security Alert: '{word}' statements are not permitted in analytical SQL mode.")

    conn = sqlite3.connect(":memory:")

    # Register all datasets in store as SQLite tables
    table_index = 1
    table_mapping = {}
    
    for ds_id, entry in store._STORE.items():
        df = entry.get("df")
        if df is None:
            continue

        # Register by sanitized filename
        base_name = re.sub(r'[^a-zA-Z0-9_]', '_', entry.get("filename", "").rsplit(".", 1)[0]).lower()
        if not base_name or base_name[0].isdigit():
            base_name = f"table_{base_name}"
            
        try:
            df.to_sql(base_name, conn, index=False, if_exists="replace")
            table_mapping[base_name] = ds_id
        except Exception:
            pass

        # Register as table_1, table_2 / df1, df2
        alias = f"df{table_index}"
        try:
            df.to_sql(alias, conn, index=False, if_exists="replace")
            table_mapping[alias] = ds_id
        except Exception:
            pass
        
        # Register by ds_id
        try:
            df.to_sql(ds_id, conn, index=False, if_exists="replace")
            table_mapping[ds_id] = ds_id
        except Exception:
            pass

        table_index += 1

    try:
        result_df = pd.read_sql_query(clean_query, conn)
        execution_time_ms = round((time.time() - start_time) * 1000, 2)

        # Replace NaN with None for JSON serialization
        sample_rows = result_df.head(100).where(result_df.notna(), other=None).to_dict(orient="records")

        return {
            "query": clean_query,
            "columns": list(result_df.columns),
            "rows": sample_rows,
            "total_rows": len(result_df),
            "execution_time_ms": execution_time_ms,
            "available_tables": list(table_mapping.keys()),
        }
    except Exception as e:
        raise ValueError(f"SQL Execution Error: {str(e)}")
    finally:
        conn.close()


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
