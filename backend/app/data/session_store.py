"""
data/session_store.py — True Multi-User Session Isolation
=========================================================
Each browser tab gets its own isolated sandbox (DataFrame store +
chat memory) keyed by a UUID that the frontend generates.

Architecture:
  ACTIVE_SESSIONS  — dict[session_id → session_dict]
  current_session_id — ContextVar set per-request by middleware in main.py

Every public function is backwards-compatible: callers that used the old
module-level _STORE dict now transparently operate on the correct session.
"""
from __future__ import annotations

import io
import math
import uuid
from contextvars import ContextVar
from typing import Any

import numpy as np
import pandas as pd

# ── Session Registry ──────────────────────────────────────────────
# Maps session_id → {
#   "_STORE": {dataset_id → {df, filename, schema, quality}},
#   "df":     pd.DataFrame | None,   ← active df for tool-calling
#   "memory": list,                  ← Gemini chat history
# }
ACTIVE_SESSIONS: dict[str, dict[str, Any]] = {}

# Automatically tracks which session owns the current request thread
current_session_id: ContextVar[str] = ContextVar("current_session_id", default="default")


def get_current_session() -> dict[str, Any]:
    """Return (and lazily create) the sandbox for the current request."""
    sid = current_session_id.get()
    if sid not in ACTIVE_SESSIONS:
        ACTIVE_SESSIONS[sid] = {
            "_STORE": {},   # dataset_id → dataset entry
            "df":     None, # active dataframe for agentic tools
            "memory": [],   # Gemini conversation history
        }
    return ACTIVE_SESSIONS[sid]


# ── Private helpers ───────────────────────────────────────────────

def _new_id() -> str:
    return "ds_" + uuid.uuid4().hex[:10]


def _quality_score(df: pd.DataFrame) -> dict:
    """Compute a 0-100 quality score with sub-dimensions."""
    n_cells = df.size or 1
    missing_pct = float(df.isna().sum().sum()) / n_cells * 100
    completeness = max(0.0, 100.0 - missing_pct)

    try:
        dup_pct = float(df.duplicated().sum()) / max(len(df), 1) * 100
        consistency = max(0.0, 100.0 - dup_pct * 2)
    except Exception:
        consistency = 100.0

    validity = 100.0
    try:
        numeric = df.select_dtypes(include="number")
        if not numeric.empty:
            inf_count = np.isinf(numeric.values).sum()
            validity = max(0.0, 100.0 - float(inf_count) / n_cells * 100)
    except Exception:
        pass

    try:
        uniqueness = min(100.0, float(df.nunique().mean()) / max(len(df), 1) * 200)
    except Exception:
        uniqueness = 50.0

    timeliness = 100.0
    overall = round(
        completeness * 0.35 + consistency * 0.25
        + validity * 0.20 + uniqueness * 0.10 + timeliness * 0.10
    )
    return {
        "overall":      int(overall),
        "completeness": round(completeness, 1),
        "consistency":  round(consistency,  1),
        "validity":     round(validity,     1),
        "uniqueness":   round(uniqueness,   1),
        "timeliness":   round(timeliness,   1),
        "grade": "Good" if overall >= 80 else "Fair" if overall >= 60 else "Poor",
    }


def _build_schema(df: pd.DataFrame) -> list[dict]:
    n = max(len(df), 1)
    return [
        {
            "name":               col,
            "dtype":              str(df[col].dtype),
            "missing":            int(df[col].isna().sum()),
            "missing_percentage": round(int(df[col].isna().sum()) / n * 100, 1),
            "unique":             int(df[col].nunique(dropna=False)),
        }
        for col in df.columns
    ]


def _session_store() -> dict[str, dict]:
    """Shortcut to the current session's dataset store."""
    return get_current_session()["_STORE"]


# ── Public API — identical signatures to the old module ───────────

def load_file(file_bytes: bytes, filename: str) -> str:
    """Parse bytes, store the DataFrame in the current session, return dataset_id."""
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
    session = get_current_session()
    session["_STORE"][dataset_id] = {
        "df":       df,
        "filename": filename,
        "schema":   _build_schema(df),
        "quality":  _quality_score(df),
    }
    # Also mirror into the session's active "df" so agentic tools work immediately
    session["df"] = df
    return dataset_id


def get_df(dataset_id: str) -> pd.DataFrame:
    return _require(dataset_id)["df"]


def get_schema(dataset_id: str) -> list[dict]:
    return _require(dataset_id)["schema"]


def get_filename(dataset_id: str) -> str:
    return _require(dataset_id)["filename"]


def get_quality(dataset_id: str) -> dict:
    return _require(dataset_id)["quality"]


def exists(dataset_id: str) -> bool:
    return dataset_id in _session_store()


def get_full_upload_response(dataset_id: str) -> dict:
    """Single call that returns everything the dashboard needs on upload."""
    entry = _require(dataset_id)
    df = entry["df"]
    n_cells = max(df.size, 1)

    missing_cells = int(df.isna().sum().sum())
    missing_pct   = round(missing_cells / n_cells * 100, 1)

    preview_rows = []
    for _, row in df.head(10).iterrows():
        safe_row: dict = {}
        for col, val in row.items():
            try:
                safe_row[col] = None if (val is None or (isinstance(val, float) and math.isnan(val))) else val
            except Exception:
                safe_row[col] = str(val)
        preview_rows.append(safe_row)

    numeric_cols     = len(df.select_dtypes(include="number").columns)
    categorical_cols = len(df.select_dtypes(exclude="number").columns)

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
        "eda_profile": {
            "rows":             len(df),
            "missing_pct":      missing_pct,
            "numeric_cols":     numeric_cols,
            "categorical_cols": categorical_cols,
        },
    }


def get_meta(dataset_id: str) -> dict:
    entry = _require(dataset_id)
    df = entry["df"]
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
    # Keep the active tool-calling "df" in sync
    get_current_session()["df"] = df


def _require(dataset_id: str) -> dict:
    store = _session_store()
    if dataset_id not in store:
        raise KeyError(f"Dataset '{dataset_id}' not found in this session.")
    return store[dataset_id]


# ── Legacy compatibility shim ─────────────────────────────────────
# Old code referenced module-level _STORE directly (e.g. `store._STORE`).
# This property-like accessor keeps those callers working.
class _StoreFacade:
    """Proxy that delegates attribute/item access to the current session's _STORE."""
    def keys(self):
        return _session_store().keys()
    def __iter__(self):
        return iter(_session_store())
    def __bool__(self):
        return bool(_session_store())
    def __contains__(self, item):
        return item in _session_store()
    def __getitem__(self, key):
        return _session_store()[key]


_STORE = _StoreFacade()
