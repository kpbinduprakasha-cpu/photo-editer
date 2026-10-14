import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.config import OUTPUT_DIR
from app.database import (
    add_job_log,
    create_job,
    delete_job,
    get_job,
    get_job_images,
    get_job_logs,
    list_jobs,
    update_job,
)
from app.schemas import JobCreateRequest, JobResponse, LogEntry
from app.services.ffmpeg_service import probe_video, render_slideshow_mp4
from app.services.storage import delete_job_files
from app.workers.job_runner import run_job_in_background

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


class StoryboardUpdateRequest(BaseModel):
    title: Optional[str] = None
    background_music_mood: Optional[str] = None
    scenes: List[Dict[str, Any]]


class CustomRenderRequest(BaseModel):
    resolution: str = "1080p"
    fps: int = 30
    aspect_ratio: Optional[str] = None
    music_mood: Optional[str] = None
    custom_audio_path: Optional[str] = None
    audio_volume: float = 0.95


@router.post("", response_model=JobResponse)
async def create_new_job(req: JobCreateRequest) -> JobResponse:
    """Create a new video generation job configuration."""
    job_id = str(uuid.uuid4())
    job = create_job(
        job_id=job_id,
        prompt=req.prompt,
        aspect_ratio=req.aspect_ratio,
        style=req.style,
        duration_seconds=req.duration_seconds,
        music_enabled=req.music_enabled,
        captions_enabled=req.captions_enabled,
    )
    return JobResponse(
        id=job["id"],
        prompt=job["prompt"],
        aspect_ratio=job["aspect_ratio"],
        style=job["style"],
        duration_seconds=job["duration_seconds"],
        music_enabled=job["music_enabled"],
        captions_enabled=job["captions_enabled"],
        status=job["status"],
        current_agent=job["current_agent"],
        progress_pct=job["progress_pct"],
        error_message=job.get("error_message"),
        storyboard=job.get("storyboard"),
        script=job.get("script"),
        output_video_path=job.get("output_video_path"),
        download_url=f"/api/jobs/{job['id']}/download" if job.get("output_video_path") else None,
        stream_url=f"/api/jobs/{job['id']}/stream" if job.get("output_video_path") else None,
        created_at=job["created_at"],
        updated_at=job["updated_at"],
        image_count=0,
    )


@router.get("", response_model=List[JobResponse])
async def get_all_jobs() -> List[JobResponse]:
    """Retrieve history of video generation jobs."""
    jobs = list_jobs(limit=50)
    result = []
    for j in jobs:
        images = get_job_images(j["id"])
        result.append(
            JobResponse(
                id=j["id"],
                prompt=j["prompt"],
                aspect_ratio=j["aspect_ratio"],
                style=j["style"],
                duration_seconds=j["duration_seconds"],
                music_enabled=bool(j.get("music_enabled", 1)),
                captions_enabled=bool(j.get("captions_enabled", 1)),
                status=j["status"],
                current_agent=j["current_agent"],
                progress_pct=j["progress_pct"],
                output_video_path=j.get("output_video_path"),
                download_url=f"/api/jobs/{j['id']}/download" if j.get("output_video_path") else None,
                stream_url=f"/api/jobs/{j['id']}/stream" if j.get("output_video_path") else None,
                created_at=j["created_at"],
                updated_at=j["updated_at"],
                image_count=len(images),
            )
        )
    return result


