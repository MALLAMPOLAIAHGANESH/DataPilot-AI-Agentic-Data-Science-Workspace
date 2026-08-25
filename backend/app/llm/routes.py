@router.post("/upload", response_model=UploadResponse)
async def upload_dataset(file: UploadFile = File(...)):
    """Receives the CSV, loads it into Pandas, and returns the schema to the UI."""
    try:
        contents = await file.read()
        
        # 1. Store in Pandas
        processing.load_dataframe(contents)
        
        # NEW: 2. Wipe the AI's memory slate clean for the new dataset!
        orchestrator.reset_memory()
        
        # 3. Extract UI data
        schema, preview, rows = processing.get_schema_and_preview()
        
        return UploadResponse(
            message="Dataset successfully processed.",
            rows=rows,
            schema_info=schema,
            preview=preview
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process CSV: {str(e)}")