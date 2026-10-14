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

    # Extract scene image paths
    scenes = script.get("scenes", [])
    image_paths: List[Path] = [Path(sc["imagePath"]) for sc in scenes if "imagePath" in sc]

    # Calculate average duration per scene
    total_frames = script.get("duration_in_frames", 450)
    fps = script.get("fps", 30)
    total_duration_sec = total_frames / max(1, fps)
    duration_per_image = total_duration_sec / max(1, len(image_paths))

    rendered_ok = False
    render_method = "Remotion CLI"

    # Attempt Remotion render if render script exists
    remotion_render_script = REMOTION_DIR / "render.js"
    job_props_file = TEMP_DIR / job_id / "composition_props.json"

    if remotion_render_script.exists() and job_props_file.exists():
        add_job_log(job_id, "Renderer", "Executing Remotion React compositor...", "info")
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
            else:
                add_job_log(
                    job_id,
                    "Renderer",
                    f"Remotion CLI note: falling back to high-performance FFmpeg compositor. ({res.stderr[:200] if res.stderr else 'code ' + str(res.returncode)})",
                    "info",
                )
        except Exception as e:
            add_job_log(
                job_id,
                "Renderer",
                f"Remotion process note: switching to native FFmpeg renderer: {str(e)}",
                "info",
            )

    # If Remotion didn't render (or wasn't configured), use the native FFmpeg slideshow renderer
    if not rendered_ok:
        render_method = "Native FFmpeg Compositor"
        add_job_log(job_id, "Renderer", f"Rendering with {render_method}...", "info")
        success, msg = render_slideshow_mp4(
            image_paths=image_paths,
            output_mp4=output_mp4_path,
            aspect_ratio=aspect_ratio,
            duration_per_image=duration_per_image,
            with_music=music_enabled,
            scenes_metadata=scenes,
        )
        if not success:
            err = f"Rendering engine failed: {msg}"
            add_job_log(job_id, "Renderer", err, "error")
            update_job(job_id, status="failed", error_message=err, current_agent="Renderer (Failed)")
            return {
                "render_success": False,
                "error_message": err,
                "current_agent": "Renderer (Failed)",
            }
        rendered_ok = True

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
