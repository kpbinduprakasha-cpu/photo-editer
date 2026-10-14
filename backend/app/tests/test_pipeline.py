"""End-to-end integration test of the full 5-agent LangGraph pipeline."""

import pytest
import uuid
from pathlib import Path
from app.agents.graph import video_agent_pipeline
from app.agents.state import VideoGenerationState
from app.database import create_job, add_job_image, init_db, get_job, get_job_logs
from app.services.ffmpeg_service import probe_video

sample_dir = Path(__file__).parent / "sample_photos"


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


@pytest.mark.anyio
async def test_full_langgraph_pipeline_e2e():
    job_id = f"test_e2e_{uuid.uuid4().hex[:8]}"
    create_job(job_id, prompt="Cinematic coastal vacation moments", aspect_ratio="9:16", duration_seconds=6)

    img1 = sample_dir / "photo1_sunset.jpg"
    img2 = sample_dir / "photo2_city.jpg"

    id1 = f"img_{uuid.uuid4().hex[:8]}"
    id2 = f"img_{uuid.uuid4().hex[:8]}"

    add_job_image(id1, job_id, "photo1_sunset.jpg", "photo1_sunset.jpg", str(img1), 60000, 1920, 1080)
    add_job_image(id2, job_id, "photo2_city.jpg", "photo2_city.jpg", str(img2), 65000, 1080, 1920)

    initial_state: VideoGenerationState = {
        "job_id": job_id,
        "prompt": "Cinematic coastal vacation moments",
        "aspect_ratio": "9:16",
        "style": "cinematic",
        "duration_seconds": 6,
        "music_enabled": True,
        "captions_enabled": True,
        "images": [
            {"id": id1, "original_filename": "photo1_sunset.jpg", "file_path": str(img1)},
            {"id": id2, "original_filename": "photo2_city.jpg", "file_path": str(img2)},
        ],
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

    # Execute full LangGraph pipeline
    final_state = await video_agent_pipeline.ainvoke(initial_state)

    # Validate final state
    assert final_state["compilation_success"] is True
    assert final_state["render_success"] is True
    assert final_state["output_video_path"] is not None

    output_path = Path(final_state["output_video_path"])
    assert output_path.exists()
    assert output_path.stat().st_size > 0

    # Validate output MP4 playability via FFprobe
    probe = probe_video(output_path)
    assert probe["valid"] is True
    assert probe["duration"] > 0
    assert probe["width"] == 1080
    assert probe["height"] == 1920
    assert probe["codec"] in ["h264", "libx264"]

    # Verify database was updated
    job_record = get_job(job_id)
    assert job_record["status"] == "completed"
    assert job_record["progress_pct"] == 100

    logs = get_job_logs(job_id)
    assert len(logs) >= 5
    agent_names = {l["agent_name"] for l in logs}
    assert "Image Analyser" in agent_names
    assert "Storyboard Writer" in agent_names
    assert "Script Generator" in agent_names
    assert "Compiler & Fixer" in agent_names
    assert "Renderer" in agent_names
