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


def generate_ambient_music(output_wav: Path, duration_seconds: float, mood: str = "cinematic") -> bool:
    """Generate rich, harmonic background music matching wedding, nature, celebration, or cinematic mood."""
    if not FFMPEG_BINARY:
        return False
    try:
        mood_lower = (mood or "cinematic").lower()

        if "wedding" in mood_lower or "romantic" in mood_lower:
            # 💒 Romantic Wedding: Sweet acoustic harp & chime arpeggios (Cmaj7 -> Fmaj7)
            lavfi = (
                f"aevalsrc='0.16*sin(2*PI*261.63*t)*exp(-2.5*mod(t,2)) + "
                f"0.14*sin(2*PI*329.63*t)*exp(-2.2*mod(t,2)) + "
                f"0.12*sin(2*PI*392.00*t)*exp(-2.0*mod(t,2)) + "
                f"0.10*sin(2*PI*493.88*t)*exp(-3.0*mod(t+0.5,2)) + "
                f"0.08*sin(2*PI*523.25*t)*exp(-3.5*mod(t+1.0,2))':d={duration_seconds}"
            )
            vol = "0.45"
        elif "nature" in mood_lower or "scenic" in mood_lower:
            # 🌲 Serene Nature: Flowing pastoral acoustic guitar & harmonic breeze (G -> Em)
            lavfi = (
                f"aevalsrc='0.14*sin(2*PI*196.00*t)*exp(-1.8*mod(t,2.5)) + "
                f"0.12*sin(2*PI*246.94*t)*exp(-1.5*mod(t,2.5)) + "
                f"0.11*sin(2*PI*293.66*t)*exp(-1.5*mod(t,2.5)) + "
                f"0.09*sin(2*PI*392.00*t)*exp(-2.2*mod(t+1.2,2.5)) + "
                f"0.05*sin(2*PI*587.33*t)*exp(-3.0*mod(t+1.8,2.5))':d={duration_seconds}"
            )
            vol = "0.40"
        elif "celebration" in mood_lower or "party" in mood_lower or "upbeat" in mood_lower:
            # 🎉 Upbeat Celebration: Syncopated 120 BPM rhythmic bass pulses and festive brass stabs
            lavfi = (
                f"aevalsrc='0.20*sin(2*PI*110.00*t)*exp(-6.0*mod(t,0.5)) + "
                f"0.15*sin(2*PI*220.00*t)*exp(-5.0*mod(t+0.25,0.5)) + "
                f"0.12*sin(2*PI*440.00*t)*exp(-4.0*mod(t,1.0)) + "
                f"0.10*sin(2*PI*554.37*t)*exp(-3.5*mod(t+0.5,1.0)) + "
                f"0.08*sin(2*PI*659.25*t)*exp(-4.5*mod(t+0.75,1.0))':d={duration_seconds}"
            )
            vol = "0.50"
        elif "aesthetic" in mood_lower or "lofi" in mood_lower:
            # ☕ Lo-Fi Aesthetic: Warm Rhodes major 7th chord cadence (Fmaj7)
            lavfi = (
                f"aevalsrc='0.16*sin(2*PI*174.61*t)*exp(-1.2*mod(t,3)) + "
                f"0.13*sin(2*PI*220.00*t)*exp(-1.2*mod(t,3)) + "
                f"0.11*sin(2*PI*261.63*t)*exp(-1.2*mod(t,3)) + "
                f"0.09*sin(2*PI*329.63*t)*exp(-2.0*mod(t+1.5,3))':d={duration_seconds}"
            )
            vol = "0.42"
        else:
            # 🎬 Cinematic Ambient: Deep resonant orchestral drone & shimmering 5th swell
            lavfi = (
                f"aevalsrc='0.18*sin(2*PI*110.00*t) + "
                f"0.14*sin(2*PI*164.81*t) + "
                f"0.12*sin(2*PI*220.00*t) + "
                f"0.08*sin(2*PI*329.63*t + 0.5*sin(2*PI*0.2*t)) + "
                f"0.06*sin(2*PI*440.00*t)':d={duration_seconds}"
            )
            vol = "0.38"

        cmd = [
            FFMPEG_BINARY,
            "-y",
            "-f", "lavfi",
            "-i", lavfi,
            "-af", f"afade=t=in:ss=0:d=1.5,afade=t=out:st={max(0.1, duration_seconds - 2.0)}:d=2.0,volume={vol}",
            "-c:a", "pcm_s16le",
            str(output_wav),
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=25)
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
    music_mood: str = "cinematic",
    scenes_metadata: Optional[List[Dict[str, Any]]] = None,
) -> Tuple[bool, str]:
    """Render a high-definition MP4 from photos with pan/zoom and seamless studio-quality audio."""
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

    # Audio Asset Directory
    audio_assets_dir = Path(__file__).resolve().parent.parent / "audio_assets"
    selected_audio: Optional[Path] = None
    temp_generated_audio: Optional[Path] = None

    if with_music:
        mood_str = (music_mood or "cinematic").lower()
        if any(w in mood_str for w in ["wedding", "romantic", "love", "marry", "marriage", "couple", "bride", "groom"]):
            candidate = audio_assets_dir / "wedding.wav"
        elif any(w in mood_str for w in ["nature", "scenic", "outdoor", "forest", "mountain", "calm", "relax", "serene", "waterfall"]):
            candidate = audio_assets_dir / "nature.wav"
        elif any(w in mood_str for w in ["celebration", "party", "festival", "upbeat", "dance", "fun", "birthday", "sparkler", "confetti"]):
            candidate = audio_assets_dir / "celebration.wav"
        else:
            candidate = audio_assets_dir / "cinematic.wav"

        if candidate.exists() and candidate.stat().st_size > 0:
            selected_audio = candidate
            logger.info(f"Using high-fidelity studio track: {candidate.name} (mood: {music_mood})")
        else:
            temp_generated_audio = TEMP_DIR / f"ambient_{output_mp4.stem}.wav"
            if generate_ambient_music(temp_generated_audio, total_duration, mood=music_mood):
                selected_audio = temp_generated_audio
                logger.info(f"Synthesized ambient track for mood: {music_mood}")

    try:
        # Build filter complex
        # 1. Scale with full-bleed crop to fill the frame vibrantly (no black bars)
        # 2. Apply subtle Ken Burns zoom effect
        inputs = []
        filter_parts = []

        for i, img_path in enumerate(image_paths):
            inputs.extend(["-loop", "1", "-t", str(duration_per_image), "-i", str(img_path)])
            filter_parts.append(
                f"[{i}:v]scale={out_w}:{out_h}:force_original_aspect_ratio=increase,"
                f"crop={out_w}:{out_h},"
                f"zoompan=z='min(zoom+0.0015,1.15)':d={int(duration_per_image * fps)}:s={out_w}x{out_h}:fps={fps},"
                f"setsar=1[v{i}];"
            )

        # Concatenate scenes
        concat_inputs = "".join(f"[v{i}]" for i in range(total_images))
        filter_parts.append(f"{concat_inputs}concat=n={total_images}:v=1:a=0[vout];")

        # Audio filter with smooth fade in and fade out
        if selected_audio and selected_audio.exists():
            fade_out_start = max(0.1, total_duration - 1.5)
            filter_parts.append(
                f"[{total_images}:a]afade=t=in:ss=0:d=1.0,afade=t=out:st={fade_out_start}:d=1.5,volume=0.9[aout]"
            )

        filter_complex = "".join(filter_parts)

        cmd = [FFMPEG_BINARY, "-y"]
        cmd.extend(inputs)

        if selected_audio and selected_audio.exists():
            cmd.extend(["-stream_loop", "-1", "-i", str(selected_audio)])

        cmd.extend([
            "-filter_complex", filter_complex,
            "-map", "[vout]",
        ])

        if selected_audio and selected_audio.exists():
            cmd.extend([
                "-map", "[aout]",
                "-c:a", "aac",
                "-b:a", "192k",
                "-ac", "2",
            ])

        cmd.extend([
            "-c:v", "libx264",
            "-preset", "veryfast",
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
        if temp_generated_audio and temp_generated_audio.exists():
            try:
                temp_generated_audio.unlink()
            except Exception:
                pass
