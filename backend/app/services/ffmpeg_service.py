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
    music_mood: str = "trending",
    scenes_metadata: Optional[List[Dict[str, Any]]] = None,
    resolution: str = "1080p",
    fps: int = 30,
    custom_audio_path: Optional[Path] = None,
    audio_volume: float = 0.95,
) -> Tuple[bool, str]:
    """Render a professional high-definition MP4 with camera movements, color grading, text, and studio audio."""
    if not FFMPEG_BINARY:
        return False, "FFmpeg binary is not configured."

    if not image_paths:
        return False, "No input images provided."

    # Resolution mapping
    is_720 = resolution.lower() == "720p"
    if aspect_ratio == "16:9":
        out_w, out_h = (1280, 720) if is_720 else (1920, 1080)
    elif aspect_ratio == "1:1":
        out_w, out_h = (720, 720) if is_720 else (1080, 1080)
    else:  # 9:16 vertical reel default
        out_w, out_h = (720, 1280) if is_720 else (1080, 1920)

    fps = fps if fps in [24, 30, 60] else 30
    total_images = len(image_paths)

    # Calculate per-scene durations from metadata if provided
    durations: List[float] = []
    if scenes_metadata and len(scenes_metadata) == total_images:
        for sc in scenes_metadata:
            dur = sc.get("duration_seconds")
            if dur is None and "durationInFrames" in sc:
                dur = float(sc["durationInFrames"]) / max(1, fps)
            durations.append(max(1.0, float(dur if dur is not None else duration_per_image)))
    else:
        durations = [max(1.0, duration_per_image)] * total_images

    total_duration = sum(durations)

    # Audio Asset Management
    audio_assets_dir = Path(__file__).resolve().parent.parent / "audio_assets"
    selected_audio: Optional[Path] = None
    temp_generated_audio: Optional[Path] = None

    if with_music:
        if custom_audio_path and custom_audio_path.exists() and custom_audio_path.stat().st_size > 0:
            selected_audio = custom_audio_path
            logger.info(f"Using user custom audio track: {custom_audio_path.name}")
        else:
            mood_str = (music_mood or "trending").lower()
            if any(w in mood_str for w in ["trend", "viral", "insta", "reel", "beat", "phonk", "hiphop"]):
                candidate = audio_assets_dir / "instagram_trending.wav"
            elif any(w in mood_str for w in ["lofi", "lo-fi", "chill", "relax", "aesthetic", "cafe", "coffee"]):
                candidate = audio_assets_dir / "instagram_lofi.wav"
            elif any(w in mood_str for w in ["wedding", "romantic", "love", "marry", "marriage", "couple", "bride", "groom", "anniversary"]):
                candidate = audio_assets_dir / "wedding.wav"
            elif any(w in mood_str for w in ["nature", "scenic", "outdoor", "forest", "mountain", "waterfall", "travel", "landscape", "adventure"]):
                candidate = audio_assets_dir / "nature.wav"
            elif any(w in mood_str for w in ["celebration", "party", "festival", "upbeat", "dance", "fun", "birthday", "sparkler", "confetti"]):
                candidate = audio_assets_dir / "celebration.wav"
            else:
                candidate = audio_assets_dir / "cinematic.wav"

            if candidate.exists() and candidate.stat().st_size > 0:
                selected_audio = candidate
                logger.info(f"Selected studio track: {candidate.name} (mood: {music_mood})")
            else:
                temp_generated_audio = TEMP_DIR / f"ambient_{output_mp4.stem}.wav"
                if generate_ambient_music(temp_generated_audio, total_duration, mood=music_mood):
                    selected_audio = temp_generated_audio
                    logger.info(f"Synthesized fallback ambient track for mood: {music_mood}")

    try:
        inputs = []
        filter_parts = []

        # Motion Effects Library
        for i, img_path in enumerate(image_paths):
            scene_dur = durations[i]
            d_frames = int(round(scene_dur * fps))
            inputs.extend(["-loop", "1", "-i", str(img_path)])

            # Extract scene metadata for effect, filter, captions
            sc_meta = scenes_metadata[i] if scenes_metadata and i < len(scenes_metadata) else {}
            motion_type = sc_meta.get("ken_burns_effect") or sc_meta.get("kenBurnsEffect") or sc_meta.get("motion") or "zoom_in"
            color_filter = sc_meta.get("filter_effect") or sc_meta.get("filter") or "none"
            caption = sc_meta.get("caption", "").strip()
            title = sc_meta.get("overlay_title") or sc_meta.get("overlayTitle") or ""

            # 1. Motion Expression
            if motion_type == "zoom_out":
                eff = f"zoompan=z='if(lte(zoom,1.0),1.22,max(1.001,zoom-0.0022))':d={d_frames}:s={out_w}x{out_h}:fps={fps}"
            elif motion_type == "pan_left":
                eff = f"zoompan=z=1.18:x='if(lte(on,1),iw*0.14,max(0,x-1.8))':y='ih/2-(ih/zoom/2)':d={d_frames}:s={out_w}x{out_h}:fps={fps}"
            elif motion_type == "pan_right":
                eff = f"zoompan=z=1.18:x='if(lte(on,1),0,min(iw*0.14,x+1.8))':y='ih/2-(ih/zoom/2)':d={d_frames}:s={out_w}x{out_h}:fps={fps}"
            elif motion_type == "tilt_up":
                eff = f"zoompan=z=1.18:x='iw/2-(iw/zoom/2)':y='if(lte(on,1),ih*0.14,max(0,y-1.8))':d={d_frames}:s={out_w}x{out_h}:fps={fps}"
            elif motion_type == "tilt_down":
                eff = f"zoompan=z=1.18:x='iw/2-(iw/zoom/2)':y='if(lte(on,1),0,min(ih*0.14,y+1.8))':d={d_frames}:s={out_w}x{out_h}:fps={fps}"
            elif motion_type in ["rotate", "orbit"]:
                eff = f"zoompan=z='min(zoom+0.0018,1.18)':d={d_frames}:s={out_w}x{out_h}:fps={fps}"
            else:  # zoom_in default
                eff = f"zoompan=z='min(zoom+0.0022,1.22)':d={d_frames}:s={out_w}x{out_h}:fps={fps}"

            # 2. Color Grading Filter
            filter_expr = ""
            if color_filter == "cinematic":
                filter_expr = ",eq=contrast=1.14:brightness=0.02:saturation=1.12,vignette=PI/4"
            elif color_filter == "vibrant":
                filter_expr = ",eq=saturation=1.35:contrast=1.08"
            elif color_filter == "vintage":
                filter_expr = ",colorbalance=rs=0.15:gs=0.08:bs=-0.12,vignette=PI/3.5"
            elif color_filter in ["bw", "monochrome"]:
                filter_expr = ",hue=s=0,eq=contrast=1.2"
            elif color_filter == "warm":
                filter_expr = ",colorbalance=rs=0.12:gs=0.05:bs=-0.08"
            elif color_filter == "cool":
                filter_expr = ",colorbalance=rs=-0.08:gs=0.02:bs=0.15"
            elif color_filter == "vignette":
                filter_expr = ",vignette=PI/4"

            # 3. Text Overlay (Safe drawtext with character escaping and Windows fontfile)
            text_filter = ""
            overlay_text = title if (i == 0 and title) else caption
            if overlay_text:
                clean_text = (
                    overlay_text.replace("\\", "\\\\")
                    .replace("'", "\u2019")
                    .replace(":", "\\:")
                    .replace("%", "\\%")
                )
                font_candidates = [
                    Path("C:/Windows/Fonts/arial.ttf"),
                    Path("C:/Windows/Fonts/calibri.ttf"),
                    Path("C:/Windows/Fonts/segoeui.ttf"),
                ]
                system_font = next((f for f in font_candidates if f.exists()), None)
                if system_font:
                    escaped_font = str(system_font).replace("\\", "/").replace(":", "\\:")
                    font_sz = max(24, int(out_w * 0.038))
                    y_pos = f"h-th-{int(out_h * 0.08)}" if not (i == 0 and title) else f"(h-th)/2"
                    text_filter = (
                        f",drawtext=fontfile='{escaped_font}':text='{clean_text}':fontsize={font_sz}:"
                        f"fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=10:"
                        f"x=(w-text_w)/2:y={y_pos}"
                    )

            # Assemble scene filter
            filter_parts.append(
                f"[{i}:v]scale={out_w}:{out_h}:force_original_aspect_ratio=increase,"
                f"crop={out_w}:{out_h},"
                f"{eff}{filter_expr}{text_filter},"
                f"trim=duration={scene_dur},setsar=1[v{i}];"
            )

        # Concatenate scenes cleanly
        concat_inputs = "".join(f"[v{i}]" for i in range(total_images))
        filter_parts.append(f"{concat_inputs}concat=n={total_images}:v=1:a=0[vout];")

        # Audio filter with volume and fade in/out
        if selected_audio and selected_audio.exists():
            fade_out_start = max(0.1, total_duration - 1.5)
            vol_val = max(0.1, min(1.5, audio_volume))
            filter_parts.append(
                f"[{total_images}:a]afade=t=in:ss=0:d=1.0,afade=t=out:st={fade_out_start}:d=1.5,volume={vol_val}[aout]"
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
            timeout=180,
        )

        if res.returncode != 0:
            logger.error(f"FFmpeg render failed: {res.stderr}")
            return False, f"FFmpeg error: {res.stderr[-500:]}"

        if not output_mp4.exists() or output_mp4.stat().st_size == 0:
            return False, "Render failed: output MP4 file was not created or is empty."

        return True, "Success"

    except subprocess.TimeoutExpired:
        return False, "Rendering process timed out after 180 seconds."
    except Exception as e:
        return False, f"Unexpected error during render: {str(e)}"
    finally:
        if temp_generated_audio and temp_generated_audio.exists():
            try:
                temp_generated_audio.unlink()
            except Exception:
                pass
