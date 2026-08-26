import pytest
import pandas as pd
from fastapi.testclient import TestClient
from main import app
from app.data.session_store import save_dataset
from app.sql.engine import execute_workspace_query

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_sql_dataset():
    df = pd.DataFrame({
        "id": [1, 2, 3, 4, 5],
        "name": ["Alice", "Bob", "Charlie", "David", "Eva"],
        "department": ["Engineering", "Product", "Engineering", "Design", "Product"],
        "salary": [120000, 110000, 140000, 95000, 105000],
    })
    save_dataset("sql_test_session", df)

def test_execute_workspace_query_duckdb():
    res = execute_workspace_query(
        "SELECT department, COUNT(*) as cnt, AVG(salary) as avg_sal FROM df GROUP BY department ORDER BY avg_sal DESC",
        source="local",
        session_id="sql_test_session",
    )
    assert res["status"] == "success"
    assert "department" in res["columns"]
    assert "cnt" in res["columns"]
    assert res["row_count"] == 3
    assert len(res["data"]) == 3

def test_sql_query_api_endpoint():
    response = client.post(
        "/api/v1/query",
        json={
            "query": "SELECT * FROM df WHERE salary > 100000",
            "source": "local",
            "session_id": "sql_test_session",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["row_count"] == 4
    assert len(data["data"]) == 4
