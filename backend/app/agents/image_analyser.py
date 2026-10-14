"""Agent 1: Image Analyser Agent.

Analyses each uploaded photo using a compatible vision-language model (or intelligent CV heuristics),
extracts subjects, scene types, aesthetic quality, orientation, color palette, relevance,
and returns validated structured JSON.
"""

import base64
import logging
from pathlib import Path
from typing import Any, Dict, List

from app.agents.state import VideoGenerationState
from app.config import DEFAULT_VISION_MODEL, FALLBACK_VISION_MODELS
from app.database import add_job_log, update_image_analysis, update_job
from app.schemas import ImageAnalysis
from app.services.ollama_client import (
    analyze_image_heuristics,
    call_ollama_generate,
    check_ollama_status,
    extract_json_from_text,
    select_best_model,
)

logger = logging.getLogger("fotoowl.agent.image_analyser")


async def run_image_analyser(state: VideoGenerationState) -> Dict[str, Any]:
    """Execute Image Analyser Agent node in LangGraph workflow."""
    job_id = state["job_id"]
    images = state.get("images", [])
    prompt = state.get("prompt", "")

    add_job_log(job_id, "Image Analyser", f"Starting analysis of {len(images)} photos...", "info")
    update_job(job_id, current_agent="Image Analyser", progress_pct=10)

    # Check Ollama vision models
    ollama_ok, models = await check_ollama_status()
    vision_model = None
    if ollama_ok and models:
        vision_model = select_best_model(models, DEFAULT_VISION_MODEL, FALLBACK_VISION_MODELS)
        if vision_model:
            add_job_log(job_id, "Image Analyser", f"Found active Ollama vision model: {vision_model}", "info")
        else:
            add_job_log(
                job_id,
                "Image Analyser",
                "No vision model found in Ollama. Using advanced CV heuristic analyzer engine.",
                "info",
            )
    else:
        add_job_log(
            job_id,
            "Image Analyser",
            "Ollama offline. Utilizing integrated high-precision computer vision analyzer.",
            "info",
        )

    analyses: List[Dict[str, Any]] = []

    for idx, img_info in enumerate(images):
        img_path = Path(img_info["file_path"])
        image_id = img_info["id"]
        orig_name = img_info["original_filename"]

        add_job_log(job_id, "Image Analyser", f"Analysing image {idx+1}/{len(images)}: {orig_name}", "info")

        analysis_data: Dict[str, Any] = {}

        if vision_model and img_path.exists():
            try:
                # Read and base64 encode
                with open(img_path, "rb") as f:
                    b64_img = base64.b64encode(f.read()).decode("utf-8")

                v_prompt = f"""You are an expert photography and film director analysing this photo for a video reel with the user prompt: "{prompt}".
Return ONLY a valid JSON object with these keys:
{{
  "subject": "primary focus/subject description",
  "scene_type": "indoor / outdoor / portrait / nature / architectural / culinary",
  "mood": "aesthetic tone or mood",
  "image_quality": "high / medium / standard",
  "orientation": "portrait / landscape / square",
  "colors": ["dominant color 1", "color 2"],
  "relevance_score": 0.95,
  "tags": ["keyword1", "keyword2"],
  "suggested_caption": "short evocative 3-6 word caption"
}}"""

                raw_resp = await call_ollama_generate(
                    model=vision_model,
                    prompt=v_prompt,
                    images=[b64_img],
                    timeout=45.0,
                )

                parsed = extract_json_from_text(raw_resp or "")
                if parsed and "subject" in parsed:
                    analysis_data = parsed
                    analysis_data["relevance_score"] = float(parsed.get("relevance_score", 0.9))
            except Exception as e:
                logger.warning(f"Ollama vision analysis failed for {orig_name}: {e}")

        # Fallback to CV heuristics if vision model wasn't used or failed
        if not analysis_data or "subject" not in analysis_data:
            analysis_data = analyze_image_heuristics(img_path, prompt)

        # Validate with Pydantic ImageAnalysis
        validated = ImageAnalysis(
            image_id=image_id,
            filename=orig_name,
            subject=analysis_data.get("subject", "Visual scene"),
            scene_type=analysis_data.get("scene_type", "scenic"),
            mood=analysis_data.get("mood", "cinematic"),
            image_quality=analysis_data.get("image_quality", "high"),
            orientation=analysis_data.get("orientation", "landscape"),
            colors=analysis_data.get("colors", []),
            relevance_score=float(analysis_data.get("relevance_score", 0.85)),
            tags=analysis_data.get("tags", []),
            suggested_caption=analysis_data.get("suggested_caption", f"Moments of {orig_name}"),
        )

        analysis_dict = validated.model_dump()
        analyses.append(analysis_dict)

        # Save to database
        update_image_analysis(image_id, analysis_dict)

    add_job_log(job_id, "Image Analyser", f"Successfully analysed all {len(images)} images.", "info")
    update_job(job_id, progress_pct=25)

    return {
        "analyses": analyses,
        "current_agent": "Storyboard Writer",
    }
