from fastapi import APIRouter, UploadFile, File, HTTPException
from ..schemas.models import UploadResponse, ChatRequest, ChatResponse, DeepLearningRequest
from ..data import processing
from ..llm import orchestrator

# This router acts as a mini-FastAPI app that we will plug into main.py
router = APIRouter()

# ==========================================
# 1. Data Ingestion Endpoint
# ==========================================
@router.post("/upload", response_model=UploadResponse)
async def upload_dataset(file: UploadFile = File(...)):
    """Receives the CSV, loads it into Pandas, and returns the schema to the UI."""
    try:
        contents = await file.read()
        
        # 1. Store in Pandas
        processing.load_dataframe(contents)
        
        # 2. Extract UI data
        schema, preview, rows = processing.get_schema_and_preview()
        
        # 3. Return strictly formatted data matching our Pydantic schema
        return UploadResponse(
            message="Dataset successfully processed.",
            rows=rows,
            schema_info=schema,
            preview=preview
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process CSV: {str(e)}")

# ==========================================
# 2. Copilot Chat Endpoint
# ==========================================
@router.post("/chat", response_model=ChatResponse)
async def chat_with_copilot(request: ChatRequest):
    """Handles conversational EDA and code generation via Gemini Flash."""
    try:
        # 1. Get current dataset context
        metadata = processing.get_metadata_for_llm()
        if metadata == "No data loaded.":
            return ChatResponse(response="Please upload a dataset first.")
            
        # 2. Send to Gemini Flash
        ai_response = orchestrator.chat_with_data(request.query, metadata)
        
        # 3. If Gemini wrote code (basic heuristic: looking for pandas methods)
        # In a production app, we'd use function calling, but this works for our MVP
        code_executed = None
        if "df." in ai_response and "=" in ai_response:
            try:
                # Extract the code (assuming the model outputs clean code based on our prompt)
                clean_code = ai_response.replace("```python", "").replace("```", "").strip()
                processing.execute_pandas_code(clean_code)
                code_executed = clean_code
                ai_response += "\n\n✅ *I successfully executed this cleaning operation on your dataset.*"
            except Exception as e:
                ai_response += f"\n\n⚠️ *I tried to run the code, but hit an error:* {e}"

        return ChatResponse(
            response=ai_response,
            code_executed=code_executed
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Engine Error: {str(e)}")

# ==========================================
# 3. If Gemini wrote code
    code_executed = None
    chart_data = None
    if "df." in ai_response and "=" in ai_response:
        try:
            clean_code = ai_response.replace("```python", "").replace("```", "").strip()
            # Capture the chart data returned from our engine
            chart_data = processing.execute_pandas_code(clean_code)
            code_executed = clean_code
            
            if chart_data:
                ai_response += "\n\n📊 *I have generated an interactive chart for you.*"
            else:
                ai_response += "\n\n✅ *I successfully executed this operation on your dataset.*"
        except Exception as e:
            ai_response += f"\n\n⚠️ *I tried to run the code, but hit an error:* {e}"

    return ChatResponse(
        response=ai_response,
        code_executed=code_executed,
        chart_data=chart_data
    )