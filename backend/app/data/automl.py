"""
data/automl.py — Automated ML pipeline for DataPilot-AI.

Identifies the problem type, preprocesses features, trains a
RandomForest baseline, and returns metrics + feature importances
in a shape that matches the frontend MLMetrics type.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from typing import Any, Dict, List

from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_squared_error,
    r2_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder


def run_automl_pipeline(df: pd.DataFrame, target_column: str) -> Dict[str, Any]:
    """
    Automated pipeline:
      1. Validates the target column exists.
      2. Determines task type (Classification vs Regression).
      3. Encodes categoricals & imputes missing values safely.
      4. Trains a RandomForest baseline (80/20 split).
      5. Returns metrics, feature importances, and model metadata.
    """
    if target_column not in df.columns:
        raise ValueError(f"Target column '{target_column}' not found in dataset.")

    # ── 1. Drop rows with missing target ──────────────────────────
    clean_df = df.dropna(subset=[target_column]).copy()
    if len(clean_df) < 10:
        raise ValueError(
            f"Only {len(clean_df)} rows remain after dropping rows where "
            f"'{target_column}' is missing. Need at least 10 to train."
        )

    y_raw = clean_df[target_column]
    X = clean_df.drop(columns=[target_column])

    # ── 2. Drop ID-like / high-cardinality string columns ─────────
    cols_to_drop = [
        col for col in X.columns
        if X[col].dtype == object and X[col].nunique() > min(100, len(X) * 0.5)
    ]
    X = X.drop(columns=cols_to_drop)

    # ── 3. Determine problem type ─────────────────────────────────
    is_classification = (
        y_raw.dtype == object
        or y_raw.dtype.name == "category"
        or y_raw.nunique() <= 10
    )

    label_encoder: LabelEncoder | None = None
    if is_classification and (y_raw.dtype == object or y_raw.dtype.name == "category"):
        label_encoder = LabelEncoder()
        y = label_encoder.fit_transform(y_raw.astype(str))
    else:
        y = y_raw.values

    # ── 4. Preprocess feature matrix ──────────────────────────────
    categorical_cols = X.select_dtypes(include=["object", "category"]).columns.tolist()
    numeric_cols = X.select_dtypes(include="number").columns.tolist()

    # Safe numeric imputation — median, falling back to 0 when all-NaN
    for col in numeric_cols:
        med = X[col].median()
        fill = 0.0 if pd.isna(med) else float(med)
        X[col] = X[col].fillna(fill)

    # Categorical imputation + label encoding
    for col in categorical_cols:
        X[col] = X[col].fillna("__missing__")
        le = LabelEncoder()
        X[col] = le.fit_transform(X[col].astype(str))

    # Final guard
    if X.shape[1] == 0:
        raise ValueError("No valid feature columns remain after preprocessing.")

    # ── 5. Train / Test split ─────────────────────────────────────
    X_arr = X.values.astype(float)
    test_size = 0.2 if len(X_arr) >= 50 else 0.3
    X_train, X_test, y_train, y_test = train_test_split(
        X_arr, y, test_size=test_size, random_state=42
    )

    # ── 6. Train model & compute metrics ─────────────────────────
    metrics: Dict[str, Any] = {}
    feature_importances: List[Dict[str, Any]] = []

    if is_classification:
        model = RandomForestClassifier(
            n_estimators=100, max_depth=10, random_state=42, n_jobs=-1
        )
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        y_proba = model.predict_proba(X_test)

        acc = round(float(accuracy_score(y_test, y_pred)), 4)
        f1 = round(
            float(f1_score(y_test, y_pred, average="weighted", zero_division=0)), 4
        )

        # ROC-AUC: binary → use proba[:, 1]; multi-class → macro OVR
        try:
            n_classes = len(np.unique(y_train))
            if n_classes == 2:
                roc = round(float(roc_auc_score(y_test, y_proba[:, 1])), 4)
            else:
                roc = round(
                    float(roc_auc_score(y_test, y_proba, multi_class="ovr", average="macro")), 4
                )
        except Exception:
            roc = None

        metrics = {
            "task_type": "Classification",
            "accuracy": acc,
            "f1_score": f1,
            "roc_auc": roc,
            "test_samples": int(len(y_test)),
        }
        model_name = "Random Forest Classifier"

    else:
        model = RandomForestRegressor(
            n_estimators=100, max_depth=10, random_state=42, n_jobs=-1
        )
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        mse = mean_squared_error(y_test, y_pred)
        metrics = {
            "task_type": "Regression",
            "r2_score": round(float(r2_score(y_test, y_pred)), 4),
            "rmse": round(float(np.sqrt(mse)), 4),
            "test_samples": int(len(y_test)),
        }
        model_name = "Random Forest Regressor"

    # ── 7. Feature importances (top 10) ───────────────────────────
    importances = model.feature_importances_
    sorted_idx = np.argsort(importances)[::-1][:10]
    for idx in sorted_idx:
        feature_importances.append(
            {
                "feature": str(X.columns[idx]),
                "importance": round(float(importances[idx]), 4),
            }
        )

    return {
        "model_name": model_name,
        "target_column": target_column,
        "features_used": list(X.columns),
        "metrics": metrics,
        "feature_importances": feature_importances,
    }
