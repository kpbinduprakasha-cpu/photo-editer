"""Models API router for inspecting and downloading local Ollama AI models."""

from typing import Any, Dict, List
from fastapi import APIRouter
import httpx

from app.config import (
    DEFAULT_LLM_MODEL,
    DEFAULT_VISION_MODEL,
    FALLBACK_LLM_MODELS,
    FALLBACK_VISION_MODELS,
    OLLAMA_BASE_URL,
)
from app.services.ollama_client import check_ollama_status

router = APIRouter(prefix="/api/models", tags=["Models"])


@router.get("")
async def get_models_status() -> Dict[str, Any]:
    """Inspect local Ollama installation, available models, and compatibility."""
    ollama_ok, models = await check_ollama_status()

    # Identify vision-compatible models
    vision_candidates = [DEFAULT_VISION_MODEL] + FALLBACK_VISION_MODELS
    installed_vision = [m for m in models if any(cand in m for cand in vision_candidates)]

    # Identify LLM models
    llm_candidates = [DEFAULT_LLM_MODEL] + FALLBACK_LLM_MODELS
    installed_llm = [m for m in models if any(cand in m for cand in llm_candidates)]

    return {
        "ollama_connected": ollama_ok,
        "ollama_url": OLLAMA_BASE_URL,
        "installed_models": models,
        "vision_models_installed": installed_vision,
        "llm_models_installed": installed_llm,
        "recommended_vision_model": "moondream (1.8B, fast on CPU/integrated GPU)",
        "alternative_vision_models": ["llama3.2-vision:11b", "llava:7b", "minicpm-v"],
        "recommended_llm_model": "llama3.2 (3B, fast and lightweight)",
    }


@router.post("/pull")
async def pull_model(model_name: str) -> Dict[str, Any]:
    """Trigger background download of a model in Ollama."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(f"{OLLAMA_BASE_URL}/api/pull", json={"name": model_name, "stream": False})
            return {"status": resp.status_code, "detail": resp.json()}
    except Exception as e:
        return {"status": "error", "message": str(e)}
