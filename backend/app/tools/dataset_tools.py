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

def remove_outliers(column: str, method: str = "iqr", threshold: float = 1.5) -> str:
    """
    Detects and removes statistical outliers from a numeric column using IQR or Z-score.
    
    Args:
        column: Name of the numeric column to clean.
        method: Outlier detection algorithm - either 'iqr' (Interquartile Range) or 'zscore'.
        threshold: Sensitivity multiplier (default 1.5 for IQR, 3.0 for zscore).
    """
    df = DATA_STORE.get("df")
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
        DATA_STORE["df"] = df[(df[column] >= lower_bound) & (df[column] <= upper_bound)]
    elif method == "zscore":
        mean = series.mean()
        std = series.std()
        if std == 0:
            return f"Column '{column}' has zero standard deviation."
        z_scores = (df[column] - mean) / std
        DATA_STORE["df"] = df[z_scores.abs() <= threshold]
    else:
        return f"Error: Unsupported method '{method}'. Choose 'iqr' or 'zscore'."

    removed = initial_count - len(DATA_STORE["df"])
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