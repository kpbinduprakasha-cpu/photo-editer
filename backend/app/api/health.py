"""Health and diagnostics API endpoint."""

import platform
from fastapi import APIRouter
from app.config import FFMPEG_BINARY, FFPROBE_BINARY, STORAGE_DIR
from app.schemas import HealthResponse
from app.services.ffmpeg_service import get_ffmpeg_version
from app.services.ollama_client import check_ollama_status

router = APIRouter(prefix="/api/health", tags=["Health"])


@router.get("", response_model=HealthResponse)
async def check_health() -> HealthResponse:
    """Retrieve system diagnostics, FFmpeg status, and Ollama model status."""
    ollama_ok, models = await check_ollama_status()
    ffmpeg_ver = get_ffmpeg_version()

    return HealthResponse(
        status="healthy",
        python_version=platform.python_version(),
        ffmpeg_available=bool(FFMPEG_BINARY),
        ffmpeg_version=ffmpeg_ver,
        ffprobe_available=bool(FFPROBE_BINARY),
        ollama_available=ollama_ok,
        ollama_models=models,
        active_storage_dir=str(STORAGE_DIR),
    )
