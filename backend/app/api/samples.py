"""API endpoints for exploring and instantly applying curated sample packs."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.schemas import JobResponse, ImageItem
from app.services.sample_packs import get_all_sample_packs, load_sample_pack_into_job

router = APIRouter(prefix="/api/sample-packs", tags=["Sample Packs"])


class ApplySamplePackRequest(BaseModel):
    job_id: Optional[str] = None
    prompt: Optional[str] = None


@router.get("")
async def list_sample_packs() -> List[Dict[str, Any]]:
    """Return all pre-loaded sample photo presets with previews and suggested themes."""
    return get_all_sample_packs()


@router.post("/{pack_id}/apply")
async def apply_sample_pack(pack_id: str, req: Optional[ApplySamplePackRequest] = None) -> Dict[str, Any]:
    """Copy sample pack photos into a job without requiring upload over the network."""
    job_id = req.job_id if req else None
    prompt = req.prompt if req else None

    try:
        result = load_sample_pack_into_job(pack_id=pack_id, job_id=job_id, prompt=prompt)
        job = result["job"]
        return {
            "message": f"Sample pack '{pack_id}' loaded successfully.",
            "job": JobResponse(
                id=job["id"],
                prompt=job["prompt"],
                aspect_ratio=job["aspect_ratio"],
                style=job["style"],
                duration_seconds=job["duration_seconds"],
                music_enabled=bool(job.get("music_enabled", 1)),
                captions_enabled=bool(job.get("captions_enabled", 1)),
                status=job["status"],
                current_agent=job["current_agent"],
                progress_pct=job["progress_pct"],
                error_message=job.get("error_message"),
                storyboard=job.get("storyboard"),
                script=job.get("script"),
                output_video_path=job.get("output_video_path"),
                download_url=f"/api/jobs/{job['id']}/download" if job.get("output_video_path") else None,
                created_at=job["created_at"],
                updated_at=job["updated_at"],
                image_count=len(result["images"]),
            ),
            "pack": result["pack"],
            "images": [ImageItem(**img) for img in result["images"]],
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply sample pack: {str(e)}")
