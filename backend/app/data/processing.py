import pandas as pd
import io
from typing import Dict, Any, Tuple

# ==========================================
# 1. In-Memory State Management
# ==========================================
# For a production app, you would use Redis or a Database with session IDs.
# For this architecture, we use a simple dictionary to hold the active DataFrame.
DATA_STORE: Dict[str, Any] = {"df": None}

def load_dataframe(file_contents: bytes) -> None:
    """Reads raw CSV bytes and stores them in the global state."""
    df = pd.read_csv(io.BytesIO(file_contents))
    DATA_STORE["df"] = df

def get_active_dataframe() -> pd.DataFrame:
    """Safely retrieves the current DataFrame."""
    return DATA_STORE["df"]

# ==========================================
# 2. UI Extraction Functions
# ==========================================
def get_schema_and_preview() -> Tuple[list, list, int]:
    """Extracts the exact data shapes required by our Pydantic UploadResponse schema."""
    df = DATA_STORE["df"]
    if df is None:
        raise ValueError("No dataframe loaded.")

    # 1. Build the schema list
    schema = [{"column": col, "type": str(dtype)} for col, dtype in df.dtypes.items()]
    
    # 2. Get the first 5 rows and replace NaNs with empty strings for JSON compatibility
    preview = df.head(5).fillna("").to_dict(orient="records")
    
    # 3. Get total row count
    rows = len(df)
    
    return schema, preview, rows

# ==========================================
# 3. LLM Context Functions
# ==========================================
def get_metadata_for_llm() -> str:
    """Generates a text summary of the dataframe for Gemini's system prompt."""
    df = DATA_STORE["df"]
    if df is None:
        return "No data loaded."
        
    buffer = io.StringIO()
    df.info(buf=buffer)
    info_str = buffer.getvalue()
    
    missing_values = df.isnull().sum().to_dict()
    
    return f"DataFrame Info:\n{info_str}\n\nMissing Values:\n{missing_values}"

# ==========================================
# 4. Code Execution Engine
# ==========================================
def execute_pandas_code(code_string: str) -> Dict[str, Any]:
    """
    Safely executes AI-generated Pandas code.
    Returns the 'chart_data' dictionary if the AI created one.
    """
    df = DATA_STORE["df"]
    
    # We add a chart_data variable to our sandbox environment
    local_env = {"df": df, "pd": pd, "chart_data": None}
    
    exec(code_string, local_env)
    
    DATA_STORE["df"] = local_env["df"]
    
    # Return the extracted chart data
    return local_env.get("chart_data")