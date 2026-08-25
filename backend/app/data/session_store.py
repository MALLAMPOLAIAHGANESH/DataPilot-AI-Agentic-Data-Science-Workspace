"""
data/session_store.py — updated to return preview in upload response
and compute a quality score.
"""
from __future__ import annotations

import uuid
import io
import pandas as pd
import numpy as np
from typing import Any


_STORE: dict[str, dict] = {}


def _new_id() -> str:
    return "ds_" + uuid.uuid4().hex[:10]


def _quality_score(df: pd.DataFrame) -> dict:
    """Compute a 0-100 quality score with sub-dimensions."""
    n_cells = df.size or 1
    missing_pct = float(df.isna().sum().sum()) / n_cells * 100

    completeness = max(0.0, 100.0 - missing_pct)

    # duplicated() can fail on unhashable types — guard it
    try:
        dup_pct   = float(df.duplicated().sum()) / max(len(df), 1) * 100
        consistency = max(0.0, 100.0 - dup_pct * 2)
    except Exception:
        consistency = 100.0

    # isinf only on numeric cols
    validity = 100.0
    try:
        numeric = df.select_dtypes(include="number")
        if not numeric.empty:
            inf_count = np.isinf(numeric.values).sum()
            validity  = max(0.0, 100.0 - float(inf_count) / n_cells * 100)
    except Exception:
        validity = 100.0

    try:
        uniqueness = min(100.0, float(df.nunique().mean()) / max(len(df), 1) * 200)
    except Exception:
        uniqueness = 50.0

    timeliness = 100.0

    overall = round(
        completeness * 0.35 + consistency * 0.25 +
        validity     * 0.20 + uniqueness  * 0.10 + timeliness * 0.10
    )
    return {
        "overall":      int(overall),
        "completeness": round(completeness, 1),
        "consistency":  round(consistency,  1),
        "validity":     round(validity,     1),
        "uniqueness":   round(uniqueness,   1),
        "timeliness":   round(timeliness,   1),
        "grade":        "Good" if overall >= 80 else "Fair" if overall >= 60 else "Poor",
    }


def _build_schema(df: pd.DataFrame) -> list[dict]:
    schema = []
    n = max(len(df), 1)
    for col in df.columns:
        missing = int(df[col].isna().sum())
        schema.append({
            "name":               col,
            "dtype":              str(df[col].dtype),
            "missing":            missing,
            "missing_percentage": round(missing / n * 100, 1),
            "unique":             int(df[col].nunique(dropna=False)),
        })
    return schema


def load_file(file_bytes: bytes, filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext == "csv":
        df = pd.read_csv(io.BytesIO(file_bytes))
    elif ext in ("xlsx", "xls"):
        df = pd.read_excel(io.BytesIO(file_bytes), engine="openpyxl")
    elif ext == "json":
        df = pd.read_json(io.BytesIO(file_bytes))
    else:
        raise ValueError(f"Unsupported file type: .{ext}")

    dataset_id = _new_id()
    _STORE[dataset_id] = {
        "df":       df,
        "filename": filename,
        "schema":   _build_schema(df),
        "quality":  _quality_score(df),
    }
    return dataset_id


# ── Public accessors ──────────────────────────────────────────────

def get_df(dataset_id: str) -> pd.DataFrame:
    return _require(dataset_id)["df"]

def get_schema(dataset_id: str) -> list[dict]:
    return _require(dataset_id)["schema"]

def get_filename(dataset_id: str) -> str:
    return _require(dataset_id)["filename"]

def get_quality(dataset_id: str) -> dict:
    return _require(dataset_id)["quality"]

def exists(dataset_id: str) -> bool:
    return dataset_id in _STORE

def get_full_upload_response(dataset_id: str) -> dict:
    """Single call that returns everything the dashboard needs on upload."""
    entry = _require(dataset_id)
    df    = entry["df"]
    n_cells = max(df.size, 1)

    missing_cells = int(df.isna().sum().sum())
    missing_pct   = round(missing_cells / n_cells * 100, 1)

    # Safe preview: replace NaN/NaT with None for JSON serialization
    preview_rows = []
    for _, row in df.head(10).iterrows():
        safe_row = {}
        for col, val in row.items():
            try:
                import math
                if val is None or (isinstance(val, float) and math.isnan(val)):
                    safe_row[col] = None
                else:
                    safe_row[col] = val
            except Exception:
                safe_row[col] = str(val)
        preview_rows.append(safe_row)

    return {
        "dataset_id":         dataset_id,
        "file_name":          entry["filename"],
        "rows":               len(df),
        "columns":            len(df.columns),
        "missing_cells":      missing_cells,
        "missing_percentage": missing_pct,
        "schema":             entry["schema"],
        "quality":            entry["quality"],
        "preview":            preview_rows,
        "column_names":       list(df.columns),
    }

def get_meta(dataset_id: str) -> dict:
    entry = _require(dataset_id)
    df    = entry["df"]
    return {
        "dataset_id":     dataset_id,
        "file_name":      entry["filename"],
        "rows":           len(df),
        "columns":        len(df.columns),
        "missing_values": int(df.isna().sum().sum()),
        "schema":         entry["schema"],
    }

def update_df(dataset_id: str, df: pd.DataFrame) -> None:
    entry = _require(dataset_id)
    entry["df"]      = df
    entry["schema"]  = _build_schema(df)
    entry["quality"] = _quality_score(df)

def _require(dataset_id: str) -> dict:
    if dataset_id not in _STORE:
        raise KeyError(f"Dataset '{dataset_id}' not found.")
    return _STORE[dataset_id]
