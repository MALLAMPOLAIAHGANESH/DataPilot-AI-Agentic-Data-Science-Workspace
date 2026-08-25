"""
schemas/dataset.py
Pydantic models for dataset upload and preview responses.
"""
from pydantic import BaseModel
from typing import Any


class ColumnInfo(BaseModel):
    column:      str
    type:        str
    missing:     int
    missing_pct: float
    unique:      int


class DatasetMeta(BaseModel):
    dataset_id:     str
    file_name:      str
    rows:           int
    columns:        int
    missing_values: int
    schema:         list[ColumnInfo]


class PreviewResponse(BaseModel):
    dataset_id: str
    columns:    list[str]
    rows:       list[dict[str, Any]]


class ChatRequest(BaseModel):
    query: str


class ChatResponse(BaseModel):
    response:   str
    chart_data: dict[str, Any] | None = None
    tool_calls: list[str]             = []


class TrainRequest(BaseModel):
    target_column: str
    task_type:     str   # 'classification' | 'regression'


class NotebookRequest(BaseModel):
    target_column: str
    task_type:     str
