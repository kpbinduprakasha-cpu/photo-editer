"""Uploads API endpoint for receiving and managing photographs."""

from pathlib import Path
from typing import List
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.database import (
    add_job_image,
    add_job_log,
    get_db_connection,
    get_job,
    get_job_images,
)
from app.schemas import ImageItem
from app.services.storage import delete_job_files, save_uploaded_image

router = APIRouter(prefix="/api/jobs", tags=["Uploads"])


@router.post("/{job_id}/upload", response_model=List[ImageItem])
async def upload_photos(job_id: str, files: List[UploadFile] = File(...)) -> List[ImageItem]:
    """Upload one or more photos for a specific video generation job."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    existing_images = get_job_images(job_id)
    current_index = len(existing_images)

    uploaded_items: List[ImageItem] = []

    for file in files:
        image_id, stored_filename, full_path, file_size, width, height = await save_uploaded_image(file, job_id)

        add_job_image(
            image_id=image_id,
            job_id=job_id,
            original_filename=file.filename or stored_filename,
            stored_filename=stored_filename,
            file_path=str(full_path),
            file_size=file_size,
            width=width,
            height=height,
            mime_type=file.content_type or "image/jpeg",
            sequence_index=current_index,
        )

        current_index += 1

        uploaded_items.append(
            ImageItem(
                id=image_id,
                job_id=job_id,
                original_filename=file.filename or stored_filename,
                stored_filename=stored_filename,
                file_size=file_size,
                width=width,
                height=height,
                mime_type=file.content_type or "image/jpeg",
                sequence_index=current_index - 1,
                preview_url=f"/storage/uploads/{stored_filename}",
            )
        )

    add_job_log(
        job_id,
        "System",
        f"Uploaded {len(files)} image(s) successfully.",
        "info",
    )

    return uploaded_items


@router.get("/{job_id}/images", response_model=List[ImageItem])
async def list_job_images(job_id: str) -> List[ImageItem]:
    """List all uploaded images for a job."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    images = get_job_images(job_id)
    return [
        ImageItem(
            id=img["id"],
            job_id=img["job_id"],
            original_filename=img["original_filename"],
            stored_filename=img["stored_filename"],
            file_size=img["file_size"],
            width=img.get("width"),
            height=img.get("height"),
            mime_type=img.get("mime_type", "image/jpeg"),
            sequence_index=img.get("sequence_index", 0),
            preview_url=f"/storage/uploads/{img['stored_filename']}",
            analysis=img.get("analysis"),
        )
        for img in images
    ]


@router.delete("/{job_id}/images/{image_id}")
async def delete_job_image(job_id: str, image_id: str) -> dict:
    """Delete an individual uploaded image."""
    with get_db_connection() as conn:
        row = conn.execute(
            "SELECT file_path FROM job_images WHERE id = ? AND job_id = ?",
            (image_id, job_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Image record not found.")

        file_path = Path(row["file_path"])
        if file_path.exists():
            file_path.unlink()

        conn.execute("DELETE FROM job_images WHERE id = ?", (image_id,))
        conn.commit()

    return {"message": "Image deleted successfully", "image_id": image_id}
