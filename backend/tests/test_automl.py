import io
import pandas as pd
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_automl_training():
    # Small CSV payload
    csv_data = "age,sex,survived\n22,male,0\n30,female,1\n"
    # Upload dataset
    upload_resp = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("test.csv", csv_data, "text/csv")},
    )
    assert upload_resp.status_code == 200, f"Upload failed: {upload_resp.text}"
    # AutoML training – target column is "survived"
    automl_resp = client.post(
        "/api/v1/datasets/automl/train",
        json={"target_column": "survived"},
    )
    assert automl_resp.status_code == 200, f"Automl failed: {automl_resp.text}"
    result = automl_resp.json()["results"]
    assert "metrics" in result
    assert result["metrics"]["task_type"] == "Classification"
    assert "accuracy" in result["metrics"]
