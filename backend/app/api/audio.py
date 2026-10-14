"""Audio and Music API endpoints (Module 5)."""

import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.config import STORAGE_DIR

router = APIRouter(prefix="/api/audio", tags=["Audio"])

AUDIO_ASSETS_DIR = Path(__file__).resolve().parent.parent / "audio_assets"
AUDIO_UPLOADS_DIR = STORAGE_DIR / "audio_uploads"
AUDIO_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

STUDIO_CATALOG: List[Dict[str, Any]] = [
    {
        "id": "trending",
        "title": "💥 Instagram Trending 128 BPM Beat",
        "category": "social",
        "genre": "Trap / Phonk / 128 BPM",
        "mood": "trending",
        "filename": "instagram_trending.wav",
        "description": "Punchy kick, snap snare, driving 808 sub-bass, and arpeggiated synth hook. Perfect for viral Reels & TikToks.",
        "bpm": 128,
        "license": "FotoOwl Studio Original (Royalty-Free)",
    },
    {
        "id": "lofi",
        "title": "☕ Instagram Lo-Fi Aesthetic",
        "category": "aesthetic",
        "genre": "Lo-Fi Chillhop / 85 BPM",
        "mood": "lofi",
        "filename": "instagram_lofi.wav",
        "description": "Smooth jazz Rhodes chords, vinyl crackle, and laid-back beat. Ideal for morning vlogs and coffee aesthetics.",
        "bpm": 85,
        "license": "FotoOwl Studio Original (Royalty-Free)",
    },
    {
        "id": "wedding",
        "title": "💒 Romantic Wedding & Love Ballad",
        "category": "wedding",
        "genre": "Acoustic Ballad / Piano & Harp",
        "mood": "wedding",
        "filename": "wedding.wav",
        "description": "Tender acoustic harp arpeggio and emotional grand piano harmonies for sacred vows and love moments.",
        "bpm": 72,
        "license": "FotoOwl Studio Original (Royalty-Free)",
    },
    {
        "id": "nature",
        "title": "🌲 Nature & Adventure Harmony",
        "category": "nature",
        "genre": "Pastoral Folk / Acoustic Guitar",
        "mood": "nature",
        "filename": "nature.wav",
        "description": "Serene acoustic guitar picking and airy harmonics for mountains, lakes, and breathtaking landscapes.",
        "bpm": 90,
        "license": "FotoOwl Studio Original (Royalty-Free)",
    },
    {
        "id": "celebration",
        "title": "🎉 Birthday & Celebration Party",
        "category": "celebration",
        "genre": "Upbeat Dance-Pop / 124 BPM",
        "mood": "celebration",
        "filename": "celebration.wav",
        "description": "Syncopated rhythmic bass pulses, festive claps, and energetic brass stabs for celebrations.",
        "bpm": 124,
        "license": "FotoOwl Studio Original (Royalty-Free)",
    },
    {
        "id": "cinematic",
        "title": "🎬 Cinematic Orchestral Score",
        "category": "cinematic",
        "genre": "Orchestral Trailer Crescendo",
        "mood": "cinematic",
        "filename": "cinematic.wav",
        "description": "Deep sub drone and brass harmonic swell for dramatic landscapes and photo montages.",
        "bpm": 60,
        "license": "FotoOwl Studio Original (Royalty-Free)",
    },
]


@router.get("/catalog", response_model=List[Dict[str, Any]])
def get_audio_catalog():
    """Retrieve catalog of studio-grade soundtrack tracks."""
    catalog = []
    for item in STUDIO_CATALOG:
        catalog.append(
            {
                **item,
                "preview_url": f"/api/audio/preview/{item['filename']}",
            }
        )
    return catalog


@router.get("/preview/{filename}")
def stream_audio_preview(filename: str):
    """Stream an audio file for in-browser playback."""
    clean_name = os.path.basename(filename)
    audio_path = AUDIO_ASSETS_DIR / clean_name

    if not audio_path.exists():
        # Check custom uploads
        audio_path = AUDIO_UPLOADS_DIR / clean_name

    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found.")

    ext = audio_path.suffix.lower()
    media_type = "audio/wav" if ext == ".wav" else "audio/mpeg" if ext == ".mp3" else "audio/aac"

    return FileResponse(
        path=str(audio_path),
        media_type=media_type,
        headers={"Accept-Ranges": "bytes", "Content-Disposition": "inline"},
    )


@router.post("/upload")
async def upload_custom_audio(
    file: UploadFile = File(...),
    job_id: Optional[str] = Form(None),
):
    """Upload custom background music file (MP3, WAV, AAC, M4A)."""
    allowed_exts = {".mp3", ".wav", ".aac", ".m4a", ".ogg"}
    file_ext = Path(file.filename or "").suffix.lower()

    if file_ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format '{file_ext}'. Allowed: {', '.join(allowed_exts)}",
        )

    # Save to audio uploads
    prefix = f"{job_id}_" if job_id else ""
    safe_filename = f"{prefix}{Path(file.filename or 'track').stem}{file_ext}"
    target_path = AUDIO_UPLOADS_DIR / safe_filename

    content = await file.read()
    if len(content) > 30 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio file exceeds 30 MB limit.")

    with open(target_path, "wb") as f:
        f.write(content)

    return {
        "message": "Custom audio uploaded successfully.",
        "filename": safe_filename,
        "preview_url": f"/api/audio/preview/{safe_filename}",
        "file_path": str(target_path),
    }
