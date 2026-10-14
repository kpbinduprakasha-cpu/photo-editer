"""Agent 2: Storyboard Writer Agent.

Combines photo analyses and user intent into an ordered, cinematic storyboard
with scene durations, transitions, captions, title card, and music cues.
"""

import logging
from typing import Any, Dict, List

from app.agents.state import VideoGenerationState
from app.config import DEFAULT_LLM_MODEL, FALLBACK_LLM_MODELS
from app.database import add_job_log, update_job
from app.schemas import Storyboard, StoryboardScene
from app.services.ollama_client import (
    call_ollama_generate,
    check_ollama_status,
    extract_json_from_text,
    select_best_model,
)

logger = logging.getLogger("fotoowl.agent.storyboard_writer")


async def run_storyboard_writer(state: VideoGenerationState) -> Dict[str, Any]:
    """Execute Storyboard Writer Agent node in LangGraph workflow."""
    job_id = state["job_id"]
    analyses = state.get("analyses", [])
    prompt = state.get("prompt", "My Story")
    aspect_ratio = state.get("aspect_ratio", "9:16")
    style = state.get("style", "cinematic")
    target_duration = float(state.get("duration_seconds", 15))
    captions_enabled = state.get("captions_enabled", True)
    music_enabled = state.get("music_enabled", True)

    add_job_log(job_id, "Storyboard Writer", "Crafting narrative storyboard and pacing...", "info")
    update_job(job_id, current_agent="Storyboard Writer", progress_pct=30)

    total_images = len(analyses)
    if total_images == 0:
        raise ValueError("Cannot create storyboard with zero analysed images.")

    # Check Ollama LLM
    ollama_ok, models = await check_ollama_status()
    llm_model = None
    if ollama_ok and models:
        llm_model = select_best_model(models, DEFAULT_LLM_MODEL, FALLBACK_LLM_MODELS)
        if llm_model:
            add_job_log(job_id, "Storyboard Writer", f"Using Ollama LLM model: {llm_model}", "info")

    storyboard_dict: Dict[str, Any] = {}

    if llm_model:
        try:
            summary_list = [
                {
                    "image_id": a["image_id"],
                    "filename": a["filename"],
                    "subject": a["subject"],
                    "scene_type": a["scene_type"],
                    "mood": a["mood"],
                }
                for a in analyses
            ]

            llm_prompt = f"""You are a professional video director creating a storyboard for a {style} video reel.
User Prompt: "{prompt}"
Target Duration: {target_duration} seconds
Available Photos: {summary_list}

Create an ordered storyboard. Return ONLY valid JSON with this structure:
{{
  "title": "A captivating title for this reel",
  "background_music_mood": "cinematic upbeat",
  "scenes": [
    {{
      "scene_index": 0,
      "image_id": "{analyses[0]['image_id']}",
      "filename": "{analyses[0]['filename']}",
      "duration_seconds": 3.0,
      "caption": "Evocative caption for this moment",
      "transition": "fade",
      "ken_burns_effect": "zoom_in"
    }}
  ]
}}
Note: Transition options: fade, slide_left, slide_right, zoom_in.
Ken burns effect options: zoom_in, zoom_out, pan_left, pan_right.
Ensure total duration of all scenes equals approximately {target_duration} seconds."""

            raw_resp = await call_ollama_generate(
                model=llm_model,
                prompt=llm_prompt,
                timeout=45.0,
            )
            parsed = extract_json_from_text(raw_resp or "")
            if parsed and "scenes" in parsed and len(parsed["scenes"]) > 0:
                storyboard_dict = parsed
                add_job_log(job_id, "Storyboard Writer", "Ollama LLM successfully generated storyboard narrative.", "info")
        except Exception as e:
            logger.warning(f"Ollama storyboard generation failed: {e}")

    # Fallback algorithmic director if LLM did not return complete storyboard
    if not storyboard_dict or not storyboard_dict.get("scenes"):
        add_job_log(
            job_id,
            "Storyboard Writer",
            "Applying algorithmic cinematic pacing and transition rhythm.",
            "info",
        )

        duration_per_scene = round(target_duration / max(1, total_images), 2)
        transitions = ["fade", "slide_left", "zoom_in", "slide_right"]
        effects = ["zoom_in", "zoom_out", "pan_left", "pan_right"]

        scenes: List[Dict[str, Any]] = []
        for i, a in enumerate(analyses):
            cap = a.get("suggested_caption") if captions_enabled else ""
            if not cap and captions_enabled:
                cap = f"{a.get('subject', 'Moments captured')}"

            scenes.append(
                {
                    "scene_index": i,
                    "image_id": a["image_id"],
                    "filename": a["filename"],
                    "duration_seconds": duration_per_scene,
                    "caption": cap or "",
                    "transition": transitions[i % len(transitions)],
                    "ken_burns_effect": effects[i % len(effects)],
                    "visual_focus": a.get("subject"),
                    "overlay_title": prompt[:30] if i == 0 else None,
                }
            )

        storyboard_dict = {
            "title": prompt[:40] if prompt else "Moments in Motion",
            "aspect_ratio": aspect_ratio,
            "style": style,
            "total_duration_seconds": target_duration,
            "background_music_mood": "cinematic ambient",
            "scenes": scenes,
        }

    # Validate storyboard with Pydantic
    validated_scenes = [
        StoryboardScene(
            scene_index=s.get("scene_index", idx),
            image_id=s.get("image_id", analyses[idx % total_images]["image_id"]),
            filename=s.get("filename", analyses[idx % total_images]["filename"]),
            duration_seconds=float(s.get("duration_seconds", 3.0)),
            caption=s.get("caption", ""),
            transition=s.get("transition", "fade"),
            ken_burns_effect=s.get("ken_burns_effect", "zoom_in"),
            visual_focus=s.get("visual_focus"),
            overlay_title=s.get("overlay_title"),
        )
        for idx, s in enumerate(storyboard_dict.get("scenes", []))
    ]

    validated_storyboard = Storyboard(
        title=storyboard_dict.get("title", prompt[:40] or "Video Reel"),
        aspect_ratio=aspect_ratio,
        style=style,
        total_duration_seconds=target_duration,
        background_music_mood=storyboard_dict.get("background_music_mood", "cinematic"),
        scenes=validated_scenes,
    )

    sb_data = validated_storyboard.model_dump()
    update_job(job_id, storyboard_json=sb_data, progress_pct=50)
    add_job_log(
        job_id,
        "Storyboard Writer",
        f"Storyboard complete with {len(validated_scenes)} scenes, total duration {target_duration}s.",
        "info",
    )

    return {
        "storyboard": sb_data,
        "current_agent": "Script Generator",
    }
