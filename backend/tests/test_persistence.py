import os
import shutil
import pytest
import pandas as pd
from fastapi.testclient import TestClient
from main import app
from app.data import session_store

client = TestClient(app)

def test_parquet_disk_persistence(tmp_path, monkeypatch):
    test_session_dir = str(tmp_path / "test_sessions")
    monkeypatch.setattr(session_store, "SESSION_DIR", test_session_dir)
    os.makedirs(test_session_dir, exist_ok=True)

    test_df = pd.DataFrame({
        "customer_id": [101, 102, 103],
        "churn": [0, 1, 0],
        "revenue": [250.50, 480.00, 120.75],
    })

    # Save to session
    session_id = "persistence_test_session"
    session_store.save_dataset(session_id, test_df)

    # Verify parquet file was written to disk
    expected_file = os.path.join(test_session_dir, f"{session_id}.parquet")
    assert os.path.exists(expected_file)

    # Clear in-memory cache to simulate server restart
    session_store._ACTIVE_DATASETS.pop(session_id, None)
    session_store.ACTIVE_SESSIONS.pop(session_id, None)

    # Fetch dataset — should read from disk parquet
    loaded_df = session_store.get_dataset(session_id)
    assert loaded_df is not None
    assert len(loaded_df) == 3
    assert list(loaded_df.columns) == ["customer_id", "churn", "revenue"]

    # Clear session and check disk cleanup
    session_store.clear_session(session_id)
    assert not os.path.exists(expected_file)

def test_health_check_endpoint():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "environment" in data
    assert "version" in data
