"""Stage 2 Test: Render playable MP4 from real photos directly without AI."""

from pathlib import Path
from app.services.ffmpeg_service import render_slideshow_mp4, probe_video
from app.config import OUTPUT_DIR

sample_dir = Path(__file__).parent / "sample_photos"


def test_stage2_direct_playable_mp4():
    img1 = sample_dir / "photo1_sunset.jpg"
    img2 = sample_dir / "photo2_city.jpg"
    img3 = sample_dir / "photo3_nature.jpg"

    output_file = OUTPUT_DIR / "stage2_demo_reel.mp4"
    if output_file.exists():
        output_file.unlink()

    success, msg = render_slideshow_mp4(
        image_paths=[img1, img2, img3],
        output_mp4=output_file,
        aspect_ratio="9:16",
        duration_per_image=2.0,
        with_music=True,
    )

    assert success is True, f"Render failed: {msg}"
    assert output_file.exists()
    assert output_file.stat().st_size > 0

    probe = probe_video(output_file)
    assert probe["valid"] is True
    assert probe["width"] == 1080
    assert probe["height"] == 1920
    assert probe["duration"] >= 5.5
    print(f"Stage 2 verified: MP4 created at {output_file} with duration {probe['duration']}s")
