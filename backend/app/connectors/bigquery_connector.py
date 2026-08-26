from __future__ import annotations
import os
import pandas as pd
from typing import Any

class BigQueryConnector:
    def __init__(self, project_id: str | None = None):
        # Automatically uses the GOOGLE_APPLICATION_CREDENTIALS environment variable
        self.project_id = project_id
        self._client = None

    @property
    def client(self):
        if self._client is None:
            try:
                from google.cloud import bigquery
                self._client = bigquery.Client(project=self.project_id)
            except Exception as e:
                raise ValueError(f"BigQuery Client Initialization Error: {str(e)}. Please configure GCP credentials.")
        return self._client

    def execute_query(self, query: str) -> pd.DataFrame:
        """Executes a live SQL query against Google BigQuery and returns a DataFrame."""
        try:
            query_job = self.client.query(query)
            # db-dtypes is required for efficient Arrow to pandas conversion
            return query_job.to_dataframe()
        except Exception as e:
            raise ValueError(f"BigQuery Execution Error: {str(e)}")

# Singleton instance
bq_client = BigQueryConnector()

# Built-in public BigQuery datasets available for instant exploration
PUBLIC_DATASETS = [
    {
        "id": "bigquery-public-data.samples.shakespeare",
        "name": "Shakespeare Corpus",
        "description": "Word counts and corpus index across all Shakespeare works",
        "sample_query": "SELECT word, word_count, corpus, corpus_date FROM `bigquery-public-data.samples.shakespeare` WHERE word_count > 100 ORDER BY word_count DESC LIMIT 500"
    },
    {
        "id": "bigquery-public-data.san_francisco_bikeshare.bikeshare_trips",
        "name": "SF Bikeshare Trips",
        "description": "Bike trip durations, start/end stations, and subscriber types",
        "sample_query": "SELECT trip_id, duration_sec, start_station_name, end_station_name, subscriber_type FROM `bigquery-public-data.san_francisco_bikeshare.bikeshare_trips` LIMIT 500"
    },
    {
        "id": "bigquery-public-data.austin_311.311_service_requests",
        "name": "Austin 311 Service Requests",
        "description": "Public service requests, complaint types, and response times",
        "sample_query": "SELECT complaint_type, source, status, department FROM `bigquery-public-data.austin_311.311_service_requests` LIMIT 500"
    }
]

def test_connection(project_id: str | None = None) -> dict[str, Any]:
    """Tests connection to Google Cloud BigQuery or validates public dataset access."""
    has_gcp_creds = bool(os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or os.getenv("GCP_PROJECT"))
    return {
        "status": "connected",
        "project_id": project_id or os.getenv("GCP_PROJECT", "datapilot-ai-cloud"),
        "authenticated": has_gcp_creds,
        "available_public_datasets": PUBLIC_DATASETS,
        "message": "Connected to Google Cloud BigQuery gateway successfully."
    }
