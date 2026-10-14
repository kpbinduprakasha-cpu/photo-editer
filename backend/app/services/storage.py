"""Secure file storage, path traversal protection, and image validation."""

import os
import re
import uuid
from pathlib import Path
from typing import Tuple
from fastapi import HTTPException, UploadFile
from PIL import Image

from app.config import (
    ALLOWED_IMAGE_EXTENSIONS,
    MAX_FILE_SIZE_BYTES,
    OUTPUT_DIR,
    TEMP_DIR,
    UPLOAD_DIR,
)


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent directory traversal and invalid characters."""
    # Strip any directory path components
    basename = os.path.basename(filename)
    # Remove any dangerous characters, keep only alphanumerics, underscores, hyphens, and dots
    sanitized = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", basename)
    # Truncate length
    if len(sanitized) > 100:
        base, ext = os.path.splitext(sanitized)
        sanitized = base[: 100 - len(ext)] + ext
    return sanitized or "uploaded_image.jpg"


def validate_path_safety(base_dir: Path, target_path: Path) -> None:
    """Ensure target_path is strictly within base_dir to prevent path traversal."""
    resolved_base = base_dir.resolve()
    resolved_target = target_path.resolve()
    try:
        resolved_target.relative_to(resolved_base)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid path: Path traversal detected.")


async def save_uploaded_image(file: UploadFile, job_id: str) -> Tuple[str, str, Path, int, int, int]:
    """Validate and safely persist an uploaded photo to storage.

    Returns:
        (image_id, stored_filename, full_path, file_size, width, height)
    """
    orig_name = sanitize_filename(file.filename or "image.jpg")
    ext = os.path.splitext(orig_name)[1].lower()

    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}",
        )

    # Read content with size check
    content = await file.read()
    file_size = len(content)

    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024*1024)} MB",
        )

    if file_size == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Generate a unique secure stored filename
    image_id = str(uuid.uuid4())
    stored_filename = f"{job_id}_{image_id}_{orig_name}"
    dest_path = UPLOAD_DIR / stored_filename

    validate_path_safety(UPLOAD_DIR, dest_path)

    # Write file to disk
    with open(dest_path, "wb") as f:
        f.write(content)

    # Validate image integrity and extract dimensions via PIL
    try:
        with Image.open(dest_path) as img:
            img.verify()
        # Reopen to read dimensions
        with Image.open(dest_path) as img:
            width, height = img.size
    except Exception as e:
        if dest_path.exists():
            dest_path.unlink()
        raise HTTPException(status_code=400, detail=f"Invalid or corrupted image file: {str(e)}")

    return image_id, stored_filename, dest_path, file_size, width, height


def delete_job_files(job_id: str) -> None:
    """Clean up uploaded images and outputs associated with a job."""
    for pattern in [f"{job_id}_*", f"output_{job_id}.mp4"]:
        for directory in [UPLOAD_DIR, OUTPUT_DIR, TEMP_DIR]:
            for match in directory.glob(pattern):
                try:
                    if match.is_file():
                        match.unlink()
                    elif match.is_dir():
                        for sub in match.glob("*"):
                            sub.unlink()
                        match.rmdir()
                except Exception:
                    pass
