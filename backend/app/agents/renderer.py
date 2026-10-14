"""Agent 5: Renderer Agent.

Renders the validated composition to MP4, monitors progress, validates output playability via FFprobe,
and returns verified paths and download endpoints.
"""

import logging
import os
import subprocess
from pathlib import Path
from typing import Any, Dict, List

from app.agents.state import VideoGenerationState
from app.config import OUTPUT_DIR, REMOTION_DIR, RENDER_TIMEOUT_SECONDS, TEMP_DIR
from app.database import add_job_log, update_job
from app.services.ffmpeg_service import probe_video, render_slideshow_mp4

logger = logging.getLogger("fotoowl.agent.renderer")


async def run_renderer(state: VideoGenerationState) -> Dict[str, Any]:
    """Execute Renderer Agent node in LangGraph workflow."""
    job_id = state["job_id"]
    compilation_success = state.get("compilation_success", False)
    script = state.get("script") or {}
    aspect_ratio = state.get("aspect_ratio", "9:16")
    music_enabled = state.get("music_enabled", True)

    if not compilation_success:
        err = "Renderer aborted: Compilation did not succeed or left unresolvable errors."
        add_job_log(job_id, "Renderer", err, "error")
        update_job(job_id, status="failed", error_message=err, current_agent="Renderer (Aborted)")
        return {
            "render_success": False,
            "error_message": err,
            "current_agent": "Renderer (Aborted)",
        }

    add_job_log(job_id, "Renderer", "Initiating rendering pipeline...", "info")
    update_job(job_id, current_agent="Renderer", progress_pct=85)

    output_filename = f"reel_{job_id}.mp4"
    output_mp4_path = OUTPUT_DIR / output_filename

    # Extract scene image paths with robust fallback to state images
    scenes = script.get("scenes", [])
    image_paths: List[Path] = [Path(sc["imagePath"]) for sc in scenes if "imagePath" in sc and Path(sc["imagePath"]).exists()]
    if not image_paths:
        raw_images = state.get("images", [])
        image_paths = [Path(img["file_path"]) for img in raw_images if "file_path" in img and Path(img["file_path"]).exists()]

    if not image_paths:
        err = "Renderer aborted: No valid, readable photo files found on disk for this job."
        add_job_log(job_id, "Renderer", err, "error")
        update_job(job_id, status="failed", error_message=err, current_agent="Renderer (Missing Photos)")
        return {
            "render_success": False,
            "error_message": err,
            "current_agent": "Renderer (Missing Photos)",
        }

    # Calculate average duration per scene
    total_frames = script.get("duration_in_frames", 450)
    fps = script.get("fps", 30)
    total_duration_sec = total_frames / max(1, fps)
    duration_per_image = max(1.5, total_duration_sec / max(1, len(image_paths)))

    rendered_ok = False
    render_method = "Native FFmpeg Compositor"
    storyboard = state.get("storyboard") or {}
    music_mood = storyboard.get("background_music_mood") or state.get("style") or "cinematic"

    # Production primary engine: Native FFmpeg Compositor
    # Directly reads photos from disk (no browser sandboxing), scales to full bleed,
    # adds Ken Burns zoompan, and mixes studio-quality AAC audio matching the mood.
    use_remotion_explicit = os.getenv("USE_REMOTION", "0") == "1"

    if not use_remotion_explicit:
        add_job_log(
            job_id,
            "Renderer",
            f"Rendering HD video with {render_method} (Theme/Audio: '{music_mood}', Photos: {len(image_paths)}, Ratio: {aspect_ratio})...",
            "info",
        )
        success, msg = render_slideshow_mp4(
            image_paths=image_paths,
            output_mp4=output_mp4_path,
            aspect_ratio=aspect_ratio,
            duration_per_image=duration_per_image,
            with_music=music_enabled,
            music_mood=music_mood,
            scenes_metadata=scenes,
        )
        if success and output_mp4_path.exists() and output_mp4_path.stat().st_size > 0:
            rendered_ok = True
            add_job_log(job_id, "Renderer", f"Native FFmpeg Compositor created video reel successfully in {(duration_per_image * len(image_paths)):.1f}s.", "info")
        else:
            add_job_log(job_id, "Renderer", f"Native FFmpeg render note: {msg}", "warning")

    # Optional fallback to Remotion if explicitly requested or if native failed
    if not rendered_ok:
        remotion_render_script = REMOTION_DIR / "render.js"
        job_props_file = TEMP_DIR / job_id / "composition_props.json"
        if remotion_render_script.exists() and job_props_file.exists():
            render_method = "Remotion CLI"
            add_job_log(job_id, "Renderer", "Attempting Remotion React compositor...", "info")
            try:
                cmd = [
                    "node",
                    str(remotion_render_script),
                    "--props", str(job_props_file),
                    "--output", str(output_mp4_path),
                ]
                res = subprocess.run(
                    cmd,
                    cwd=str(REMOTION_DIR),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                    timeout=RENDER_TIMEOUT_SECONDS,
                )
                if res.returncode == 0 and output_mp4_path.exists() and output_mp4_path.stat().st_size > 0:
                    rendered_ok = True
                    add_job_log(job_id, "Renderer", "Remotion composition rendered successfully.", "info")
            except Exception as e:
                add_job_log(job_id, "Renderer", f"Remotion render error: {str(e)}", "error")

    if not rendered_ok:
        err = "All rendering engines failed to produce a valid MP4 file."
        add_job_log(job_id, "Renderer", err, "error")
        update_job(job_id, status="failed", error_message=err, current_agent="Renderer (Failed)")
        return {
            "render_success": False,
            "error_message": err,
            "current_agent": "Renderer (Failed)",
        }

    # Validate output playability via FFprobe
    add_job_log(job_id, "Renderer", "Validating output MP4 integrity and stream playability via FFprobe...", "info")
    probe_result = probe_video(output_mp4_path)

    if not probe_result.get("valid", False):
        err = f"Output file verification failed: {probe_result.get('error', 'Unknown probe error')}"
        add_job_log(job_id, "Renderer", err, "error")
        update_job(job_id, status="failed", error_message=err, current_agent="Renderer (Corrupted)")
        return {
            "render_success": False,
            "error_message": err,
            "current_agent": "Renderer (Corrupted)",
        }

    # Success!
    download_url = f"/api/jobs/{job_id}/download"
    update_job(
        job_id,
        status="completed",
        current_agent="Completed",
        progress_pct=100,
        output_video_path=str(output_mp4_path),
        error_message=None,
    )

    file_size_mb = round(output_mp4_path.stat().st_size / (1024 * 1024), 2)
    add_job_log(
        job_id,
        "Renderer",
        f"Video reel successfully created! Duration: {probe_result.get('duration', 0)}s, Size: {file_size_mb} MB, Method: {render_method}.",
        "info",
    )

    return {
        "render_success": True,
        "output_video_path": str(output_mp4_path),
        "download_url": download_url,
        "current_agent": "Completed",
    }
