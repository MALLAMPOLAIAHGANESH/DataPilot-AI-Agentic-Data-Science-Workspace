"""
data/automl.py — Automated ML pipeline for DataPilot-AI.

Automatically detects classification vs. regression, applies ColumnTransformer
preprocessing (scaling + one-hot encoding), trains 3 baseline models
(Linear, Random Forest, Gradient Boosting), ranks them in a Leaderboard,
and extracts Random Forest feature importances for explainability.
"""
from __future__ import annotations

from typing import Any, Dict, List
import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import (
    GradientBoostingClassifier,
    GradientBoostingRegressor,
    RandomForestClassifier,
    RandomForestRegressor,
)
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.metrics import accuracy_score, f1_score, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from app.data.session_store import get_dataset


def run_automl(target_col: str, session_id: str = "default_session") -> dict:
    """Trains 3 baseline models, builds a leaderboard, and returns feature importances."""
    df = get_dataset(session_id)
    if df is None:
        return {"error": "No active dataset loaded."}
    if target_col not in df.columns:
        return {"error": f"Target column '{target_col}' not found in dataset."}

    # Clean missing targets
    clean_df = df.dropna(subset=[target_col]).copy()
    if len(clean_df) < 2:
        return {"error": f"Only {len(clean_df)} valid row(s) remain for target '{target_col}'. Need at least 2 rows to train."}

    X = clean_df.drop(columns=[target_col])
    y = clean_df[target_col]

    if X.shape[1] == 0:
        return {"error": "No feature columns remain to train models."}

    # Auto-detect task type
    is_classification = y.dtype == "object" or y.dtype.name == "category" or y.nunique() <= 15

    # Build transformation steps
    num_feats = X.select_dtypes(include=["int64", "float64", "int32", "float32", "number"]).columns.tolist()
    cat_feats = X.select_dtypes(include=["object", "category", "bool"]).columns.tolist()

    transformers = []
    if num_feats:
        num_pipe = Pipeline([
            ("imputer", SimpleImputer(strategy="mean")),
            ("scaler", StandardScaler()),
        ])
        transformers.append(("num", num_pipe, num_feats))

    if cat_feats:
        cat_pipe = Pipeline([
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ])
        transformers.append(("cat", cat_pipe, cat_feats))

    preprocessor = ColumnTransformer(transformers=transformers, remainder="drop")

    # Train / Test split
    if len(clean_df) < 4:
        X_train, X_test = X, X
        y_train, y_test = y, y
    else:
        test_size = 0.2 if len(clean_df) >= 50 else (0.25 if len(clean_df) >= 8 else 1)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42
        )

    # Initialize baseline models
    models = {
        "Linear Baseline": LogisticRegression(max_iter=1000) if is_classification else Ridge(),
        "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42) if is_classification else RandomForestRegressor(n_estimators=100, random_state=42),
        "Gradient Boosting": GradientBoostingClassifier(random_state=42) if is_classification else GradientBoostingRegressor(random_state=42),
    }

    leaderboard: List[Dict[str, Any]] = []
    feature_importances: List[Dict[str, Any]] = []

    for name, model in models.items():
        try:
            pipeline = Pipeline(steps=[("preprocessor", preprocessor), ("model", model)])
            pipeline.fit(X_train, y_train)
            preds = pipeline.predict(X_test)

            if is_classification:
                acc = round(float(accuracy_score(y_test, preds)), 4)
                f1 = round(float(f1_score(y_test, preds, average="weighted", zero_division=0)), 4)
                leaderboard.append({
                    "model": name,
                    "metric_1": "Accuracy",
                    "val_1": acc,
                    "metric_2": "F1 Score",
                    "val_2": f1,
                })
            else:
                mse = float(mean_squared_error(y_test, preds))
                rmse = round(float(np.sqrt(mse)), 4)
                r2 = round(float(r2_score(y_test, preds)), 4) if len(y_test) > 1 else 1.0
                leaderboard.append({
                    "model": name,
                    "metric_1": "RMSE",
                    "val_1": rmse,
                    "metric_2": "R2 Score",
                    "val_2": r2,
                })

            # Extract feature importances from Random Forest
            if name == "Random Forest":
                try:
                    all_feature_names: List[str] = []
                    fitted_prep = pipeline.named_steps["preprocessor"]
                    for trans_name, trans_pipe, trans_cols in fitted_prep.transformers_:
                        if trans_name == "num":
                            all_feature_names.extend(trans_cols)
                        elif trans_name == "cat":
                            cat_encoder = trans_pipe.named_steps["onehot"]
                            all_feature_names.extend(list(cat_encoder.get_feature_names_out(trans_cols)))

                    rf_importances = pipeline.named_steps["model"].feature_importances_
                    sorted_feats = sorted(
                        zip(all_feature_names, rf_importances),
                        key=lambda x: x[1],
                        reverse=True,
                    )[:10]

                    feature_importances = [
                        {"feature": f, "importance": round(float(imp), 4)}
                        for f, imp in sorted_feats
                    ]
                except Exception:
                    pass

        except Exception as e:
            # If a model fails to converge, record note
            leaderboard.append({
                "model": name,
                "metric_1": "Status",
                "val_1": "Failed",
                "metric_2": "Error",
                "val_2": str(e)[:60],
            })

    # Sort leaderboard: Highest Accuracy first or Lowest RMSE first
    if is_classification:
        leaderboard.sort(
            key=lambda x: (x["val_1"] if isinstance(x["val_1"], (int, float)) else -1),
            reverse=True,
        )
    else:
        leaderboard.sort(
            key=lambda x: (x["val_1"] if isinstance(x["val_1"], (int, float)) else 999999),
            reverse=False,
        )

    best_model = leaderboard[0]["model"] if leaderboard else "Random Forest"
    best_val1 = leaderboard[0]["val_1"] if leaderboard else 0
    best_val2 = leaderboard[0]["val_2"] if leaderboard else 0

    return {
        "task_type": "Classification" if is_classification else "Regression",
        "leaderboard": leaderboard,
        "feature_importances": feature_importances,
        "target_column": target_col,
        "model_name": best_model,
        "metrics": {
            "task_type": "Classification" if is_classification else "Regression",
            "accuracy": best_val1 if is_classification else None,
            "f1_score": best_val2 if is_classification else None,
            "rmse": best_val1 if not is_classification else None,
            "r2_score": best_val2 if not is_classification else None,
        },
    }


def run_automl_pipeline(df: pd.DataFrame, target_column: str) -> Dict[str, Any]:
    """Backwards compatibility shim for existing direct DataFrame callers."""
    from app.data.session_store import save_dataset
    import uuid
    tmp_sid = f"tmp_auto_{uuid.uuid4().hex[:8]}"
    save_dataset(tmp_sid, df)
    return run_automl(target_column, tmp_sid)
