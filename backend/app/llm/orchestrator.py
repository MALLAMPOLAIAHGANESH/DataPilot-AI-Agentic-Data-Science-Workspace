"""
llm/orchestrator.py — Session-aware Gemini orchestrator
=========================================================
chat_with_data() now reads conversation history from and writes it
back to the current user's isolated session sandbox — no more shared
global SESSION_MEMORY leaking between students.
"""
from __future__ import annotations

from google import genai
from google.genai import types

from app.tools import dataset_tools
from app.data.session_store import get_current_session

client = genai.Client()

AVAILABLE_TOOLS = [
    dataset_tools.filter_rows,
    dataset_tools.remove_outliers,
    dataset_tools.drop_columns,
    dataset_tools.impute_missing,
]

# ── Legacy shim — datasets.py passes orchestrator.SESSION_MEMORY ──
# We keep this name so old callers don't crash, but its content is
# now irrelevant; chat_with_data() reads from the session instead.
SESSION_MEMORY: list = []


def chat_with_data(
    user_message: str,
    schema_context: str,
    # session_memory kept as optional kwarg for backwards compatibility
    session_memory: list | None = None,
) -> str:
    """
    Send a message to Gemini, using the current user's isolated chat
    history. Any tool calls automatically operate on that user's DataFrame.
    """
    session = get_current_session()
    memory  = session["memory"]  # ← per-user, never shared

    system_instruction = f"""
You are an expert Data Science AI Copilot for DataPilot-AI.

Dataset Schema Context:
{schema_context}

Rules:
- When the user asks to clean, filter, drop, or transform data, call the appropriate tool.
- Confirm what you did clearly and succinctly.
- Never hallucinate column names — only use columns listed in the schema above.
"""

    memory.append({"role": "user", "parts": [{"text": user_message}]})

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=memory,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.1,
            tools=AVAILABLE_TOOLS,
        ),
    )

    assistant_text = response.text or "Transformation executed."
    memory.append({"role": "model", "parts": [{"text": assistant_text}]})
    return assistant_text


def reset_memory() -> None:
    """Clear the current user's chat history (called on new dataset upload)."""
    get_current_session()["memory"] = []