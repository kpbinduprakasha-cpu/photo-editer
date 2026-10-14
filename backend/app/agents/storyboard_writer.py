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
        # Detect aggregate dominant theme from all image analyses
        themes = [a.get("detected_theme") for a in analyses if a.get("detected_theme")]
        wedding_count = sum(1 for t in themes if t == "wedding")
        nature_count = sum(1 for t in themes if t == "nature")
        celebration_count = sum(1 for t in themes if t == "celebration")

        prompt_l = (prompt or "").lower()
        if "wedding" in prompt_l or "marriage" in prompt_l or wedding_count >= 1:
            dominant_theme = "wedding"
            music_mood = "wedding"
            default_title = "Eternal Love: A Wedding Celebration"
            captions_pool = [
                "Two hearts, one timeless journey",
                "Promises made in love and faith",
                "Dancing under a canopy of dreams",
                "Surrounded by those we cherish most",
                "A lifetime of happiness begins now",
            ]
        elif "nature" in prompt_l or "landscape" in prompt_l or nature_count >= 2:
            dominant_theme = "nature"
            music_mood = "nature"
            default_title = "Wonders of the Natural World"
            captions_pool = [
                "Breathtaking horizons stretching to infinity",
                "The calm tranquility of the wild",
                "Sunlight weaving through ancient forests",
                "Where water meets stone in silent wonder",
                "Nature in its purest, untamed harmony",
            ]
        elif "party" in prompt_l or "celebrat" in prompt_l or celebration_count >= 1 or style == "energetic":
            dominant_theme = "celebration"
            music_mood = "celebration"
            default_title = "Unforgettable Celebration Vibes"
            captions_pool = [
                "Lighting up the night with pure energy",
                "Cherished memories with our favorite people",
                "Laughter, music, and golden sparkles",
                "Here's to tonight and all that comes next",
                "The night we will never forget",
            ]
        else:
            dominant_theme = "cinematic"
            music_mood = "cinematic"
            default_title = prompt[:40] if prompt else "Moments in Motion"
            captions_pool = [
                "Moments that define our story",
                "A visual tapestry of memories",
                "Light, emotion, and candid joy",
                "Holding on to what matters most",
                "Every picture tells a thousand tales",
            ]

        duration_per_scene = round(target_duration / max(1, total_images), 2)
        transitions = ["fade", "slide_left", "zoom_in", "slide_right"]
        effects = ["zoom_in", "zoom_out", "pan_left", "pan_right"]

        scenes: List[Dict[str, Any]] = []
        for i, a in enumerate(analyses):
            cap = a.get("suggested_caption")
            if not cap or not captions_enabled:
                cap = captions_pool[i % len(captions_pool)] if captions_enabled else ""

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
                    "overlay_title": default_title[:32] if i == 0 else None,
                }
            )

        storyboard_dict = {
            "title": default_title,
            "aspect_ratio": aspect_ratio,
            "style": style,
            "total_duration_seconds": target_duration,
            "background_music_mood": music_mood,
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
