import io
import pandas as pd
from fastapi.testclient import TestClient
from main import app
from app.data.session_store import save_dataset
from app.data.automl import run_automl

client = TestClient(app)

def test_run_automl_classification():
    df = pd.DataFrame({
        "age": [22, 38, 26, 35, 54, 2, 27, 14, 4, 58],
        "fare": [7.25, 71.28, 7.92, 53.1, 51.86, 21.07, 11.13, 30.07, 16.7, 26.55],
        "sex": ["male", "female", "female", "female", "male", "male", "male", "female", "female", "female"],
        "survived": [0, 1, 1, 1, 0, 0, 0, 1, 1, 1],
    })
    save_dataset("test_automl_session", df)

    res = run_automl("survived", "test_automl_session")
    assert "error" not in res
    assert res["task_type"] == "Classification"
    assert "leaderboard" in res
    assert len(res["leaderboard"]) >= 2
    assert "feature_importances" in res

def test_automl_training_api():
    csv_data = "age,fare,sex,survived\n22,7.25,male,0\n30,71.28,female,1\n35,53.1,female,1\n54,51.86,male,0\n"
    upload_resp = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("test.csv", csv_data.encode("utf-8"), "text/csv")},
    )
    assert upload_resp.status_code == 200, f"Upload failed: {upload_resp.text}"

    # Test /api/v1/datasets/train endpoint
    train_resp = client.post(
        "/api/v1/datasets/train",
        json={"target_column": "survived", "session_id": "default_session"},
    )
    assert train_resp.status_code == 200, f"Train failed: {train_resp.text}"
    data = train_resp.json()
    assert "task_type" in data
    assert "leaderboard" in data
    assert len(data["leaderboard"]) > 0
