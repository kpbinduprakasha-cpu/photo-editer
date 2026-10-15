"""Audio and Music API endpoints (Module 5) with Instagram-style music library."""

import json
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
CUSTOM_TRACKS_FILE = AUDIO_UPLOADS_DIR / "custom_tracks.json"

STUDIO_CATALOG: List[Dict[str, Any]] = [
    {
        "id": "golden_hour",
        "title": "golden hour (Piano Instrumental)",
        "artist": "Chilled Pig",
        "duration_text": "1:51",
        "category": "wedding",
        "genre": "Piano Instrumental",
        "mood": "wedding",
        "filename": "golden_hour.wav",
        "description": "Tender emotional piano arpeggios with golden-hour warmth and romantic cadence.",
        "bpm": 84,
        "trending": True,
        "tab": "trending",
        "cover_gradient": "from-amber-500 to-orange-600",
        "license": "Royalty-Free Instagram Audio Preset",
    },
    {
        "id": "inspire_the_world",
        "title": "Inspire The World",
        "artist": "DensoMusic",
        "duration_text": "2:43",
        "category": "nature",
        "genre": "Inspirational Cinematic",
        "mood": "nature",
        "filename": "inspire_the_world.wav",
        "description": "Uplifting acoustic strings and melodic swells for epic landscape vistas and reels.",
        "bpm": 92,
        "trending": True,
        "tab": "for_you",
        "cover_gradient": "from-blue-600 to-indigo-800",
        "license": "Royalty-Free Instagram Audio Preset",
    },
    {
        "id": "let_him_cook",
        "title": "Let Him Cook",
        "artist": "XNIMXS",
        "duration_text": "1:18",
        "category": "social",
        "genre": "Drift Phonk / Bass Drop",
        "mood": "trending",
        "filename": "let_him_cook.wav",
        "description": "130 BPM energetic drift phonk, punchy 808 sub-bass, and rapid viral reel cut tempo.",
        "bpm": 130,
        "trending": True,
        "tab": "trending",
        "cover_gradient": "from-red-600 to-rose-900",
        "license": "Royalty-Free Instagram Audio Preset",
    },
    {
        "id": "roi_instrumental",
        "title": "Roi (Instrumental)",
        "artist": "Jonny Red",
        "duration_text": "4:31",
        "category": "aesthetic",
        "genre": "French Ambient Synth",
        "mood": "lofi",
        "filename": "roi_instrumental.wav",
        "description": "Atmospheric French ambient electronic chords with nostalgic reverb.",
        "bpm": 95,
        "trending": False,
        "tab": "for_you",
        "cover_gradient": "from-purple-600 to-pink-700",
        "license": "Royalty-Free Instagram Audio Preset",
    },
    {
        "id": "roi_slowed",
        "title": "Roi (Slowed)",
        "artist": "HENRYSTORY",
        "duration_text": "3:28",
        "category": "aesthetic",
        "genre": "Slowed + Reverb",
        "mood": "lofi",
        "filename": "roi_slowed.wav",
        "description": "Slowed and reverbed dreamy texture with vinyl crackle and chillhop sub.",
        "bpm": 70,
        "trending": True,
        "tab": "trending",
        "cover_gradient": "from-emerald-700 to-teal-900",
        "license": "Royalty-Free Instagram Audio Preset",
    },
    {
        "id": "veena_dreams",
        "title": "Veena Dreams (Carnatic Classical Instrumental)",
        "artist": "Arryene",
        "duration_text": "3:08",
        "category": "devotional",
        "genre": "Carnatic Classical Instrumental",
        "mood": "wedding",
        "filename": "veena_dreams.wav",
        "description": "Pure Carnatic Veena strings and rhythmic devotional percussion.",
        "bpm": 96,
        "trending": True,
        "tab": "for_you",
        "cover_gradient": "from-yellow-600 to-orange-800",
        "license": "Royalty-Free Indian Classical Preset",
    },
    {
        "id": "aarohanam",
        "title": "Aarohanam",
        "artist": "Iravu, Abhiram Lolla",
        "duration_text": "3:31",
        "category": "devotional",
        "genre": "Carnatic Acoustic Raga",
        "mood": "nature",
        "filename": "aarohanam.wav",
        "description": "Soothing Indian classical flute and violin harmonies for sunrises and temples.",
        "bpm": 80,
        "trending": False,
        "tab": "for_you",
        "cover_gradient": "from-amber-600 to-yellow-800",
        "license": "Royalty-Free Indian Classical Preset",
    },
    {
        "id": "durgashtakam",
        "title": "Durgashtakam",
        "artist": "Divine Echoes, Shruti Bujarbaruah",
        "duration_text": "4:33",
        "category": "devotional",
        "genre": "Spiritual Sacred Chants",
        "mood": "cinematic",
        "filename": "durgashtakam.wav",
        "description": "Sacred devotional rhythm with temple chimes and majestic spiritual energy.",
        "bpm": 108,
        "trending": True,
        "tab": "trending",
        "cover_gradient": "from-red-700 to-amber-700",
        "license": "Royalty-Free Devotional Preset",
    },
    {
        "id": "the_all_seeing_eye",
        "title": "The All Seeing Eye",
        "artist": "Maneesh de Moor",
        "duration_text": "7:43",
        "category": "devotional",
        "genre": "Sacred Sound Healing",
        "mood": "cinematic",
        "filename": "the_all_seeing_eye.wav",
        "description": "Tibetan singing bowl harmonics and continuous ambient drone for tranquil moments.",
        "bpm": 55,
        "trending": False,
        "tab": "for_you",
        "cover_gradient": "from-cyan-500 to-blue-700",
        "license": "Royalty-Free Meditative Preset",
    },
    {
        "id": "dreamcore",
        "title": "Dreamcore",
        "artist": "Postshee",
        "duration_text": "1:51",
        "category": "aesthetic",
        "genre": "Ethereal Dreamwave",
        "mood": "lofi",
        "filename": "dreamcore.wav",
        "description": "Nostalgic synth pad chords with surreal analog tape modulation.",
        "bpm": 82,
        "trending": False,
        "tab": "for_you",
        "cover_gradient": "from-slate-700 to-zinc-900",
        "license": "Royalty-Free Instagram Audio Preset",
    },
    {
        "id": "hotline_bling",
        "title": "Hotline Bling",
        "artist": "Raban",
        "duration_text": "1:09",
        "category": "social",
        "genre": "R&B Pop Groove",
        "mood": "trending",
        "filename": "hotline_bling.wav",
        "description": "Bouncy R&B beat with syncopated synth bass and warm Rhodes chops.",
        "bpm": 100,
        "trending": False,
        "tab": "for_you",
        "cover_gradient": "from-emerald-600 to-teal-700",
        "license": "Royalty-Free Instagram Audio Preset",
    },
    {
        "id": "richi_theme",
        "title": "Richi Theme",
        "artist": "R.A. Production",
        "duration_text": "2:50",
        "category": "cinematic",
        "genre": "South Cinema Action BGM",
        "mood": "cinematic",
        "filename": "richi_theme.wav",
        "description": "Dramatic South Indian mass action hero theme with horns and heavy percussion.",
        "bpm": 128,
        "trending": True,
        "tab": "trending",
        "cover_gradient": "from-zinc-800 to-neutral-900",
        "license": "Royalty-Free Indian Cinema BGM",
    },
    {
        "id": "wedding",
        "title": "💒 Wedding & Anniversary Romance Ballad",
        "artist": "FotoOwl Acoustics",
        "duration_text": "2:30",
        "category": "wedding",
        "genre": "Acoustic Ballad / Piano & Harp",
        "mood": "wedding",
        "filename": "wedding.wav",
        "description": "Romantic acoustic harp arpeggio and emotional grand piano harmonies for sacred love vows.",
        "bpm": 72,
        "trending": True,
        "tab": "for_you",
        "cover_gradient": "from-pink-500 to-rose-700",
        "license": "FotoOwl Studio Original (Royalty-Free)",
    },
    {
        "id": "nature",
        "title": "🌲 Nature & Scenic Landscape Harmony",
        "artist": "Green Valley Sound",
        "duration_text": "3:15",
        "category": "nature",
        "genre": "Pastoral Folk / Acoustic Guitar",
        "mood": "nature",
        "filename": "nature.wav",
        "description": "Serene acoustic guitar picking and airy harmonics for mountains, lakes, and forests.",
        "bpm": 90,
        "trending": True,
        "tab": "for_you",
        "cover_gradient": "from-green-600 to-emerald-800",
        "license": "FotoOwl Studio Original (Royalty-Free)",
    },
    {
        "id": "trending",
        "title": "💥 Viral Instagram Reel & TikTok Beat",
        "artist": "FotoOwl Phonk Studio",
        "duration_text": "1:00",
        "category": "social",
        "genre": "128 BPM Trap / Phonk Drop",
        "mood": "trending",
        "filename": "instagram_trending.wav",
        "description": "Driving 808 sub-bass, snap snare, and synth lead for viral short-form videos.",
        "bpm": 128,
        "trending": True,
        "tab": "trending",
        "cover_gradient": "from-fuchsia-600 to-purple-800",
        "license": "FotoOwl Studio Original (Royalty-Free)",
    },
    {
        "id": "celebration",
        "title": "🎉 Birthday & Celebration Party",
        "artist": "FotoOwl Upbeat",
        "duration_text": "1:00",
        "category": "celebration",
        "genre": "Upbeat Dance-Pop / 124 BPM",
        "mood": "celebration",
        "filename": "celebration.wav",
        "description": "Rhythmic bass pulses, festive claps, and energetic party groove.",
        "bpm": 124,
        "trending": False,
        "tab": "for_you",
        "cover_gradient": "from-purple-500 to-indigo-700",
        "license": "FotoOwl Studio Original (Royalty-Free)",
    },
    {
        "id": "cinematic",
        "title": "🎬 Cinematic Orchestral Score",
        "artist": "FotoOwl Symphony",
        "duration_text": "1:00",
        "category": "cinematic",
        "genre": "Orchestral Trailer Crescendo",
        "mood": "cinematic",
        "filename": "cinematic.wav",
        "description": "Deep sub drone and brass harmonic swell for cinematic photo montages.",
        "bpm": 60,
        "trending": False,
        "tab": "for_you",
        "cover_gradient": "from-zinc-700 to-zinc-950",
        "license": "FotoOwl Studio Original (Royalty-Free)",
    },
]


