"""Full integration test of FastAPI REST endpoints."""

import io
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
sample_dir = Path(__file__).parent / "sample_photos"


def test_api_full_workflow():
    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

    # 2. Models inspection
    res = client.get("/api/models")
    assert res.status_code == 200
    assert "installed_models" in res.json()

    # 3. Create job
    job_payload = {
        "prompt": "Vibrant city night walk",
        "aspect_ratio": "9:16",
        "style": "energetic",
        "duration_seconds": 6,
        "music_enabled": True,
        "captions_enabled": True,
    }
    res = client.post("/api/jobs", json=job_payload)
    assert res.status_code == 200
    job_data = res.json()
    job_id = job_data["id"]
    assert job_data["status"] == "pending"

    # 4. Upload photo
    img_path = sample_dir / "photo2_city.jpg"
    with open(img_path, "rb") as f:
        file_bytes = f.read()

    files = [("files", ("photo2_city.jpg", io.BytesIO(file_bytes), "image/jpeg"))]
    res = client.post(f"/api/jobs/{job_id}/upload", files=files)
    assert res.status_code == 200
    images = res.json()
    assert len(images) == 1
    assert images[0]["original_filename"] == "photo2_city.jpg"

    # 5. List images
    res = client.get(f"/api/jobs/{job_id}/images")
    assert res.status_code == 200
    assert len(res.json()) == 1

    # 6. Check job logs initially
    res = client.get(f"/api/jobs/{job_id}/logs")
    assert res.status_code == 200
    assert len(res.json()) >= 1  # Upload logged

    # 7. Start job pipeline
    res = client.post(f"/api/jobs/{job_id}/start")
    assert res.status_code == 200
    assert "launched" in res.json()["message"]
