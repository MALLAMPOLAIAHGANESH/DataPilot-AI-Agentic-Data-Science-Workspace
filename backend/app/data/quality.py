"""
data/quality.py — Statistical health engine for DataPilot-AI.
Computes per-column distribution metrics, IQR outlier boundaries,
skewness, kurtosis, and a composite health score.
"""
import numpy as np
import pandas as pd
from app.data.session_store import get_dataset


def generate_data_profile(session_id: str = "default_session") -> Dict[str, Any]:
    """Generates a lightweight automated data profile for EDA and quality assessment."""
    df = get_dataset(session_id)
    if df is None:
        return {"error": "No active dataset loaded."}

    total_rows = len(df)
    total_cols = len(df.columns)
    if total_rows == 0 or total_cols == 0:
        return {
            "overview": {
                "total_rows": 0,
                "total_columns": 0,
                "missing_cells": 0,
                "missing_percentage": 0.0,
                "duplicate_rows": 0,
                "duplicate_percentage": 0.0,
                "health_score": 0.0,
            },
            "columns": {},
        }

    # 1. Dataset-level Quality Metrics
    missing_cells = df.isnull().sum().sum()
    total_cells = total_rows * total_cols
    duplicate_rows = df.duplicated().sum()

    # Calculate a simple 0-100 "Data Health Score"
    missing_penalty = (missing_cells / total_cells) * 100 if total_cells > 0 else 0
    duplicate_penalty = (duplicate_rows / total_rows) * 100 if total_rows > 0 else 0
    health_score = max(0, 100 - (missing_penalty + duplicate_penalty))

    # 2. Column-level Profiling
    columns_profile = {}
    for col in df.columns:
        col_data = df[col]
        col_type = str(col_data.dtype)
        missing_count = int(col_data.isnull().sum())
        missing_pct = round((missing_count / total_rows) * 100, 2) if total_rows > 0 else 0
        unique_count = int(col_data.nunique(dropna=False))

        col_stats = {
            "type": col_type,
            "missing_count": missing_count,
            "missing_percentage": missing_pct,
            "unique_values": unique_count,
        }

        # Numeric specific statistics
        if pd.api.types.is_numeric_dtype(col_data):
            clean_col = col_data.dropna()
            mean_val = float(clean_col.mean()) if not clean_col.empty and pd.notnull(clean_col.mean()) else None
            std_val = float(clean_col.std()) if len(clean_col) > 1 and pd.notnull(clean_col.std()) else None
            min_val = float(clean_col.min()) if not clean_col.empty and pd.notnull(clean_col.min()) else None
            max_val = float(clean_col.max()) if not clean_col.empty and pd.notnull(clean_col.max()) else None
            col_stats.update({
                "mean": round(mean_val, 4) if mean_val is not None else None,
                "std": round(std_val, 4) if std_val is not None else None,
                "min": round(min_val, 4) if min_val is not None else None,
                "max": round(max_val, 4) if max_val is not None else None,
                "zeros": int((clean_col == 0).sum()),
            })

        columns_profile[col] = col_stats

    return {
        "overview": {
            "total_rows": total_rows,
            "total_columns": total_cols,
            "missing_cells": int(missing_cells),
            "missing_percentage": round((missing_cells / total_cells) * 100, 2) if total_cells > 0 else 0,
            "duplicate_rows": int(duplicate_rows),
            "duplicate_percentage": round((duplicate_rows / total_rows) * 100, 2) if total_rows > 0 else 0,
            "health_score": round(health_score, 1),
        },
        "columns": columns_profile,
    }


