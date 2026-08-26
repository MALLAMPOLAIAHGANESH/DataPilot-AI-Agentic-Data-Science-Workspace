# Use official Python lightweight runtime
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    SESSION_STORAGE_DIR=/app/workspace_sessions

# Set working directory
WORKDIR /app

# Install system dependencies needed for compiling packages like pyarrow/duckdb if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Create directory for parquet session storage
RUN mkdir -p /app/workspace_sessions

# Expose port
EXPOSE 8000

# Run FastAPI backend with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
