"""Jobs API router for lifecycle management, execution, polling, and downloads."""

import uuid
from pathlib import Path
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.database import (
    create_job,
    delete_job,
    get_job,
    get_job_images,
    get_job_logs,
    list_jobs,
    update_job,
)
from app.schemas import JobCreateRequest, JobResponse, LogEntry
from app.services.storage import delete_job_files
from app.workers.job_runner import run_job_in_background

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


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
