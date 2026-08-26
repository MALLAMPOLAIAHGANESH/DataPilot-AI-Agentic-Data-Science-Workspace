# Extract UI data
schema, preview, rows = processing.get_schema_and_preview()
        
 # NEW: Generate the Auto-EDA profile
    eda_profile = processing.generate_eda_profile()
        
        return UploadResponse(
            message="Dataset successfully processed.",
            rows=rows,
            schema_info=schema,
            preview=preview,
            eda_profile=eda_profile # NEW: Send to React
        )