@router.get("/{job_id}", response_model=JobResponse)
async def get_job_details(job_id: str) -> JobResponse:
    """Retrieve detailed state, progress, and metadata for a specific job."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    images = get_job_images(job_id)
    return JobResponse(
        id=job["id"],
        prompt=job["prompt"],
        aspect_ratio=job["aspect_ratio"],
        style=job["style"],
        duration_seconds=job["duration_seconds"],
        music_enabled=job["music_enabled"],
        captions_enabled=job["captions_enabled"],
        status=job["status"],
        current_agent=job["current_agent"],
        progress_pct=job["progress_pct"],
        error_message=job.get("error_message"),
        storyboard=job.get("storyboard"),
        script=job.get("script"),
        output_video_path=job.get("output_video_path"),
        download_url=f"/api/jobs/{job_id}/download" if job.get("output_video_path") else None,
        stream_url=f"/api/jobs/{job_id}/stream" if job.get("output_video_path") else None,
        created_at=job["created_at"],
        updated_at=job["updated_at"],
        image_count=len(images),
    )


@router.post("/{job_id}/start")
async def start_job_pipeline(job_id: str) -> dict:
    """Start the 5-agent LangGraph workflow execution for this job."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    images = get_job_images(job_id)
    if not images:
        raise HTTPException(status_code=400, detail="Cannot start: Please upload at least one photograph first.")

    if job["status"] == "processing":
        return {"message": "Job is already actively processing.", "job_id": job_id}

    # Launch background worker task
    run_job_in_background(job_id)

    return {"message": "Job pipeline launched successfully.", "job_id": job_id}


@router.post("/{job_id}/retry")
async def retry_job_pipeline(job_id: str) -> dict:
    """Reset job status and retry multi-agent video generation."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    images = get_job_images(job_id)
    if not images:
        raise HTTPException(status_code=400, detail="Cannot retry: Job has no images uploaded.")

    update_job(
        job_id,
        status="pending",
        current_agent="idle",
        progress_pct=0,
        error_message=None,
    )

    run_job_in_background(job_id)

    return {"message": "Job retry initiated.", "job_id": job_id}


@router.put("/{job_id}/storyboard")
async def update_job_storyboard(job_id: str, req: StoryboardUpdateRequest) -> dict:
    """Update job storyboard scenes, durations, motion effects, and text from timeline editor."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    existing_sb = job.get("storyboard") or {}
    new_sb = {
        **existing_sb,
        "title": req.title or existing_sb.get("title", "Custom Reel"),
        "background_music_mood": req.background_music_mood or existing_sb.get("background_music_mood", "trending"),
        "scenes": req.scenes,
    }

    # Sum scene durations
    calc_duration = sum(float(sc.get("duration_seconds", 3.0)) for sc in req.scenes)
    duration_sec = max(5, int(round(calc_duration)))

    update_job(
        job_id,
        storyboard_json=new_sb,
        duration_seconds=duration_sec,
    )
    add_job_log(job_id, "Timeline Editor", f"Timeline updated: {len(req.scenes)} clips, total duration {duration_sec}s.", "info")

    return {"message": "Timeline updated successfully.", "job_id": job_id, "storyboard": new_sb}


