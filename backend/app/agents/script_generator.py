"""Agent 3: Script Generator Agent.

Transforms the validated storyboard into a safe Remotion composition schema and props file,
calculating exact frame timings, zoom/pan matrices, and subtitle overlays.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List

from app.agents.state import VideoGenerationState
from app.config import REMOTION_DIR, TEMP_DIR
from app.database import add_job_log, update_job
from app.schemas import RemotionScriptConfig

logger = logging.getLogger("fotoowl.agent.script_generator")


async def run_script_generator(state: VideoGenerationState) -> Dict[str, Any]:
    """Execute Script Generator Agent node in LangGraph workflow."""
    job_id = state["job_id"]
    storyboard = state.get("storyboard")
    images = state.get("images", [])
    aspect_ratio = state.get("aspect_ratio", "9:16")
    music_enabled = state.get("music_enabled", True)
    captions_enabled = state.get("captions_enabled", True)

    add_job_log(job_id, "Script Generator", "Translating storyboard to Remotion composition specifications...", "info")
    update_job(job_id, current_agent="Script Generator", progress_pct=55)

    if not storyboard or not storyboard.get("scenes"):
        raise ValueError("Cannot generate script: missing or empty storyboard.")

    # Match dimensions to aspect ratio
    if aspect_ratio == "16:9":
        width, height = 1920, 1080
    elif aspect_ratio == "1:1":
        width, height = 1080, 1080
    else:  # 9:16
        width, height = 1080, 1920

    fps = 30
    image_lookup = {img["id"]: img for img in images}

    composition_scenes: List[Dict[str, Any]] = []
    total_frames = 0

    for idx, scene in enumerate(storyboard["scenes"]):
        img_id = scene["image_id"]
        img_record = image_lookup.get(img_id) or (images[idx % len(images)] if images else {})
        duration_sec = float(scene.get("duration_seconds", 3.0))
        scene_frames = max(15, int(round(duration_sec * fps)))

        img_file_path = img_record.get("file_path", "")

        composition_scenes.append(
            {
                "sceneIndex": idx,
                "imageId": img_id,
                "filename": scene.get("filename", img_record.get("original_filename", "")),
                "imagePath": img_file_path,
                "durationInFrames": scene_frames,
                "startFrame": total_frames,
                "caption": scene.get("caption", "") if captions_enabled else "",
                "transition": scene.get("transition", "fade"),
                "kenBurnsEffect": scene.get("ken_burns_effect", "zoom_in"),
                "overlayTitle": scene.get("overlay_title", ""),
            }
        )
        total_frames += scene_frames

    script_config = RemotionScriptConfig(
        composition_id="ReelComposition",
        width=width,
        height=height,
        fps=fps,
        duration_in_frames=total_frames,
        title=storyboard.get("title", "FotoOwl Reel"),
        aspect_ratio=aspect_ratio,
        scenes=composition_scenes,
        music_enabled=music_enabled,
        captions_enabled=captions_enabled,
    )

    script_data = script_config.model_dump()

    # Save composition props to job temp file
    job_temp_dir = TEMP_DIR / job_id
    job_temp_dir.mkdir(parents=True, exist_ok=True)
    props_file = job_temp_dir / "composition_props.json"

    with open(props_file, "w", encoding="utf-8") as f:
        json.dump(script_data, f, indent=2)

    update_job(job_id, script_json=script_data, progress_pct=65)
    add_job_log(
        job_id,
        "Script Generator",
        f"Remotion script generated successfully: {len(composition_scenes)} scenes, {total_frames} frames ({round(total_frames/fps, 1)}s) @ {fps}fps.",
        "info",
    )

    return {
        "script": script_data,
        "current_agent": "Compiler & Fixer",
    }
