"""Sample photo packs service for instant 1-click video generation without manual upload."""

import shutil
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.config import UPLOAD_DIR
from app.database import add_job_image, add_job_log, create_job, get_job, get_job_images

SAMPLE_DIR = Path(__file__).resolve().parent.parent / "sample_assets"

SAMPLE_PACKS = {
    "wedding": {
        "id": "wedding",
        "name": "💒 Wedding & Romance",
        "description": "Romantic vows at floral arch, golden rings on roses, couple first dance, and joyful celebration.",
        "badge": "Popular",
        "theme": "wedding",
        "suggested_prompt": "Create an emotional, heartwarming wedding celebration reel with romantic titles, gentle pans, and elegant cues",
        "aspect_ratio": "9:16",
        "style": "cinematic",
        "music_mood": "wedding",
        "duration_seconds": 15,
        "files": [
            {"filename": "wedding_1_ceremony.jpg", "label": "Ceremony Vows"},
            {"filename": "wedding_2_rings.jpg", "label": "Golden Rings"},
            {"filename": "wedding_3_dance.jpg", "label": "First Dance"},
            {"filename": "wedding_4_celebration.jpg", "label": "Celebration Toast"},
        ],
    },
    "nature": {
        "id": "nature",
        "name": "🌲 Nature & Landscapes",
        "description": "Majestic sunrise mountain peaks, coastal ocean surf, sunlit evergreen canopy, and misty waterfalls.",
        "badge": "Scenic",
        "theme": "nature",
        "suggested_prompt": "Create a breathtaking scenic nature travel reel with sweeping cinematic pans and serene atmosphere",
        "aspect_ratio": "9:16",
        "style": "aesthetic",
        "music_mood": "nature",
        "duration_seconds": 15,
        "files": [
            {"filename": "nature_1_mountains.jpg", "label": "Alpine Peaks"},
            {"filename": "nature_2_coastal.jpg", "label": "Coastal Waves"},
            {"filename": "nature_3_forest.jpg", "label": "Emerald Forest"},
            {"filename": "nature_4_waterfall.jpg", "label": "Cascade Waterfall"},
        ],
    },
    "celebration": {
        "id": "celebration",
        "name": "🎉 Party & Festive",
        "description": "Golden confetti sparkles, nighttime music festival, joyful friends, and midnight sparkler celebration.",
        "badge": "Upbeat",
        "theme": "celebration",
        "suggested_prompt": "Create a vibrant, high-energy party and celebration reel with punchy cuts and celebratory typography",
        "aspect_ratio": "9:16",
        "style": "energetic",
        "music_mood": "celebration",
        "duration_seconds": 12,
        "files": [
            {"filename": "party_1_confetti.jpg", "label": "Confetti & Toast"},
            {"filename": "party_2_festival.jpg", "label": "Neon Festival"},
            {"filename": "party_3_sparklers.jpg", "label": "Sparkler Glow"},
        ],
    },
}


def get_all_sample_packs() -> List[Dict[str, Any]]:
    """Return all available sample presets."""
    return list(SAMPLE_PACKS.values())


def load_sample_pack_into_job(pack_id: str, job_id: Optional[str] = None, prompt: Optional[str] = None) -> Dict[str, Any]:
    """Copy sample pack photos into job storage and database."""
    pack = SAMPLE_PACKS.get(pack_id)
    if not pack:
        raise ValueError(f"Unknown sample pack: {pack_id}")

    # If no job_id provided, create a fresh job matching the pack defaults
    if not job_id:
        job_id = str(uuid.uuid4())
        job_record = create_job(
            job_id=job_id,
            prompt=prompt or pack["suggested_prompt"],
            aspect_ratio=pack["aspect_ratio"],
            style=pack["style"],
            duration_seconds=pack["duration_seconds"],
            music_enabled=True,
            captions_enabled=True,
        )
    else:
        job_record = get_job(job_id)
        if not job_record:
            job_record = create_job(
                job_id=job_id,
                prompt=prompt or pack["suggested_prompt"],
                aspect_ratio=pack["aspect_ratio"],
                style=pack["style"],
                duration_seconds=pack["duration_seconds"],
                music_enabled=True,
                captions_enabled=True,
            )

    uploaded_items = []
    current_images = get_job_images(job_id)
    seq = len(current_images)

    for item in pack["files"]:
        filename = item["filename"]
        source_path = SAMPLE_DIR / filename
        if not source_path.exists():
            continue

        image_id = str(uuid.uuid4())
        stored_filename = f"{job_id}_{image_id}_{filename}"
        dest_path = UPLOAD_DIR / stored_filename
        shutil.copy2(source_path, dest_path)

        file_size = dest_path.stat().st_size
        width, height = 1080, 1920

        add_job_image(
            image_id=image_id,
            job_id=job_id,
            original_filename=item.get("label", filename) + ".jpg",
            stored_filename=stored_filename,
            file_path=str(dest_path),
            file_size=file_size,
            width=width,
            height=height,
            mime_type="image/jpeg",
            sequence_index=seq,
        )
        seq += 1

        uploaded_items.append(
            {
                "id": image_id,
                "job_id": job_id,
                "original_filename": item.get("label", filename) + ".jpg",
                "stored_filename": stored_filename,
                "file_size": file_size,
                "width": width,
                "height": height,
                "mime_type": "image/jpeg",
                "sequence_index": seq - 1,
                "preview_url": f"/storage/uploads/{stored_filename}",
            }
        )

    add_job_log(
        job_id,
        "System",
        f"Loaded sample pack '{pack['name']}' with {len(uploaded_items)} verified photos.",
        "info",
    )

    return {
        "job": get_job(job_id),
        "pack": pack,
        "images": uploaded_items,
    }
