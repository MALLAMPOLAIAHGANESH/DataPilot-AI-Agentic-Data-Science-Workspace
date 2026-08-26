from pydantic import BaseModel
from typing import List, Dict, Any, Optional

# ==========================================
# 1. Data Ingestion Schemas
# ==========================================
class ColumnSchema(BaseModel):
    """Blueprint for describing a single column in the dataset"""
    column: str
    type: str

class UploadResponse(BaseModel):
    message: str
    rows: int
    schema_info: List[Dict[str, Any]]
    preview: List[Dict[str, Any]]
    eda_profile: Optional[Dict[str, Any]] = None  # NEW: Holds our automated insights

# ==========================================
# 2. Copilot Chat Schemas
# ==========================================
class ChatRequest(BaseModel):
    """What React sends to the backend when the user types a message"""
    query: str

class ChatResponse(BaseModel):
    """What the backend returns after Gemini processes the chat"""
    response: str
    code_executed: Optional[str] = None
    chart_data: Optional[Dict[str, Any]] = None  # NEW: Holds the chart JSON

# ==========================================
# 3. Deep Learning Engine Schemas
# ==========================================
class DeepLearningRequest(BaseModel):
    """What React sends when requesting a PyTorch model"""
    target_column: str
    task_type: str  # e.g., "Regression" or "Classification"