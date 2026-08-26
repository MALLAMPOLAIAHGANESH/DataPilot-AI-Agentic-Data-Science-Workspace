import numpy as np
import pandas as pd
from typing import List
from app.data.processing import DATA_STORE

def filter_rows(query_expression: str) -> str:
    """
    Filters dataset rows based on a standard pandas query string.
    Example query expressions: "rating > 8.0", "Age >= 18 and City == 'New York'".
    
    Args:
        query_expression: The boolean condition string to evaluate.
    """
    df = DATA_STORE.get("df")
    if df is None:
        return "Error: No dataset currently loaded."
    
    try:
        initial_count = len(df)
        filtered_df = df.query(query_expression)
        DATA_STORE["df"] = filtered_df
        dropped = initial_count - len(filtered_df)
        return f"Successfully applied filter '{query_expression}'. Retained {len(filtered_df)} rows ({dropped} rows removed)."
    except Exception as e:
        return f"Error executing query expression: {str(e)}"

# ── Helper for dataset resolution ─────────────────────────────────

def execute_describe(session_id: str = "default_session") -> dict:
    """Summarizes dataset structure, data types, and missing values."""
    from app.data.session_store import get_dataset
    df = get_dataset(session_id)
    if df is None:
        df = _resolve_df(session_id)
    if df is None:
        return {"error": "No active dataset loaded in session."}

    summary = {
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "columns": [
            {
                "name": col,
                "dtype": str(df[col].dtype),
                "null_count": int(df[col].isnull().sum()),
                "sample_values": df[col].dropna().head(3).tolist(),
            }
            for col in df.columns
        ],
    }
    return summary


def execute_sql(query: str, session_id: str = "default_session") -> dict:
    """Runs a SQL query against the in-memory pandas DataFrame."""
    from app.data.session_store import get_dataset
    df = get_dataset(session_id)
    if df is None:
        df = _resolve_df(session_id)
    if df is None:
        return {"error": "No active dataset loaded in session."}

    try:
        import duckdb
        # DuckDB queries the in-scope DataFrame named `df`
        result_df = duckdb.query(query).to_df()

        return {
            "query": query,
            "row_count": len(result_df),
            "columns": result_df.columns.tolist(),
            "data": result_df.head(10).to_dict(orient="records"),
        }
    except Exception as e:
        return {"error": f"SQL execution failed: {str(e)}"}


def _resolve_df(dataset_id: str | None = None) -> pd.DataFrame | None:
    if dataset_id:
        try:
            from app.data import session_store as store
            if store.exists(dataset_id):
                return store.get_df(dataset_id)
        except Exception:
            pass
    return DATA_STORE.get("df")


def get_dataset_summary(dataset_id: str | None = None) -> dict:
    """Return high-level metadata: rows, columns, missing values count."""
    df = _resolve_df(dataset_id)
    if df is None:
        return {"error": "No dataset currently loaded."}
    total_rows = len(df)
    total_cols = len(df.columns)
    missing_cells = int(df.isna().sum().sum())
    return {
        "rows": total_rows,
        "columns": total_cols,
        "column_names": list(df.columns),
        "missing_cells": missing_cells,
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
    }


def get_missing_values(dataset_id: str | None = None) -> dict:
    """Return missing value counts and percentages for every column."""
    df = _resolve_df(dataset_id)
    if df is None:
        return {"error": "No dataset currently loaded."}
    n = max(len(df), 1)
    missing = {}
    for col in df.columns:
        cnt = int(df[col].isna().sum())
        missing[col] = {
            "count": cnt,
            "percentage": round(cnt / n * 100, 2),
        }
    return {"missing_values": missing}


def get_column_statistics(dataset_id: str | None = None, column: str = "") -> dict:
    """Return descriptive statistics for a single column."""
    df = _resolve_df(dataset_id)
    if df is None:
        return {"error": "No dataset loaded."}
    if column not in df.columns:
        return {"error": f"Column '{column}' not found."}
    col_series = df[column]
    stats = {
        "column": column,
        "dtype": str(col_series.dtype),
        "total_count": int(len(col_series)),
        "null_count": int(col_series.isna().sum()),
        "unique_count": int(col_series.nunique(dropna=False)),
    }
    if np.issubdtype(col_series.dtype, np.number):
        clean = col_series.dropna()
        if not clean.empty:
            stats.update({
                "mean": round(float(clean.mean()), 4),
                "std": round(float(clean.std()), 4) if len(clean) > 1 else 0.0,
                "min": round(float(clean.min()), 4),
                "25%": round(float(clean.quantile(0.25)), 4),
                "50% (median)": round(float(clean.median()), 4),
                "75%": round(float(clean.quantile(0.75)), 4),
                "max": round(float(clean.max()), 4),
            })
    else:
        top_val = col_series.mode()
        stats["top_mode"] = str(top_val[0]) if not top_val.empty else None
    return stats


