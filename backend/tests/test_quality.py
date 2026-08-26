import pytest
import pandas as pd
from fastapi.testclient import TestClient
from main import app
from app.data.session_store import save_dataset
from app.data.quality import generate_data_profile

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_quality_dataset():
    df = pd.DataFrame({
        "age": [25, 30, 35, None, 40],
        "salary": [50000, 60000, 75000, 80000, 0],
        "department": ["IT", "HR", "IT", "Sales", "HR"],
    })
    save_dataset(session_id="profile_test_session", df=df)

def test_generate_data_profile_structure():
    profile = generate_data_profile("profile_test_session")
    assert "overview" in profile
    assert "columns" in profile
    overview = profile["overview"]
    assert overview["total_rows"] == 5
    assert overview["total_columns"] == 3
    assert overview["missing_cells"] == 1
    assert "health_score" in overview
    assert 0 <= overview["health_score"] <= 100

    cols = profile["columns"]
    assert "age" in cols
    assert "salary" in cols
    assert "department" in cols
    assert cols["age"]["missing_count"] == 1
    assert cols["salary"]["mean"] is not None
    assert cols["salary"]["zeros"] == 1

def test_get_dataset_profile_api():
    response = client.get("/api/v1/profile?session_id=profile_test_session")
    assert response.status_code == 200
    data = response.json()
    assert "overview" in data
    assert "columns" in data
    assert data["overview"]["total_rows"] == 5