def load_custom_tracks() -> List[Dict[str, Any]]:
    """Load user uploaded and saved audio tracks."""
    if not CUSTOM_TRACKS_FILE.exists():
        return []
    try:
        with open(CUSTOM_TRACKS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def save_custom_tracks(tracks: List[Dict[str, Any]]) -> None:
    """Save user uploaded tracks to JSON."""
    with open(CUSTOM_TRACKS_FILE, "w", encoding="utf-8") as f:
        json.dump(tracks, f, indent=2)


@router.get("/catalog", response_model=List[Dict[str, Any]])
def get_audio_catalog():
    """Retrieve catalog of studio-grade soundtrack tracks including custom uploaded songs."""
    catalog = []
    # 1. Studio Curated Tracks
    for item in STUDIO_CATALOG:
        catalog.append(
            {
                **item,
                "preview_url": f"/api/audio/preview/{item['filename']}",
                "is_custom": False,
            }
        )

    # 2. Custom Stored Tracks
    for item in load_custom_tracks():
        catalog.append(
            {
                **item,
                "preview_url": f"/api/audio/preview/{item['filename']}",
                "is_custom": True,
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
    title: Optional[str] = Form(None),
    artist: Optional[str] = Form(None),
    job_id: Optional[str] = Form(None),
):
    """Upload custom background music file (MP3, WAV, AAC, M4A) and store it in library."""
    allowed_exts = {".mp3", ".wav", ".aac", ".m4a", ".ogg"}
    file_ext = Path(file.filename or "").suffix.lower()

    if file_ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format '{file_ext}'. Allowed: {', '.join(allowed_exts)}",
        )

    # Save to audio uploads
    prefix = f"{job_id}_" if job_id else ""
    safe_stem = Path(file.filename or "my_track").stem.replace(" ", "_")
    safe_filename = f"{prefix}{safe_stem}{file_ext}"
    target_path = AUDIO_UPLOADS_DIR / safe_filename

    content = await file.read()
    if len(content) > 30 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio file exceeds 30 MB limit.")

    with open(target_path, "wb") as f:
        f.write(content)

    # Store in custom tracks list
    custom_tracks = load_custom_tracks()
    track_id = f"custom_{safe_stem}"
    track_record = {
        "id": track_id,
        "title": title or Path(file.filename or "Custom Track").stem,
        "artist": artist or "My Uploaded Audio",
        "duration_text": "Original Audio",
        "category": "saved",
        "genre": "User Upload",
        "mood": "trending",
        "filename": safe_filename,
        "description": f"Custom uploaded audio: {file.filename}",
        "trending": False,
        "tab": "original",
        "cover_gradient": "from-violet-600 to-indigo-800",
        "license": "User Owned / Original Audio",
        "is_custom": True,
    }

    # Replace or prepend
    custom_tracks = [t for t in custom_tracks if t["id"] != track_id]
    custom_tracks.insert(0, track_record)
    save_custom_tracks(custom_tracks)

    return {
        "message": "Custom audio uploaded and stored successfully.",
        "track": track_record,
        "filename": safe_filename,
        "preview_url": f"/api/audio/preview/{safe_filename}",
        "file_path": str(target_path),
    }