def calculate_correlation(dataset_id: str | None = None) -> dict:
    """Return the Pearson correlation matrix for all numeric columns."""
    df = _resolve_df(dataset_id)
    if df is None:
        return {"error": "No dataset loaded."}
    numeric_df = df.select_dtypes(include="number")
    if numeric_df.empty:
        return {"error": "No numeric columns available to compute correlation."}
    corr_matrix = numeric_df.corr().round(4).to_dict()
    return {"correlation_matrix": corr_matrix}


def get_value_counts(dataset_id: str | None = None, column: str = "", top_n: int = 10) -> dict:
    """Return the top-N most frequent values for a column."""
    df = _resolve_df(dataset_id)
    if df is None:
        return {"error": "No dataset loaded."}
    if column not in df.columns:
        return {"error": f"Column '{column}' not found."}
    counts = df[column].value_counts(dropna=False).head(top_n).to_dict()
    return {
        "column": column,
        "top_values": {str(k): int(v) for k, v in counts.items()},
    }


def fill_missing_values(dataset_id: str | None = None, column: str = "", strategy: str = "mean") -> dict:
    """Fill null values in a column using mean, median, mode, or drop."""
    df = _resolve_df(dataset_id)
    if df is None:
        return {"error": "No dataset loaded."}
    if column not in df.columns:
        return {"error": f"Column '{column}' not found."}
    missing_cnt = int(df[column].isna().sum())
    if missing_cnt == 0:
        return {"message": f"Column '{column}' has no missing values."}

    if strategy == "drop":
        df = df.dropna(subset=[column])
    elif strategy == "mean" and np.issubdtype(df[column].dtype, np.number):
        df[column] = df[column].fillna(df[column].mean())
    elif strategy == "median" and np.issubdtype(df[column].dtype, np.number):
        df[column] = df[column].fillna(df[column].median())
    elif strategy == "mode":
        mode_val = df[column].mode()
        if not mode_val.empty:
            df[column] = df[column].fillna(mode_val[0])
    else:
        return {"error": f"Unsupported strategy '{strategy}' for column type {df[column].dtype}."}

    DATA_STORE["df"] = df
    if dataset_id:
        try:
            from app.data import session_store as store
            store.update_df(dataset_id, df)
        except Exception:
            pass
    return {"message": f"Successfully handled {missing_cnt} missing values in '{column}' using '{strategy}' strategy."}


def remove_duplicates(dataset_id: str | None = None) -> dict:
    """Remove duplicate rows from dataset."""
    df = _resolve_df(dataset_id)
    if df is None:
        return {"error": "No dataset loaded."}
    initial_len = len(df)
    df = df.drop_duplicates()
    removed = initial_len - len(df)
    DATA_STORE["df"] = df
    if dataset_id:
        try:
            from app.data import session_store as store
            store.update_df(dataset_id, df)
        except Exception:
            pass
    return {"message": f"Removed {removed} duplicate rows. Remaining rows: {len(df)}."}


def remove_outliers(dataset_id: str | None = None, column: str = "", method: str = "iqr", threshold: float = 1.5) -> str:
    """
    Detects and removes statistical outliers from a numeric column using IQR or Z-score.
    """
    # Support positional invocation remove_outliers(column, method, threshold)
    if isinstance(dataset_id, str) and dataset_id not in ("iqr", "zscore") and not column:
        column = dataset_id
        dataset_id = None

    df = _resolve_df(dataset_id)
    if df is None:
        return "Error: No dataset loaded."
    if column not in df.columns:
        return f"Error: Column '{column}' does not exist."
    if not np.issubdtype(df[column].dtype, np.number):
        return f"Error: Column '{column}' is not numeric."

    initial_count = len(df)
    series = df[column].dropna()

    if method == "iqr":
        q1 = series.quantile(0.25)
        q3 = series.quantile(0.75)
        iqr = q3 - q1
        lower_bound = q1 - (threshold * iqr)
        upper_bound = q3 + (threshold * iqr)
        df = df[(df[column] >= lower_bound) & (df[column] <= upper_bound)]
    elif method == "zscore":
        mean = series.mean()
        std = series.std()
        if std == 0:
            return f"Column '{column}' has zero standard deviation."
        z_scores = (df[column] - mean) / std
        df = df[z_scores.abs() <= threshold]
    else:
        return f"Error: Unsupported method '{method}'. Choose 'iqr' or 'zscore'."

    DATA_STORE["df"] = df
    if dataset_id:
        try:
            from app.data import session_store as store
            store.update_df(dataset_id, df)
        except Exception:
            pass

    removed = initial_count - len(df)
    return f"Removed {removed} outliers from '{column}' using {method.upper()} method."

