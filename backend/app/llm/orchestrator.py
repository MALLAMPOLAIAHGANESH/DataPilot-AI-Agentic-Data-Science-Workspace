from google import genai
from google.genai import types
import os

client = genai.Client()

# ==========================================
# MEMORY BUFFER
# ==========================================
# This list will hold the rolling conversation context
SESSION_MEMORY = []

def reset_memory():
    """Clears the AI's memory when a new dataset is uploaded."""
    global SESSION_MEMORY
    SESSION_MEMORY = []

# ==========================================
# Agent 1: The Fast-Track Analyst (Gemini Flash)
# ==========================================
def chat_with_data(user_query: str, dataset_metadata: str) -> str:
    """
    Uses Gemini 3.6 Flash for high-speed conversational EDA with memory.
    """
    global SESSION_MEMORY
    
    # The system instruction updates dynamically with the latest dataset metadata
    system_instruction = f"""
    You are an expert Data Scientist Copilot. 
    You are currently looking at a dataset with the following metadata:
    {dataset_metadata}
    
    Answer the user's question clearly. 
    If they ask you to clean the data, write valid Pandas code.
    
    CHART INSTRUCTIONS:
    If the user asks for a chart or visualization, write Pandas code to aggregate/prepare the data.
    Then, create a dictionary exactly named `chart_data` with this structure:
    chart_data = {{
        "type": "bar", # can be 'bar', 'line', or 'scatter'
        "data": df_agg.fillna(0).to_dict(orient="records"),
        "x_key": "name_of_x_column",
        "y_key": "name_of_y_column"
    }}
    Assume the dataframe is loaded as `df`.
    """
    
    # 1. Append the user's new message to the memory buffer
    SESSION_MEMORY.append(
        types.Content(role="user", parts=[types.Part.from_text(text=user_query)])
    )
    
    # 2. Send the ENTIRE memory buffer to Gemini
    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=SESSION_MEMORY,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.2 
        )
    )
    
    # 3. Append Gemini's response to the memory buffer so it remembers what it said
    SESSION_MEMORY.append(
        types.Content(role="model", parts=[types.Part.from_text(text=response.text)])
    )
    
    return response.text

# ==========================================
# Agent 2: The Architect (Gemini Pro)
# ==========================================
def generate_dl_architecture(target_column: str, task_type: str, dataset_metadata: str) -> str:
    prompt = f"""
    You are a Senior Machine Learning Engineer.
    I have a dataset with this metadata:
    {dataset_metadata}
    
    Task: Design a PyTorch Neural Network to predict '{target_column}'.
    Type: {task_type}.
    
    Return ONLY valid, highly-optimized Python code containing the PyTorch model class 
    and the training loop. Do not include markdown blocks.
    """
    
    response = client.models.generate_content(
        model="gemini-3.6-pro",
        contents=prompt,
        config=types.GenerateContentConfig(temperature=0.4)
    )
    
    return response.text.replace("```python", "").replace("```", "").strip()