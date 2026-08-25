# app/llm/orchestrator.py
# DEPRECATED — superseded by app/agents/analyst_agent.py
# Kept as an importable stub so any legacy reference doesn't crash uvicorn.

def reset_memory():
    pass

def chat_with_data(user_query: str, dataset_metadata: str) -> str:
    return "Please use the new /api/v1/datasets/{id}/chat endpoint."

def generate_dl_architecture(target_column: str, task_type: str, dataset_metadata: str) -> str:
    return ""