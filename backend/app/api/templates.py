"""Templates API endpoints (Module 8)."""

import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import create_job, get_job, get_job_images, update_job
from app.services.templates_service import get_template_by_id, list_templates

router = APIRouter(prefix="/api/templates", tags=["Templates"])


class ApplyTemplateRequest(BaseModel):
    job_id: Optional[str] = None
    prompt: Optional[str] = None


@router.get("", response_model=List[Dict[str, Any]])
def get_all_templates():
    """Retrieve all available video templates."""
    return list_templates()


@router.get("/{template_id}", response_model=Dict[str, Any])
def get_template(template_id: str):
    """Retrieve details for a specific template."""
    tmpl = get_template_by_id(template_id)
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found.")
    return tmpl


@router.post("/{template_id}/apply")
def apply_template(template_id: str, payload: Optional[ApplyTemplateRequest] = None):
    """Apply template settings (aspect ratio, duration, music, pacing) to a job."""
    if payload is None:
        payload = ApplyTemplateRequest()
    tmpl = get_template_by_id(template_id)
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found.")

    job_id = payload.job_id
    if job_id:
        job = get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found.")
    else:
        # Create a new job with template settings
        prompt = payload.prompt or tmpl["title"]
        job_id = str(uuid.uuid4())
        create_job(
            job_id=job_id,
            prompt=prompt,
            aspect_ratio=tmpl["aspect_ratio"],
            style=tmpl["category"],
            duration_seconds=tmpl["duration_seconds"],
            music_enabled=True,
            captions_enabled=True,
        )

    # Update job with template specifics
    update_job(
        job_id,
        aspect_ratio=tmpl["aspect_ratio"],
        duration_seconds=tmpl["duration_seconds"],
        style=tmpl["category"],
    )

    return {
        "message": f"Template '{tmpl['title']}' applied successfully.",
        "job_id": job_id,
        "template": tmpl,
    }
