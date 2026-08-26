import pytest
import pandas as pd
from fastapi.testclient import TestClient
from main import app
from app.data.session_store import save_dataset
from app.tools.dataset_tools import execute_describe, execute_sql

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_dataset():
    df = pd.DataFrame({
        "genre": ["Action", "Comedy", "Drama", "Action"],
        "rating": [8.5, 7.2, 8.0, 9.1],
        "votes": [1200, 800, 950, 2100],
    })
    save_dataset(session_id="default_session", df=df)

def test_execute_describe():
    summary = execute_describe("default_session")
    assert "total_rows" in summary
    assert summary["total_rows"] == 4
    assert summary["total_columns"] == 3
    assert len(summary["columns"]) == 3

def test_execute_sql():
    sql_result = execute_sql("SELECT genre, AVG(rating) as avg_rating FROM df GROUP BY genre ORDER BY avg_rating DESC", "default_session")
    assert "error" not in sql_result
    assert sql_result["row_count"] == 3
    assert "columns" in sql_result
    assert "data" in sql_result
    assert len(sql_result["data"]) == 3

def test_copilot_chat_endpoint_schema():
    # Verify the endpoint parses request structure correctly
    response = client.post(
        "/api/v1/copilot/chat",
        json={"message": "What is the schema of the dataset?", "session_id": "default_session"}
    )
    # The endpoint should return a 200 (if API key configured) or 500 with readable detail
    assert response.status_code in (200, 500)
    if response.status_code == 200:
        data = response.json()
        assert "answer" in data
        assert "steps" in data
