import pytest
import pandas as pd
from fastapi.testclient import TestClient
from main import app
from app.data.session_store import save_dataset
from app.reports.notebook_generator import generate_jupyter_notebook
from app.reports.report_generator import generate_html_report

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_report_dataset():
    df = pd.DataFrame({
        "id": [1, 2, 3, 4, 5],
        "name": ["Alice", "Bob", "Charlie", "David", "Eva"],
        "score": [88, 92, 79, 95, 85],
    })
    save_dataset("report_test_session", df)

def test_generate_jupyter_notebook():
    nb_str = generate_jupyter_notebook("report_test_session")
    assert isinstance(nb_str, str)
    assert "DataPilot" in nb_str
    assert "pandas" in nb_str

def test_generate_html_report():
    html_str = generate_html_report("report_test_session")
    assert isinstance(html_str, str)
    assert "<html" in html_str
    assert "DataPilot" in html_str
    assert "score" in html_str

def test_export_notebook_endpoint():
    res = client.get("/api/v1/export/notebook?session_id=report_test_session")
    assert res.status_code == 200
    assert "attachment; filename=datapilot_analysis.ipynb" in res.headers["Content-Disposition"]
    assert len(res.content) > 0

def test_export_report_endpoint():
    res = client.get("/api/v1/export/report?session_id=report_test_session")
    assert res.status_code == 200
    assert "attachment; filename=executive_report.html" in res.headers["Content-Disposition"]
    assert "text/html" in res.headers["Content-Type"]
    assert "<html" in res.text
