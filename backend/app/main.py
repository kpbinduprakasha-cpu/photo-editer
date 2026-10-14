"""FastAPI application entrypoint for FotoOwl AI Multi-Agent Video Reel Generator."""

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.audio import router as audio_router
from app.api.health import router as health_router
from app.api.jobs import router as jobs_router
from app.api.models import router as models_router
from app.api.samples import router as samples_router
from app.api.templates import router as templates_router
from app.api.uploads import router as uploads_router
from app.config import FRONTEND_DIST_DIR, OUTPUT_DIR, UPLOAD_DIR
from app.database import init_db

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("fotoowl")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("Initializing FotoOwl database and storage directories...")
    init_db()
    logger.info("FotoOwl backend initialized successfully.")
    yield
    logger.info("FotoOwl backend shutting down.")


app = FastAPI(
    title="FotoOwl AI Multi-Agent Video Reel Generator",
    description="Multi-agent orchestration system for automated video reels from photographs using LangGraph, Remotion, and Ollama.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend Vite dev server or external clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded photos and rendered MP4 files
app.mount("/storage/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.mount("/storage/outputs", StaticFiles(directory=str(OUTPUT_DIR)), name="outputs")

# Register API routers
app.include_router(health_router)
app.include_router(uploads_router)
app.include_router(jobs_router)
app.include_router(models_router)
app.include_router(samples_router)
app.include_router(audio_router)
app.include_router(templates_router)

# Mount Frontend Assets for All-in-One Serving
assets_dir = FRONTEND_DIST_DIR / "assets"
if assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="frontend-assets")


@app.get("/api")
def get_api_root():
    return {
        "service": "FotoOwl Video Reel Generator API",
        "version": "1.0.0",
        "docs_url": "/docs",
        "health_url": "/api/health",
    }


@app.get("/{full_path:path}")
async def serve_spa_frontend(full_path: str = ""):
    """Serve the single-page React frontend or static files from frontend/dist."""
    index_file = FRONTEND_DIST_DIR / "index.html"
    if not FRONTEND_DIST_DIR.exists() or not index_file.exists():
        return {
            "service": "FotoOwl Video Reel Generator",
            "message": "Frontend distribution not built yet. Run 'npm run build' in frontend directory.",
            "docs_url": "/docs",
        }

    target_file = FRONTEND_DIST_DIR / full_path
    if full_path and target_file.exists() and target_file.is_file():
        return FileResponse(str(target_file))

    return FileResponse(str(index_file))
