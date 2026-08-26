import pytest
import pandas as pd
from fastapi.testclient import TestClient
from main import app
from app.data.session_store import save_dataset
from app.data.eda_engine import generate_smart_eda

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_eda_dataset():
    df = pd.DataFrame({
        "age": [25, 30, 35, 40, 50, 60],
        "salary": [50000, 60000, 75000, 80000, 110000, 130000],
        "department": ["IT", "HR", "IT", "Sales", "HR", "Sales"],
        "latitude": [37.7749, 37.7750, 37.7751, 37.7752, 37.7753, 37.7754],
        "longitude": [-122.4194, -122.4195, -122.4196, -122.4197, -122.4198, -122.4199],
    })
    save_dataset("eda_test_session", df)

def test_generate_smart_eda():
    eda_data = generate_smart_eda("eda_test_session")
    assert "charts" in eda_data
    assert "correlation_matrix" in eda_data
    assert "geo_data" in eda_data
    assert "summary_table" in eda_data

    # Check charts
    assert len(eda_data["charts"]) > 0
    # Check correlation matrix
    assert eda_data["correlation_matrix"] is not None
    assert len(eda_data["correlation_matrix"]["columns"]) >= 2
    # Check geo data
    assert eda_data["geo_data"] is not None
    assert len(eda_data["geo_data"]["points"]) == 6
    # Check summary table
    assert len(eda_data["summary_table"]) == 5

def test_get_smart_eda_endpoint():
    response = client.get("/api/v1/eda?session_id=eda_test_session")
    assert response.status_code == 200
    data = response.json()
    assert "charts" in data
    assert "correlation_matrix" in data
    assert "geo_data" in data
