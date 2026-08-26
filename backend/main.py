import os
import sys
import logging

# Ensure backend directory is in sys.path so 'app.*' imports always resolve
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load .env FIRST — so GEMINI_API_KEY is available before any imports
load_dotenv()

# ── Structured Logging Configuration ──────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("datapilot.api")

from app.api.v1 import datasets as datasets_router
from app.api import routes as automl_router
from app.llm.routes import router as copilot_router
from app.data.session_store import current_session_id

app = FastAPI(
    title="DataPilot Workspace API",
    description="Agentic Data Science API v1 — Multi-User Session Isolation",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Global Exception Handler ──────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "code": "INTERNAL_SERVER_ERROR",
            "message": str(exc),
            "detail": "An unexpected error occurred while processing the request.",
        },
    )

# ── CORS Configuration for Production Security ────────────────────
ALLOWED_ORIGINS_RAW = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:80,http://localhost:3000"
)

if ALLOWED_ORIGINS_RAW.strip() == "*":
    ALLOWED_ORIGINS = ["*"]
    ALLOW_CREDENTIALS = False
else:
    ALLOWED_ORIGINS = [
        origin.strip()
        for origin in ALLOWED_ORIGINS_RAW.split(",")
        if origin.strip()
    ]
    ALLOW_CREDENTIALS = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=ALLOW_CREDENTIALS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ── Session Isolation Middleware ───────────────────────────────────
# Runs before every request. Reads the UUID the React tab generated,
# sets the ContextVar so all downstream code sees the right sandbox,
# then resets it cleanly after the response is sent.
@app.middleware("http")
async def session_isolation_middleware(request: Request, call_next):
    session_id = request.headers.get("X-Session-ID", "default")
    token = current_session_id.set(session_id)
    try:
        response = await call_next(request)
    finally:
        current_session_id.reset(token)
    return response

# ── Routes ────────────────────────────────────────────────────────
app.include_router(datasets_router.router, prefix="/api/v1")
app.include_router(automl_router.router, prefix="/api/v1/datasets")
app.include_router(copilot_router, prefix="/api/v1")


@app.post("/api/v1/upload", tags=["datasets"])
async def upload_dataset_alias(file: datasets_router.UploadFile = datasets_router.File(...)):
    return await datasets_router.upload_dataset(file)


@app.get("/api/v1/profile", tags=["datasets"])
async def get_dataset_profile_alias(session_id: str = "default_session"):
    return await datasets_router.get_dataset_profile(session_id)


@app.post("/api/v1/train", tags=["automl"])
async def train_models_alias(req: datasets_router.TrainRequest):
    return await datasets_router.train_models(req)


@app.get("/api/v1/eda", tags=["eda"])
async def get_smart_eda_alias(session_id: str = "default_session"):
    return await datasets_router.get_smart_eda(session_id)


@app.post("/api/v1/query", tags=["sql"])
async def run_query_alias(req: datasets_router.QueryRequest):
    return await datasets_router.run_query(req)


@app.get("/export/notebook", tags=["export"])
@app.get("/api/v1/export/notebook", tags=["export"])
async def export_jupyter_notebook_alias(session_id: str = "default_session"):
    return await datasets_router.export_notebook(session_id)


@app.get("/export/report", tags=["export"])
@app.get("/api/v1/export/report", tags=["export"])
async def export_html_report_alias(session_id: str = "default_session"):
    return await datasets_router.export_html_report(session_id)


# ── Health check ──────────────────────────────────────────────────
@app.get("/health", tags=["health"])
def health_check():
    from app.data.session_store import ACTIVE_SESSIONS
    return {
        "status": "healthy",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "version": "1.0.0",
        "active_sessions": len(ACTIVE_SESSIONS),
    }