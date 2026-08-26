"""
api/routes.py — AutoML and secondary endpoints router.
"""
from fastapi import APIRouter, HTTPException
from ..data.automl import run_automl_pipeline
from ..data.session_store import get_current_session

router = APIRouter()


@router.post("/automl/train")
async def train_automl(body: dict):
    """Run automated ML training pipeline on the current session dataset."""
    target_column = body.get("target_column")
    if not target_column:
        raise HTTPException(status_code=400, detail="target_column is required.")

    df = None
    dataset_id = body.get("dataset_id")
    if dataset_id:
        from ..data.session_store import get_dataset
        df = get_dataset(dataset_id)

    if df is None:
        session = get_current_session()
        df = session.get("df")
        if df is None:
            store = session.get("_STORE", {})
            if store:
                latest_id = next(reversed(store))
                df = store[latest_id]["df"]

    if df is None:
        raise HTTPException(status_code=400, detail="No active dataset loaded in this session.")

    try:
        results = run_automl_pipeline(df, target_column)
        return {"status": "success", "results": results, **results}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))