def calculate_data_quality(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Computes statistical health indicators, distribution metrics,
    and outlier boundaries across all columns.
    """
    total_rows = len(df)
    total_cols = len(df.columns)
    if total_rows == 0:
        return {"health_score": 0, "total_rows": 0, "total_columns": 0, "columns": []}

    columns_report: List[Dict[str, Any]] = []
    total_missing_cells = 0
    total_outlier_cells = 0
    highly_skewed_count = 0

    for col in df.columns:
        series = df[col]
        missing_count = int(series.isna().sum())
        total_missing_cells += missing_count
        missing_pct = round((missing_count / total_rows) * 100, 2)
        unique_count = int(series.nunique())
        is_num = bool(np.issubdtype(series.dtype, np.number))

        col_data: Dict[str, Any] = {
            "column": col,
            "dtype": str(series.dtype),
            "missing_count": missing_count,
            "missing_pct": missing_pct,
            "unique_count": unique_count,
            "is_numeric": is_num,
        }

        if is_num:
            clean_series = series.dropna()
            if len(clean_series) > 0:
                q1 = float(clean_series.quantile(0.25))
                q3 = float(clean_series.quantile(0.75))
                iqr = q3 - q1
                lower_bound = q1 - 1.5 * iqr
                upper_bound = q3 + 1.5 * iqr
                iqr_outliers = int(
                    ((clean_series < lower_bound) | (clean_series > upper_bound)).sum()
                )
                total_outlier_cells += iqr_outliers

                std = float(clean_series.std()) if len(clean_series) > 1 else 0.0
                mean = float(clean_series.mean())
                skew = float(clean_series.skew()) if len(clean_series) > 2 else 0.0
                kurt = float(clean_series.kurtosis()) if len(clean_series) > 3 else 0.0

                if abs(skew) > 1.0:
                    highly_skewed_count += 1

                col_data.update(
                    {
                        "mean": round(mean, 2),
                        "std": round(std, 2) if not np.isnan(std) else 0.0,
                        "min": round(float(clean_series.min()), 2),
                        "q1": round(q1, 2),
                        "median": round(float(clean_series.median()), 2),
                        "q3": round(q3, 2),
                        "max": round(float(clean_series.max()), 2),
                        "skewness": round(skew, 2) if not np.isnan(skew) else 0.0,
                        "kurtosis": round(kurt, 2) if not np.isnan(kurt) else 0.0,
                        "iqr_outliers": iqr_outliers,
                        "outlier_pct": round(
                            (iqr_outliers / len(clean_series)) * 100, 2
                        ),
                        "lower_bound": round(lower_bound, 2),
                        "upper_bound": round(upper_bound, 2),
                        "zero_count": int((clean_series == 0).sum()),
                    }
                )
            else:
                col_data.update(
                    {
                        "mean": 0,
                        "std": 0,
                        "min": 0,
                        "q1": 0,
                        "median": 0,
                        "q3": 0,
                        "max": 0,
                        "skewness": 0,
                        "kurtosis": 0,
                        "iqr_outliers": 0,
                        "outlier_pct": 0,
                        "lower_bound": 0,
                        "upper_bound": 0,
                        "zero_count": 0,
                    }
                )
        else:
            mode_val = series.mode()
            top_value = str(mode_val[0]) if len(mode_val) > 0 else "N/A"
            top_freq = int((series == top_value).sum()) if len(mode_val) > 0 else 0
            col_data.update(
                {
                    "top_value": top_value,
                    "top_freq": top_freq,
                    "top_pct": round((top_freq / total_rows) * 100, 2),
                }
            )

        columns_report.append(col_data)

    # Health Score Calculation
    # 100 base, penalised for missing values and outlier density
    total_cells = total_rows * total_cols
    missing_penalty = (total_missing_cells / total_cells) * 50 if total_cells > 0 else 0
    outlier_penalty = (total_outlier_cells / total_cells) * 40 if total_cells > 0 else 0
    health_score = max(0, min(100, round(100 - (missing_penalty + outlier_penalty))))

    return {
        "health_score": health_score,
        "total_rows": total_rows,
        "total_columns": total_cols,
        "total_missing_cells": total_missing_cells,
        "total_outlier_cells": total_outlier_cells,
        "highly_skewed_columns": highly_skewed_count,
        "columns": columns_report,
    }
