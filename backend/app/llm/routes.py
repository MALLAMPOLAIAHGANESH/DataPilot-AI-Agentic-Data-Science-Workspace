from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.llm.orchestrator import run_analyst_copilot

router = APIRouter(prefix="/copilot", tags=["AI Copilot"])


class CopilotRequest(BaseModel):
    message: str
    session_id: str = "default_session"


@router.post("/chat")
async def copilot_chat(request: CopilotRequest):
    try:
        result = run_analyst_copilot(request.message, request.session_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))