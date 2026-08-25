from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# 1. LOAD THE API KEY FIRST!
load_dotenv()

# 2. NOW IMPORT THE ROUTES (so they can see the key)
from app.api import routes

app = FastAPI(
    title="DataPilot-AI Core Engine",
    description="Enterprise API for Agentic Data Science Workspace",
    version="1.0.0"
)

# Security: Allow the React frontend to communicate with this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Plug in the traffic controller!
app.include_router(routes.router)