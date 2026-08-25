"""
llm/client.py
Multi-key Gemini client pool with auto-rotation and dynamic .env reloading.
Supports GEMINI_API_KEY, GEMINI_API_KEYS (comma-separated), and GEMINI_API_KEY_1, _2, etc.
"""
import os
from dotenv import load_dotenv
from google import genai

_key_index = 0


def get_all_api_keys() -> list[str]:
    """Reloads .env and discovers all available Gemini API keys."""
    load_dotenv(override=True)
    keys = []
    
    # Check GEMINI_API_KEYS (comma separated)
    multi = os.getenv("GEMINI_API_KEYS", "")
    if multi:
        for k in multi.split(","):
            cleaned = k.strip().strip('"').strip("'")
            if cleaned and cleaned not in keys:
                keys.append(cleaned)

    # Check primary GEMINI_API_KEY
    primary = os.getenv("GEMINI_API_KEY", "").strip().strip('"').strip("'")
    if primary and primary not in keys:
        keys.append(primary)

    # Check GEMINI_API_KEY_1 .. GEMINI_API_KEY_10
    for i in range(1, 11):
        numbered = os.getenv(f"GEMINI_API_KEY_{i}", "").strip().strip('"').strip("'")
        if numbered and numbered not in keys:
            keys.append(numbered)

    return keys


def get_client(key_override: str | None = None) -> tuple[genai.Client, str]:
    """
    Returns a tuple of (genai.Client, api_key_used).
    Rotates through available keys if multiple are defined.
    """
    global _key_index
    if key_override:
        return genai.Client(api_key=key_override), key_override

    keys = get_all_api_keys()
    if not keys:
        raise RuntimeError("No GEMINI_API_KEY found in .env. Please add your Google Gemini API key.")

    selected_key = keys[_key_index % len(keys)]
    return genai.Client(api_key=selected_key), selected_key


def rotate_key():
    """Rotates to the next configured API key in the pool."""
    global _key_index
    keys = get_all_api_keys()
    if keys:
        _key_index = (_key_index + 1) % len(keys)
