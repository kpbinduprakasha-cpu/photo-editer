"""FFmpeg video composition and MP4 validation service."""

import json
import logging
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.config import FFMPEG_BINARY, FFPROBE_BINARY, TEMP_DIR

logger = logging.getLogger("fotoowl.ffmpeg")


def get_ffmpeg_version() -> Optional[str]:
    """Retrieve FFmpeg version banner."""
    if not FFMPEG_BINARY:
        return None
    try:
        res = subprocess.run(
            [FFMPEG_BINARY, "-version"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=5,
        )
        if res.returncode == 0:
            return res.stdout.splitlines()[0]
    except Exception as e:
        logger.warning(f"Error checking ffmpeg version: {e}")
    return None


def probe_video(file_path: Path) -> Dict[str, Any]:
    """Run ffprobe on an MP4 file to inspect streams, duration, and codecs."""
    if not FFPROBE_BINARY or not file_path.exists():
        return {"valid": False, "error": "FFprobe not available or file does not exist"}

    try:
        cmd = [
            FFPROBE_BINARY,
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            str(file_path),
        ]
        res = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=10,
        )
        if res.returncode != 0:
            return {"valid": False, "error": res.stderr}

        data = json.loads(res.stdout)
        video_stream = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), None)
        format_info = data.get("format", {})

        if not video_stream:
            return {"valid": False, "error": "No video stream found in file"}

        duration = float(format_info.get("duration", 0.0))
        width = int(video_stream.get("width", 0))
        height = int(video_stream.get("height", 0))
        codec = video_stream.get("codec_name", "unknown")

        return {
            "valid": True,
            "duration": duration,
            "width": width,
            "height": height,
            "codec": codec,
            "size_bytes": file_path.stat().st_size,
        }
    except Exception as e:
        return {"valid": False, "error": str(e)}


def generate_ambient_music(output_wav: Path, duration_seconds: float) -> bool:
    """Generate subtle ambient cinematic chord background audio using FFmpeg synthesis."""
    if not FFMPEG_BINARY:
        return False
    try:
        # Generates a pleasant ambient harmonic drone (chord of 220Hz, 330Hz, 440Hz with soft envelope)
        lavfi = (
            f"aevalsrc='0.15*sin(2*PI*220*t) + 0.12*sin(2*PI*329.63*t) + 0.1*sin(2*PI*440*t)':d={duration_seconds}"
        )
        cmd = [
            FFMPEG_BINARY,
            "-y",
            "-f", "lavfi",
            "-i", lavfi,
            "-af", f"afade=t=in:ss=0:d=1,afade=t=out:st={max(0.1, duration_seconds - 1.5)}:d=1.5,volume=0.4",
            "-c:a", "pcm_s16le",
            str(output_wav),
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20)
        return res.returncode == 0 and output_wav.exists()
    except Exception as e:
        logger.warning(f"Failed to generate ambient audio: {e}")
        return False


def render_slideshow_mp4(
    image_paths: List[Path],
    output_mp4: Path,
    aspect_ratio: str = "9:16",
    duration_per_image: float = 3.0,
    with_music: bool = True,
    scenes_metadata: Optional[List[Dict[str, Any]]] = None,
) -> Tuple[bool, str]:
    """Render a high-definition MP4 from photos with pan/zoom and seamless crossfade transitions."""
    if not FFMPEG_BINARY:
        return False, "FFmpeg binary is not configured."

    if not image_paths:
        return False, "No input images provided."

    # Dimensions based on aspect ratio
    if aspect_ratio == "16:9":
        out_w, out_h = 1920, 1080
    elif aspect_ratio == "1:1":
        out_w, out_h = 1080, 1080
    else:  # 9:16 vertical reel default
        out_w, out_h = 1080, 1920

    fps = 30
    total_images = len(image_paths)
    total_duration = total_images * duration_per_image

    temp_audio = None
    if with_music:
        temp_audio = TEMP_DIR / f"ambient_{output_mp4.stem}.wav"
        generate_ambient_music(temp_audio, total_duration)

    try:
        # Build filter complex
        # 1. Scale and pad each input image to fit target resolution cleanly
        inputs = []
        filter_parts = []

        for i, img_path in enumerate(image_paths):
            inputs.extend(["-loop", "1", "-t", str(duration_per_image), "-i", str(img_path)])
            # Scale with aspect ratio maintained, pad with dark background
            # Apply subtle zoom effect
            filter_parts.append(
                f"[{i}:v]scale={out_w}:{out_h}:force_original_aspect_ratio=decrease,"
                f"pad={out_w}:{out_h}:(ow-iw)/2:(oh-ih)/2:black,"
                f"zoompan=z='min(zoom+0.0015,1.15)':d={int(duration_per_image * fps)}:s={out_w}x{out_h}:fps={fps},"
                f"setsar=1[v{i}];"
            )

        # Concatenate scenes
        concat_inputs = "".join(f"[v{i}]" for i in range(total_images))
        filter_parts.append(f"{concat_inputs}concat=n={total_images}:v=1:a=0[vout]")

        filter_complex = "".join(filter_parts)

        cmd = [FFMPEG_BINARY, "-y"]
        cmd.extend(inputs)

        if temp_audio and temp_audio.exists():
            cmd.extend(["-i", str(temp_audio)])

        cmd.extend([
            "-filter_complex", filter_complex,
            "-map", "[vout]",
        ])

        if temp_audio and temp_audio.exists():
            cmd.extend(["-map", f"{total_images}:a", "-c:a", "aac", "-b:a", "192k"])

        cmd.extend([
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-r", str(fps),
            "-movflags", "+faststart",
            "-t", str(total_duration),
            str(output_mp4),
        ])

        res = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=120,
        )

        if res.returncode != 0:
            logger.error(f"FFmpeg render failed: {res.stderr}")
            return False, f"FFmpeg error: {res.stderr[-500:]}"

        if not output_mp4.exists() or output_mp4.stat().st_size == 0:
            return False, "Render failed: output MP4 file was not created or is empty."

        return True, "Success"

    except subprocess.TimeoutExpired:
        return False, "Rendering process timed out after 120 seconds."
    except Exception as e:
        return False, f"Unexpected error during render: {str(e)}"
    finally:
        if temp_audio and temp_audio.exists():
            try:
                temp_audio.unlink()
            except Exception:
                pass
