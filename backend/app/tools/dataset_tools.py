"""
tools/dataset_tools.py
Deterministic, exec()-free functions that Gemini calls via tool-calling.
Each function receives a dataset_id and operates on the stored DataFrame.
"""
from __future__ import annotations

import pandas as pd
import numpy as np
from ..data import session_store as store


# ── Summary ───────────────────────────────────────────────────────

def get_dataset_summary(dataset_id: str) -> dict:
    """Return high-level metadata: rows, columns, missing values, dtypes."""
    return store.get_meta(dataset_id)


def get_column_statistics(dataset_id: str, column: str) -> dict:
    """Return descriptive statistics for a single column."""
    df  = store.get_df(dataset_id)
    if column not in df.columns:
        return {"error": f"Column '{column}' not found."}

    series = df[column]
    result: dict = {
        "column":   column,
        "dtype":    str(series.dtype),
        "count":    int(series.count()),
        "missing":  int(series.isna().sum()),
    }

    if pd.api.types.is_numeric_dtype(series):
        desc = series.describe()
        result.update({
            "mean":   round(float(desc["mean"]), 4),
            "std":    round(float(desc["std"]),  4),
            "min":    float(desc["min"]),
            "25%":    float(desc["25%"]),
            "median": float(desc["50%"]),
            "75%":    float(desc["75%"]),
            "max":    float(desc["max"]),
        })
    else:
        top = series.value_counts()
        result.update({
            "unique":    int(series.nunique()),
            "top_value": str(top.index[0]) if len(top) else None,
            "top_count": int(top.iloc[0])  if len(top) else 0,
        })
    return result


def get_missing_values(dataset_id: str) -> dict:
    """Return missing value counts and percentages per column."""
    df = store.get_df(dataset_id)
    total = len(df)
    result = {}
    for col in df.columns:
        n = int(df[col].isna().sum())
        result[col] = {"count": n, "pct": round(n / total * 100, 2)}
    return result


def calculate_correlation(dataset_id: str) -> dict:
    """Return Pearson correlation matrix for all numeric columns."""
    df      = store.get_df(dataset_id)
    numeric = df.select_dtypes(include="number")
    if numeric.empty:
        return {"error": "No numeric columns found."}
    corr = numeric.corr().round(4)
    return corr.to_dict()


def get_value_counts(dataset_id: str, column: str, top_n: int = 10) -> dict:
    """Return top-N value counts for a categorical column."""
    df = store.get_df(dataset_id)
    if column not in df.columns:
        return {"error": f"Column '{column}' not found."}
    counts = df[column].value_counts().head(top_n)
    return {str(k): int(v) for k, v in counts.items()}


# ── Cleaning ──────────────────────────────────────────────────────

def fill_missing_values(dataset_id: str, column: str, strategy: str = "mean") -> dict:
    """
    Fill nulls in a column.
    strategy: 'mean' | 'median' | 'mode' | 'drop'
    """
    df = store.get_df(dataset_id).copy()
    if column not in df.columns:
        return {"error": f"Column '{column}' not found."}

    before = int(df[column].isna().sum())

    if strategy == "drop":
        df = df.dropna(subset=[column])
    elif strategy == "mean" and pd.api.types.is_numeric_dtype(df[column]):
        df[column] = df[column].fillna(df[column].mean())
    elif strategy == "median" and pd.api.types.is_numeric_dtype(df[column]):
        df[column] = df[column].fillna(df[column].median())
    elif strategy == "mode":
        df[column] = df[column].fillna(df[column].mode()[0])
    else:
        return {"error": f"Strategy '{strategy}' not applicable to column '{column}'."}

    store.update_df(dataset_id, df)
    return {"column": column, "strategy": strategy, "nulls_before": before, "nulls_after": int(df[column].isna().sum())}


def remove_duplicates(dataset_id: str) -> dict:
    """Drop exact duplicate rows."""
    df     = store.get_df(dataset_id)
    before = len(df)
    df     = df.drop_duplicates()
    store.update_df(dataset_id, df)
    return {"rows_before": before, "rows_after": len(df), "removed": before - len(df)}


def remove_outliers(dataset_id: str, column: str, method: str = "iqr") -> dict:
    """
    Remove rows where `column` value is an outlier.
    method: 'iqr' | 'zscore'
    """
    df = store.get_df(dataset_id).copy()
    if column not in df.columns:
        return {"error": f"Column '{column}' not found."}
    if not pd.api.types.is_numeric_dtype(df[column]):
        return {"error": f"Column '{column}' is not numeric."}

    before = len(df)
    if method == "iqr":
        Q1, Q3 = df[column].quantile(0.25), df[column].quantile(0.75)
        iqr    = Q3 - Q1
        df     = df[(df[column] >= Q1 - 1.5 * iqr) & (df[column] <= Q3 + 1.5 * iqr)]
    elif method == "zscore":
        z = np.abs((df[column] - df[column].mean()) / df[column].std())
        df = df[z < 3]
    else:
        return {"error": f"Unknown method '{method}'."}

    store.update_df(dataset_id, df)
    return {"column": column, "method": method, "rows_before": before, "rows_after": len(df), "removed": before - len(df)}


# ── Chart data builders ───────────────────────────────────────────

def generate_bar_chart(dataset_id: str, x_col: str, y_col: str, agg: str = "mean", top_n: int = 20) -> dict:
    """Group by x_col, aggregate y_col, return bar chart JSON."""
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
    df = store.get_df(dataset_id)
    if column not in df.columns:
        return {"error": f"Column '{column}' not found."}
    if not pd.api.types.is_numeric_dtype(df[column]):
        return {"error": f"Column '{column}' is not numeric."}

    # Drop nulls AND infinite values before histogramming
    series = df[column].dropna()
    series = series[np.isfinite(series)]
    if len(series) == 0:
        return {"error": f"Column '{column}' has no finite values."}

    counts, edges = np.histogram(series, bins=min(bins, len(series)))
    data = [
        {"bin": f"{edges[i]:.2f}–{edges[i+1]:.2f}", "count": int(counts[i])}
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
