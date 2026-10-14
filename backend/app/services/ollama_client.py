"""Ollama AI Client with model compatibility checking, vision support, and graceful fallbacks."""

import base64
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import httpx
from PIL import Image, ImageStat

from app.config import (
    DEFAULT_LLM_MODEL,
    DEFAULT_VISION_MODEL,
    FALLBACK_LLM_MODELS,
    FALLBACK_VISION_MODELS,
    OLLAMA_BASE_URL,
)

logger = logging.getLogger("fotoowl.ollama")


async def check_ollama_status() -> Tuple[bool, List[str]]:
    """Check if Ollama server is running and list installed models."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                data = resp.json()
                models = [m.get("name", "") for m in data.get("models", [])]
                return True, models
    except Exception as e:
        logger.debug(f"Ollama connection check: {e}")
    return False, []


def select_best_model(available_models: List[str], preferred: str, fallbacks: List[str]) -> Optional[str]:
    """Select the best matching model from available models."""
    clean_available = [m.split(":")[0] for m in available_models]

    # Check exact match
    for m in available_models:
        if preferred in m or m in preferred:
            return m

    # Check fallback preferences
    for fb in fallbacks:
        for m in available_models:
            if fb in m or m.startswith(fb):
                return m

    # If any model exists, return the first one
    return available_models[0] if available_models else None


async def call_ollama_generate(
    model: str,
    prompt: str,
    images: Optional[List[str]] = None,
    system_prompt: Optional[str] = None,
    timeout: float = 60.0,
) -> Optional[str]:
    """Call Ollama /api/generate endpoint."""
    payload: Dict[str, Any] = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.3,
            "top_p": 0.9,
        },
    }
    if images:
        payload["images"] = images
    if system_prompt:
        payload["system"] = system_prompt

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload)
            if resp.status_code == 200:
                return resp.json().get("response", "")
            else:
                logger.warning(f"Ollama error {resp.status_code}: {resp.text}")
    except httpx.TimeoutException:
        logger.warning(f"Ollama call timed out for model {model}")
    except Exception as e:
        logger.warning(f"Ollama call failed: {e}")
    return None


def extract_json_from_text(text: str) -> Optional[Dict[str, Any]]:
    """Robustly extract and parse JSON object from LLM response text."""
    if not text:
        return None
    text = text.strip()

    # Direct parse
    try:
        return json.loads(text)
    except Exception:
        pass

    # Extract markdown code blocks ```json ... ```
    if "```json" in text:
        try:
            block = text.split("```json")[1].split("```")[0].strip()
            return json.loads(block)
        except Exception:
            pass

    if "```" in text:
        try:
            block = text.split("```")[1].split("```")[0].strip()
            return json.loads(block)
        except Exception:
            pass

    # Try finding outer braces { ... }
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        try:
            return json.loads(text[first_brace : last_brace + 1])
        except Exception:
            pass

    return None


def analyze_image_heuristics(image_path: Path, prompt: str) -> Dict[str, Any]:
    """Advanced heuristic computer vision analysis fallback when Ollama is unavailable."""
    with Image.open(image_path) as img:
        img_rgb = img.convert("RGB")
        w, h = img.size

        # Orientation
        if w > h * 1.15:
            orientation = "landscape"
        elif h > w * 1.15:
            orientation = "portrait"
        else:
            orientation = "square"

        # Image brightness and contrast
        stat = ImageStat.Stat(img_rgb)
        avg_brightness = sum(stat.mean) / 3.0
        contrast = sum(stat.stddev) / 3.0

        if contrast > 60 and avg_brightness > 40:
            quality = "high"
        elif contrast > 30:
            quality = "medium"
        else:
            quality = "standard"

        # Dominant colors
        r, g, b = stat.mean[0], stat.mean[1], stat.mean[2]
        colors = []
        if r > 140 and r > g + 20 and r > b + 20:
            colors.append("warm red/orange")
        if g > 140 and g > r + 15:
            colors.append("natural green")
        if b > 140 and b > r + 15:
            colors.append("sky blue")
        if avg_brightness > 180:
            colors.append("bright light")
        elif avg_brightness < 70:
            colors.append("dramatic dark")
        if not colors:
            colors = ["neutral warm", "vibrant tone"]

        # Scene cues
        filename_lower = image_path.name.lower()
        if any(k in filename_lower for k in ["person", "portrait", "face", "selfie", "friend", "man", "woman"]):
            subject = "Subject portrait"
            scene_type = "portrait"
            mood = "intimate and personal"
        elif any(k in filename_lower for k in ["nature", "mountain", "sea", "beach", "sunset", "tree", "forest", "park"]):
            subject = "Scenic natural landscape"
            scene_type = "outdoor"
            mood = "serene and breathtaking"
        elif any(k in filename_lower for k in ["city", "street", "building", "urban", "architecture"]):
            subject = "Urban architectural scenery"
            scene_type = "architectural"
            mood = "energetic and modern"
        elif any(k in filename_lower for k in ["food", "coffee", "restaurant", "cafe", "dinner"]):
            subject = "Culinary showcase"
            scene_type = "culinary"
            mood = "inviting and flavorful"
        else:
            subject = "Key visual moment"
            scene_type = "candid moment"
            mood = "engaging and authentic"

        return {
            "subject": subject,
            "scene_type": scene_type,
            "mood": mood,
            "image_quality": quality,
            "orientation": orientation,
            "colors": colors,
            "relevance_score": 0.88,
            "tags": [scene_type, mood, orientation] + colors[:2],
            "suggested_caption": f"Capturing the essence of {subject.lower()}",
        }
