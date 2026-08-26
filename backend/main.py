from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load .env FIRST — so GEMINI_API_KEY is available before any imports
load_dotenv()

from app.api.v1 import datasets as datasets_router
from app.api import routes as automl_router
from app.data.session_store import current_session_id

app = FastAPI(
    title="DataPilot AI — Core Engine",
    description="Agentic Data Science API v1 — Multi-User Session Isolation",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    # Expose X-Session-ID so the browser can send it
    allow_headers=["*", "X-Session-ID"],
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


@app.get("/export/notebook", tags=["export"])
@app.get("/api/v1/export/notebook", tags=["export"])
async def export_jupyter_notebook_alias():
    return await datasets_router.export_jupyter_notebook()


# ── Health check ──────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health():
    from app.data.session_store import ACTIVE_SESSIONS
    return {
        "status": "ok",
        "version": "2.0.0",
        "active_sessions": len(ACTIVE_SESSIONS),
    }