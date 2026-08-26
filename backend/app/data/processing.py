"""
data/processing.py — DataFrame utilities (session-aware)
=========================================================
All read/writes now go through get_current_session() so every
student's DataFrame is isolated from every other student's.

DATA_STORE is kept as a backwards-compatible property so that
dataset_tools.py (which imports it as a dict) still works.
"""
from __future__ import annotations

import io
from typing import Any, Dict, Tuple

import pandas as pd

from app.data.session_store import get_current_session


# ── Backwards-compatible DATA_STORE shim ─────────────────────────
# dataset_tools.py does:  from app.data.processing import DATA_STORE
# and then:               DATA_STORE.get("df") / DATA_STORE["df"] = ...
# This proxy delegates every operation to the current session.

class _DataStoreFacade:
    """Makes DATA_STORE["df"] transparently read/write the per-session sandbox."""

    def get(self, key: str, default: Any = None) -> Any:
        return get_current_session().get(key, default)

    def __getitem__(self, key: str) -> Any:
        return get_current_session()[key]

    def __setitem__(self, key: str, value: Any) -> None:
        get_current_session()[key] = value

    def __contains__(self, key: str) -> bool:
        return key in get_current_session()


DATA_STORE = _DataStoreFacade()


# ── Core helpers ──────────────────────────────────────────────────

def get_active_dataframe() -> pd.DataFrame | None:
    """Return the current session's active DataFrame."""
    return get_current_session().get("df")


def load_dataframe(file_contents: bytes) -> None:
    """Read raw CSV bytes and store in the current session."""
    df = pd.read_csv(io.BytesIO(file_contents))
    get_current_session()["df"] = df


# ── UI Extraction ─────────────────────────────────────────────────

def get_schema_and_preview() -> Tuple[list, list, int]:
    """Return (schema, preview_rows, row_count) for the active DataFrame."""
    df = get_current_session().get("df")
    if df is None:
        raise ValueError("No dataframe loaded in this session.")

    schema  = [{"column": col, "type": str(dtype)} for col, dtype in df.dtypes.items()]
    preview = df.head(5).fillna("").to_dict(orient="records")
    return schema, preview, len(df)


# ── LLM Context ───────────────────────────────────────────────────

def get_metadata_for_llm() -> str:
    """Return a text summary of the active DataFrame for Gemini's system prompt."""
    df = get_current_session().get("df")
    if df is None:
        return "No data loaded."

    buf = io.StringIO()
    df.info(buf=buf)
    return (
        f"DataFrame Info:\n{buf.getvalue()}\n\n"
        f"Missing Values:\n{df.isnull().sum().to_dict()}"
    )


# ── Code Execution Engine ─────────────────────────────────────────

def execute_pandas_code(code_string: str) -> Dict[str, Any]:
    """
    Execute AI-generated Pandas code in an isolated namespace.
    Persists any mutations back into the current session's DataFrame.
    """
    session = get_current_session()
    df = session.get("df")
    local_env = {"df": df, "pd": pd, "chart_data": None}
    exec(code_string, local_env)  # nosec — internal only
    session["df"] = local_env["df"]
    return local_env.get("chart_data")


# ── EDA Profile ───────────────────────────────────────────────────

def generate_eda_profile() -> dict:
    """Calculate automated dataset statistics for the UI."""
    df = get_current_session().get("df")
    if df is None:
        return {}

    total_rows  = len(df)
    total_cols  = len(df.columns)
    missing_cells = int(df.isna().sum().sum())
    total_cells   = total_rows * total_cols
    missing_pct   = round((missing_cells / total_cells) * 100, 1) if total_cells > 0 else 0

    return {
        "rows":             total_rows,
        "columns":          total_cols,
        "missing_pct":      missing_pct,
        "numeric_cols":     len(df.select_dtypes(include=["number"]).columns),
        "categorical_cols": len(df.select_dtypes(include=["object", "category"]).columns),
    }


# ── Cleaning Helpers ──────────────────────────────────────────────

def handle_missing_values(strategy: str = "drop") -> str:
    """Drop or fill missing values across the entire active DataFrame."""
    session = get_current_session()
    df = session.get("df")
    if df is None:
        return "Error: No dataset loaded."

    if strategy == "drop":
        session["df"] = df.dropna()
        return "Successfully dropped all rows containing missing values."
    elif strategy == "fill":
        session["df"] = df.fillna(0)
        return "Successfully filled all missing values with zeros."
    else:
        return f"Error: Unknown strategy '{strategy}'."