def drop_columns(columns: List[str]) -> str:
    """
    Permanently deletes one or more columns from the active dataset.
    
    Args:
        columns: List of column names to remove.
    """
    df = DATA_STORE.get("df")
    if df is None:
        return "Error: No dataset loaded."

    existing_cols = [c for c in columns if c in df.columns]
    if not existing_cols:
        return "Error: None of the specified columns were found in the dataset."

    DATA_STORE["df"] = df.drop(columns=existing_cols)
    return f"Successfully dropped columns: {', '.join(existing_cols)}."

def impute_missing(column: str, strategy: str = "median", fill_value: str = "0") -> str:
    """
    Fills missing values in a specified column using a mathematical or constant strategy.
    
    Args:
        column: Column name to impute.
        strategy: 'mean', 'median', 'mode', or 'constant'.
        fill_value: Used only when strategy is 'constant'.
    """
    df = DATA_STORE.get("df")
    if df is None:
        return "Error: No dataset loaded."
    if column not in df.columns:
        return f"Error: Column '{column}' not found."

    missing_before = df[column].isna().sum()
    if missing_before == 0:
        return f"Column '{column}' contains no missing values."

    if strategy == "mean" and np.issubdtype(df[column].dtype, np.number):
        df[column] = df[column].fillna(df[column].mean())
    elif strategy == "median" and np.issubdtype(df[column].dtype, np.number):
        df[column] = df[column].fillna(df[column].median())
    elif strategy == "mode":
        df[column] = df[column].fillna(df[column].mode()[0])
    elif strategy == "constant":
        df[column] = df[column].fillna(fill_value)
    else:
        return f"Error: Strategy '{strategy}' is invalid or incompatible with data type {df[column].dtype}."

    DATA_STORE["df"] = df
    return f"Imputed {missing_before} missing entries in '{column}' using strategy '{strategy}'."


# ── Chart data builders (used by /eda endpoint) ───────────────────

def generate_bar_chart(dataset_id: str, x_col: str, y_col: str, agg: str = "mean", top_n: int = 20) -> dict:
    """Group by x_col, aggregate y_col, return bar chart JSON."""
    from app.data import session_store as store
    df = store.get_df(dataset_id)
    for col in (x_col, y_col):
        if col not in df.columns:
            return {"error": f"Column '{col}' not found."}
    grouped = df.groupby(x_col)[y_col].agg(agg).reset_index().head(top_n)
    grouped.columns = [x_col, y_col]
    return {
        "type":  "bar",
        "data":  grouped.fillna(0).to_dict(orient="records"),
        "x_key": x_col,
        "y_key": y_col,
        "title": f"{agg.capitalize()} of {y_col} by {x_col}",
    }


def generate_line_chart(dataset_id: str, x_col: str, y_col: str) -> dict:
    """Return a line chart JSON from two columns (sorted by x)."""
    from app.data import session_store as store
    df = store.get_df(dataset_id)
    for col in (x_col, y_col):
        if col not in df.columns:
            return {"error": f"Column '{col}' not found."}
    data = df[[x_col, y_col]].dropna().sort_values(x_col)
    return {
        "type":  "line",
        "data":  data.to_dict(orient="records"),
        "x_key": x_col,
        "y_key": y_col,
        "title": f"{y_col} over {x_col}",
    }


def generate_histogram(dataset_id: str, column: str, bins: int = 20) -> dict:
    """Build histogram buckets for a numeric column."""
    from app.data import session_store as store
    df = store.get_df(dataset_id)
    if column not in df.columns:
        return {"error": f"Column '{column}' not found."}
    if not pd.api.types.is_numeric_dtype(df[column]):
        return {"error": f"Column '{column}' is not numeric."}
    series = df[column].dropna()
    series = series[np.isfinite(series)]
    if len(series) == 0:
        return {"error": f"Column '{column}' has no finite values."}
    counts, edges = np.histogram(series, bins=min(bins, len(series)))
    data = [
        {"bin": f"{edges[i]:.2f}\u2013{edges[i+1]:.2f}", "count": int(counts[i])}
        for i in range(len(counts))
    ]
    return {
        "type":  "histogram",
        "data":  data,
        "x_key": "bin",
        "y_key": "count",
        "title": f"Distribution of {column}",
    }


def generate_scatter_chart(dataset_id: str, x_col: str, y_col: str, sample: int = 500) -> dict:
    """Return a scatter chart JSON (sampled to avoid huge payloads)."""
    from app.data import session_store as store
    df = store.get_df(dataset_id)
    for col in (x_col, y_col):
        if col not in df.columns:
            return {"error": f"Column '{col}' not found."}
    subset = df[[x_col, y_col]].dropna()
    if len(subset) == 0:
        return {"error": f"No non-null rows for columns '{x_col}' and '{y_col}'."}
    n = min(sample, len(subset))
    data = subset.sample(n, random_state=42).to_dict(orient="records")
    return {
        "type":  "scatter",
        "data":  data,
        "x_key": x_col,
        "y_key": y_col,
        "title": f"{x_col} vs {y_col}",
    }