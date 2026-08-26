import io
import pytest
import pandas as pd
from fastapi.testclient import TestClient
from main import app
from app.data.processing import process_upload

client = TestClient(app)

def test_process_upload_valid_csv():
    raw_csv = b"col_a,col_b,col_c\n1,foo,10.5\n2,bar,20.0\n3,baz,30.2\n"
    df = process_upload(raw_csv, "sample.csv")
    assert isinstance(df, pd.DataFrame)
    assert len(df) == 3
    assert list(df.columns) == ["col_a", "col_b", "col_c"]
    assert df["col_a"].tolist() == [1, 2, 3]

def test_process_upload_unsupported_format():
    with pytest.raises(ValueError, match="Unsupported file format"):
        process_upload(b"some content", "data.unsupported")

def test_session_store_functions():
    from app.data.session_store import save_dataset, get_dataset, clear_session
    sample_df = pd.DataFrame({"x": [1, 2, 3], "y": [4, 5, 6]})
    save_dataset("test_session_123", sample_df)
    
    retrieved = get_dataset("test_session_123")
    assert retrieved is not None
    assert len(retrieved) == 3
    assert list(retrieved.columns) == ["x", "y"]
    
    clear_session("test_session_123")
    assert get_dataset("test_session_123") is None

def test_upload_dataset_api_endpoint():
    raw_csv = "feature_1,feature_2,target\n10,100,1\n20,200,0\n30,300,1\n"
    response = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("dataset.csv", raw_csv.encode("utf-8"), "text/csv")},
    )
    assert response.status_code == 200, f"Upload failed: {response.text}"
    data = response.json()
    assert data["message"] == "Upload successful"
    assert data["filename"] == "dataset.csv"
    assert data["columns"] == ["feature_1", "feature_2", "target"]
    assert data["rows"] == 3

def test_upload_dataset_api_alias_endpoint():
    raw_csv = "feature_1,feature_2\n10,100\n20,200\n"
    response = client.post(
        "/api/v1/upload",
        files={"file": ("dataset.csv", raw_csv.encode("utf-8"), "text/csv")},
    )
    assert response.status_code == 200, f"Upload failed: {response.text}"
    data = response.json()
    assert data["message"] == "Upload successful"
    assert data["rows"] == 2

# ── Resilience tests ──────────────────────────────────────────────

def test_process_upload_empty_csv():
    """An empty CSV (headers only, no rows) should raise a clean ValueError."""
    empty_csv = b"col_a,col_b,col_c\n"
    with pytest.raises(ValueError, match="empty"):
        process_upload(empty_csv, "empty.csv")

def test_process_upload_truly_empty_file():
    """A completely blank file should trigger EmptyDataError → ValueError."""
    with pytest.raises(ValueError, match="no data or columns"):
        process_upload(b"", "blank.csv")

def test_process_upload_malformed_csv():
    """A badly-quoted/structured CSV should trigger ParserError → ValueError."""
    bad_csv = b'col_a,col_b\n1,"unclosed quote\n2,3\n'
    with pytest.raises(ValueError, match="malformed"):
        process_upload(bad_csv, "bad.csv")

def test_api_returns_400_for_unsupported_format():
    """The upload endpoint should return 400 with a readable message for bad extensions."""
    response = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("data.txt", b"some content", "text/plain")},
    )
    assert response.status_code == 400
    detail = response.json()["detail"]
    msg = detail.get("message", detail) if isinstance(detail, dict) else detail
    assert "Unsupported" in msg or "unsupported" in msg

def test_api_returns_400_for_empty_csv():
    """The upload endpoint should return 400 with a readable message for empty files."""
    response = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("empty.csv", b"", "text/csv")},
    )
    assert response.status_code == 400
    detail = response.json()["detail"]
    msg = detail.get("message", detail) if isinstance(detail, dict) else detail
    assert "empty" in msg.lower() or "no data" in msg.lower()