@router.post("/{job_id}/render")
async def direct_render_job(job_id: str, req: CustomRenderRequest) -> dict:
    """Directly render customized timeline with chosen resolution, fps, and music settings."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    images = get_job_images(job_id)
    if not images:
        raise HTTPException(status_code=400, detail="Cannot render: No images uploaded for this job.")

    storyboard = job.get("storyboard") or {}
    scenes = storyboard.get("scenes") or []

    # Extract image paths
    image_lookup = {img["id"]: Path(img["file_path"]) for img in images}
    image_paths: List[Path] = []

    if scenes:
        for sc in scenes:
            img_id = sc.get("image_id")
            path = image_lookup.get(img_id)
            if not path or not path.exists():
                if sc.get("imagePath") and Path(sc["imagePath"]).exists():
                    path = Path(sc["imagePath"])
                elif sc.get("file_path") and Path(sc["file_path"]).exists():
                    path = Path(sc["file_path"])
                else:
                    path = Path(images[0]["file_path"])
            image_paths.append(path)
    else:
        image_paths = [Path(img["file_path"]) for img in images if Path(img["file_path"]).exists()]

    aspect_ratio = req.aspect_ratio or job.get("aspect_ratio", "9:16")
    music_mood = req.music_mood or storyboard.get("background_music_mood") or "trending"
    output_filename = f"reel_{job_id}.mp4"
    output_mp4_path = OUTPUT_DIR / output_filename

    update_job(job_id, status="processing", current_agent="Renderer", progress_pct=85)
    add_job_log(job_id, "Renderer", f"Direct render initiated: {req.resolution} @ {req.fps}fps, music: {music_mood}...", "info")

    custom_audio = Path(req.custom_audio_path) if req.custom_audio_path else None

    success, msg = render_slideshow_mp4(
        image_paths=image_paths,
        output_mp4=output_mp4_path,
        aspect_ratio=aspect_ratio,
        duration_per_image=float(job.get("duration_seconds", 15)) / max(1, len(image_paths)),
        with_music=job.get("music_enabled", True),
        music_mood=music_mood,
        scenes_metadata=scenes,
        resolution=req.resolution,
        fps=req.fps,
        custom_audio_path=custom_audio,
        audio_volume=req.audio_volume,
    )

    if not success or not output_mp4_path.exists() or output_mp4_path.stat().st_size == 0:
        err = f"Rendering failed: {msg}"
        update_job(job_id, status="failed", error_message=err, current_agent="Renderer (Failed)")
        add_job_log(job_id, "Renderer", err, "error")
        raise HTTPException(status_code=500, detail=err)

    probe = probe_video(output_mp4_path)
    update_job(
        job_id,
        status="completed",
        current_agent="Completed",
        progress_pct=100,
        output_video_path=str(output_mp4_path),
        error_message=None,
    )
    add_job_log(job_id, "Renderer", f"Video reel successfully rendered! Size: {round(output_mp4_path.stat().st_size/(1024*1024), 2)}MB, Duration: {probe.get('duration')}s.", "info")

    return {
        "status": "completed",
        "message": "Render completed successfully.",
        "job_id": job_id,
        "output_video_path": str(output_mp4_path),
        "stream_url": f"/api/jobs/{job_id}/stream",
        "download_url": f"/api/jobs/{job_id}/download",
        "duration": probe.get("duration"),
    }


@router.get("/{job_id}/logs", response_model=List[LogEntry])
async def get_job_execution_logs(job_id: str) -> List[LogEntry]:
    """Retrieve timestamped logs from all agents for this job."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    logs = get_job_logs(job_id, limit=200)
    return [
        LogEntry(
            id=l["id"],
            agent_name=l["agent_name"],
            level=l["level"],
            message=l["message"],
            timestamp=l["timestamp"],
        )
        for l in logs
    ]


@router.get("/{job_id}/stream")
@router.head("/{job_id}/stream")
async def stream_rendered_video(job_id: str):
    """Stream the compiled MP4 video reel inline with partial content (Range) support for browsers."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    output_path_str = job.get("output_video_path")
    if not output_path_str:
        raise HTTPException(status_code=404, detail="Video reel has not been generated yet.")

    video_file = Path(output_path_str)
    if not video_file.exists() or video_file.stat().st_size == 0:
        raise HTTPException(status_code=404, detail="Rendered video file is missing on server.")

    return FileResponse(
        path=str(video_file),
        media_type="video/mp4",
        headers={
            "Accept-Ranges": "bytes",
            "Content-Disposition": "inline",
            "Cache-Control": "public, max-age=3600",
        },
    )


@router.get("/{job_id}/download")
@router.head("/{job_id}/download")
async def download_rendered_video(job_id: str):
    """Stream or download the compiled MP4 video reel."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    output_path_str = job.get("output_video_path")
    if not output_path_str:
        raise HTTPException(status_code=404, detail="Video reel has not been generated yet.")

    video_file = Path(output_path_str)
    if not video_file.exists() or video_file.stat().st_size == 0:
        raise HTTPException(status_code=404, detail="Rendered video file is missing on server.")

    return FileResponse(
        path=str(video_file),
        media_type="video/mp4",
        filename=f"FotoOwl_Reel_{job_id[:8]}.mp4",
    )


@router.delete("/{job_id}")
async def delete_job_and_assets(job_id: str) -> dict:
    """Delete a job, its uploaded images, and output video."""
    delete_job_files(job_id)
    deleted = delete_job(job_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Job not found.")
    return {"message": "Job and all associated assets successfully deleted.", "job_id": job_id}
