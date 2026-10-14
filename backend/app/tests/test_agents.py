"""Unit tests for the five individual agents."""

import pytest
from pathlib import Path
from app.agents.image_analyser import run_image_analyser
from app.agents.storyboard_writer import run_storyboard_writer
from app.agents.script_generator import run_script_generator
from app.agents.compiler_fixer import run_compiler_fixer, diagnose_script, repair_script
from app.agents.renderer import run_renderer
from app.database import create_job, add_job_image, init_db
from app.config import OUTPUT_DIR

sample_dir = Path(__file__).parent / "sample_photos"


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


@pytest.mark.anyio
async def test_agent1_image_analyser():
    job_id = "test_agent1"
    create_job(job_id, prompt="Sunny weekend getaway")
    
    img_path = sample_dir / "photo1_sunset.jpg"
    add_job_image("img1", job_id, "photo1_sunset.jpg", "photo1_sunset.jpg", str(img_path), 50000, 1920, 1080)

    state = {
        "job_id": job_id,
        "prompt": "Sunset retreat",
        "aspect_ratio": "9:16",
        "style": "cinematic",
        "duration_seconds": 10,
        "music_enabled": True,
        "captions_enabled": True,
        "images": [{"id": "img1", "original_filename": "photo1_sunset.jpg", "file_path": str(img_path)}],
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

    result = await run_image_analyser(state)
    assert "analyses" in result
    assert len(result["analyses"]) == 1
    analysis = result["analyses"][0]
    assert "subject" in analysis
    assert "orientation" in analysis
    assert analysis["relevance_score"] > 0


@pytest.mark.anyio
async def test_agent2_storyboard_writer():
    job_id = "test_agent2"
    create_job(job_id, prompt="City nightlife")

    analyses = [
        {
            "image_id": "img2",
            "filename": "photo2_city.jpg",
            "subject": "Urban architectural scenery",
            "scene_type": "architectural",
            "mood": "energetic and modern",
            "orientation": "portrait",
            "relevance_score": 0.9,
            "suggested_caption": "City skyline glow",
        }
    ]

    state = {
        "job_id": job_id,
        "prompt": "City nightlife highlights",
        "aspect_ratio": "9:16",
        "style": "energetic",
        "duration_seconds": 9,
        "music_enabled": True,
        "captions_enabled": True,
        "images": [],
        "analyses": analyses,
        "storyboard": None,
        "script": None,
        "compilation_success": False,
        "compilation_errors": [],
        "repair_attempts": 0,
        "render_success": False,
        "output_video_path": None,
        "download_url": None,
        "error_message": None,
        "current_agent": "Storyboard Writer",
    }

    result = await run_storyboard_writer(state)
    assert "storyboard" in result
    sb = result["storyboard"]
    assert len(sb["scenes"]) == 1
    assert sb["total_duration_seconds"] == 9.0


@pytest.mark.anyio
async def test_agent3_script_generator():
    job_id = "test_agent3"
    create_job(job_id, prompt="Travel diary")
    img_path = sample_dir / "photo3_nature.jpg"

    images = [{"id": "img3", "original_filename": "photo3_nature.jpg", "file_path": str(img_path)}]
    storyboard = {
        "title": "Nature Walks",
        "aspect_ratio": "9:16",
        "style": "aesthetic",
        "total_duration_seconds": 6.0,
        "background_music_mood": "calm",
        "scenes": [
            {
                "scene_index": 0,
                "image_id": "img3",
                "filename": "photo3_nature.jpg",
                "duration_seconds": 6.0,
                "caption": "Serene green paths",
                "transition": "fade",
                "ken_burns_effect": "zoom_in",
                "overlay_title": "Nature Walks",
            }
        ],
    }

    state = {
        "job_id": job_id,
        "prompt": "Travel diary",
        "aspect_ratio": "9:16",
        "style": "aesthetic",
        "duration_seconds": 6,
        "music_enabled": True,
        "captions_enabled": True,
        "images": images,
        "analyses": [],
        "storyboard": storyboard,
        "script": None,
        "compilation_success": False,
        "compilation_errors": [],
        "repair_attempts": 0,
        "render_success": False,
        "output_video_path": None,
        "download_url": None,
        "error_message": None,
        "current_agent": "Script Generator",
    }

    result = await run_script_generator(state)
    assert "script" in result
    script = result["script"]
    assert script["width"] == 1080
    assert script["height"] == 1920
    assert script["fps"] == 30
    assert len(script["scenes"]) == 1


@pytest.mark.anyio
async def test_agent4_compiler_and_repair():
    img_path = sample_dir / "photo1_sunset.jpg"
    images = [{"id": "img1", "original_filename": "photo1_sunset.jpg", "file_path": str(img_path)}]

    # Deliberately introduce flawed properties: invalid transition and short frames
    flawed_script = {
        "width": 1080,
        "height": 1920,
        "fps": 30,
        "duration_in_frames": 5,
        "aspect_ratio": "9:16",
        "scenes": [
            {
                "sceneIndex": 0,
                "imageId": "img1",
                "imagePath": str(img_path),
                "durationInFrames": 5,
                "transition": "unsupported_wipe_effect",
                "kenBurnsEffect": "zoom_in",
            }
        ],
    }

    diagnostics = diagnose_script(flawed_script, images)
    assert len(diagnostics) >= 1

    repaired, actions = repair_script(flawed_script, diagnostics, images)
    repaired_diagnostics = diagnose_script(repaired, images)
    assert len(repaired_diagnostics) == 0
    assert repaired["scenes"][0]["transition"] == "fade"


@pytest.mark.anyio
async def test_agent5_renderer_and_playable_mp4():
    job_id = "test_agent5"
    create_job(job_id, prompt="Render test")
    img_path = sample_dir / "photo1_sunset.jpg"

    script = {
        "width": 1080,
        "height": 1920,
        "fps": 30,
        "duration_in_frames": 60,
        "aspect_ratio": "9:16",
        "scenes": [
            {
                "sceneIndex": 0,
                "imageId": "img1",
                "imagePath": str(img_path),
                "durationInFrames": 60,
                "transition": "fade",
                "kenBurnsEffect": "zoom_in",
            }
        ],
    }

    state = {
        "job_id": job_id,
        "prompt": "Render test",
        "aspect_ratio": "9:16",
        "style": "cinematic",
        "duration_seconds": 2,
        "music_enabled": False,
        "captions_enabled": True,
        "images": [{"id": "img1", "file_path": str(img_path)}],
        "analyses": [],
        "storyboard": None,
        "script": script,
        "compilation_success": True,
        "compilation_errors": [],
        "repair_attempts": 0,
        "render_success": False,
        "output_video_path": None,
        "download_url": None,
        "error_message": None,
        "current_agent": "Renderer",
    }

    res = await run_renderer(state)
    assert res["render_success"] is True
    assert res["output_video_path"] is not None
    out_file = Path(res["output_video_path"])
    assert out_file.exists()
    assert out_file.stat().st_size > 0
