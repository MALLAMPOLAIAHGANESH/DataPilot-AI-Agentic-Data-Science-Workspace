import numpy as np
import pandas as pd
from typing import Dict, Any, List
from app.data.session_store import get_dataset

def generate_smart_eda(session_id: str = "default_session") -> Dict[str, Any]:
    df = get_dataset(session_id)
    if df is None:
        return {"error": "No active dataset loaded."}

    total_rows = len(df)
    if total_rows == 0:
        return {
            "charts": [],
            "correlation_matrix": None,
            "geo_data": None,
            "summary_table": []
        }
    
    # ----------------------------------------------------
    # 1. METADATA & COLUMN TYPE DETECTION
    # ----------------------------------------------------
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = df.select_dtypes(include=['object', 'category', 'string']).columns.tolist()

    # Detect geospatial coordinates
    lat_candidates = [c for c in df.columns if any(k in c.lower() for k in ['latitude', 'lat', 'northing'])]
    lon_candidates = [c for c in df.columns if any(k in c.lower() for k in ['longitude', 'lon', 'lng', 'easting'])]
    
    geo_data = None
    if lat_candidates and lon_candidates:
        lat_col = lat_candidates[0]
        lon_col = lon_candidates[0]
        valid_coords = df[[lat_col, lon_col]].dropna()
        if len(valid_coords) > 0:
            # Cap at 1000 sample points for snappy frontend rendering
            sample_coords = valid_coords.sample(n=min(1000, len(valid_coords)), random_state=42)
            geo_data = {
                "lat_col": lat_col,
                "lon_col": lon_col,
                "points": sample_coords.to_dict(orient="records"),
                "total_points": len(valid_coords)
            }

    # ----------------------------------------------------
    # 2. CORRELATION HEATMAP (Numeric features)
    # ----------------------------------------------------
    correlation_matrix = None
    if len(num_cols) >= 2:
        # Select top 15 numeric columns by variance if too large
        variances = df[num_cols].var().sort_values(ascending=False)
        top_num_cols = variances.head(15).index.tolist()
        corr_df = df[top_num_cols].corr().fillna(0).round(3)
        correlation_matrix = {
            "columns": top_num_cols,
            "matrix": corr_df.values.tolist()
        }

    # ----------------------------------------------------
    # 3. METADATA-DRIVEN DISTRIBUTION CHARTS
    # ----------------------------------------------------
    charts: List[Dict[str, Any]] = []

    # A. Categorical / Discrete Fields -> Donut or Bar
    for col in cat_cols[:12]:
        val_counts = df[col].value_counts(dropna=False).head(10)
        chart_type = "donut" if len(val_counts) <= 6 else "bar"
        charts.append({
            "column": col,
            "chart_type": chart_type,
            "title": f"Frequency Breakdown: {col}",
            "labels": [str(k) if pd.notna(k) else "(missing)" for k in val_counts.index],
            "values": val_counts.values.tolist(),
            "null_count": int(df[col].isnull().sum())
        })

    # B. Continuous Numeric Fields -> Histogram & Box Plot Stats
    for col in num_cols[:12]:
        clean_series = df[col].dropna()
        if len(clean_series) == 0:
            continue
        
        # Compute histogram bins
        counts, bin_edges = np.histogram(clean_series, bins=min(20, max(5, clean_series.nunique())))
        
        # Compute boxplot quantiles
        q1 = float(np.percentile(clean_series, 25))
        median = float(np.percentile(clean_series, 50))
        q3 = float(np.percentile(clean_series, 75))
        iqr = q3 - q1
        
        charts.append({
            "column": col,
            "chart_type": "histogram",
            "title": f"Distribution: {col}",
            "bins": [round(float(b), 2) for b in bin_edges],
            "counts": [int(c) for c in counts],
            "box_stats": {
                "min": float(clean_series.min()),
                "q1": round(q1, 2),
                "median": round(median, 2),
                "q3": round(q3, 2),
                "max": float(clean_series.max()),
                "outliers_count": int(((clean_series < (q1 - 1.5 * iqr)) | (clean_series > (q3 + 1.5 * iqr))).sum())
            }
        })

    # ----------------------------------------------------
    # 4. SUMMARY STATISTICS & MISSING RANKINGS
    # ----------------------------------------------------
    summary_table = []
    for col in df.columns:
        series = df[col]
        missing_cnt = int(series.isnull().sum())
        row = {
            "column": col,
            "dtype": str(series.dtype),
            "missing_count": missing_cnt,
            "missing_pct": round((missing_cnt / total_rows) * 100, 2) if total_rows > 0 else 0,
            "unique_values": int(series.nunique(dropna=False)),
        }
        if pd.api.types.is_numeric_dtype(series):
            clean = series.dropna()
            row.update({
                "mean": round(float(clean.mean()), 2) if len(clean) else None,
                "std": round(float(clean.std()), 2) if len(clean) > 1 else None,
                "min": round(float(clean.min()), 2) if len(clean) else None,
                "max": round(float(clean.max()), 2) if len(clean) else None,
            })
        summary_table.append(row)

    return {
        "charts": charts,
        "correlation_matrix": correlation_matrix,
        "geo_data": geo_data,
        "summary_table": summary_table
    }
