"""Local background worker executing LangGraph multi-agent pipelines."""

import asyncio
import logging
from typing import Any, Dict

from app.agents.graph import video_agent_pipeline
from app.agents.state import VideoGenerationState
from app.database import add_job_log, get_job, get_job_images, update_job

logger = logging.getLogger("fotoowl.worker")


async def execute_job(job_id: str) -> None:
    """Execute the multi-agent video generation pipeline for a given job ID."""
    job = get_job(job_id)
    if not job:
        logger.error(f"Cannot execute job {job_id}: not found in database.")
        return

    images = get_job_images(job_id)
    if not images:
        update_job(
            job_id,
            status="failed",
            error_message="Cannot generate video: No images uploaded for this job.",
            current_agent="Error",
        )
        add_job_log(job_id, "System", "Aborted: No images uploaded for this job.", "error")
        return

    update_job(job_id, status="processing", current_agent="Image Analyser", progress_pct=5)
    add_job_log(job_id, "System", f"Pipeline initiated with {len(images)} uploaded photos.", "info")

    initial_state: VideoGenerationState = {
        "job_id": job_id,
        "prompt": job.get("prompt", ""),
        "aspect_ratio": job.get("aspect_ratio", "9:16"),
        "style": job.get("style", "cinematic"),
        "duration_seconds": int(job.get("duration_seconds", 15)),
        "music_enabled": bool(job.get("music_enabled", True)),
        "captions_enabled": bool(job.get("captions_enabled", True)),
        "images": images,
        "analyses": [],
        "storyboard": None,
        "script": None,
        "compilation_success": False,
        "compilation_errors": [],
        "repair_attempts": 0,
        "render_success": False,
        "output_video_path": None,
        "download_url": None,
        "error_message": None,
        "current_agent": "Image Analyser",
    }

    try:
        final_state = await video_agent_pipeline.ainvoke(initial_state)

        if not final_state.get("render_success", False):
            err = final_state.get("error_message") or "Pipeline halted before video rendering was completed."
            update_job(job_id, status="failed", error_message=err)
            add_job_log(job_id, "System", f"Job failed: {err}", "error")
        else:
            add_job_log(job_id, "System", "Multi-agent generation pipeline completed successfully.", "info")

    except Exception as e:
        logger.exception(f"Unhandled pipeline exception for job {job_id}: {e}")
        err_msg = f"Fatal pipeline error: {str(e)}"
        update_job(job_id, status="failed", error_message=err_msg, current_agent="System Error")
        add_job_log(job_id, "System", err_msg, "error")


def run_job_in_background(job_id: str) -> None:
    """Schedule the async job execution on the active event loop."""
    asyncio.create_task(execute_job(job_id))
