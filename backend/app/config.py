"""Configuration and environment settings for FotoOwl Video Reel Generator."""

import os
import shutil
from pathlib import Path
from typing import List, Optional

# Root Directories
APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
ROOT_DIR = BACKEND_DIR.parent

# Storage Directories
STORAGE_DIR = BACKEND_DIR / "storage"
UPLOAD_DIR = STORAGE_DIR / "uploads"
OUTPUT_DIR = STORAGE_DIR / "outputs"
TEMP_DIR = STORAGE_DIR / "temp"

# Remotion Project Directory
REMOTION_DIR = ROOT_DIR / "remotion"

# Frontend Distribution Directory (for all-in-one single-link serving)
FRONTEND_DIST_DIR = ROOT_DIR / "frontend" / "dist"

# Ensure directories exist
for directory in [STORAGE_DIR, UPLOAD_DIR, OUTPUT_DIR, TEMP_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Database
DB_PATH = STORAGE_DIR / "fotoowl.db"

# Validation Constraints
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_IMAGE_MIMES = {"image/jpeg", "image/png", "image/webp"}

# Timeout Configurations (seconds)
AGENT_TIMEOUT_SECONDS = 180
COMPILATION_TIMEOUT_SECONDS = 60
RENDER_TIMEOUT_SECONDS = 300
MAX_COMPILATION_REPAIRS = 3

# Ollama Settings
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
DEFAULT_VISION_MODEL = os.getenv("OLLAMA_VISION_MODEL", "moondream")
FALLBACK_VISION_MODELS: List[str] = ["llama3.2-vision", "llava", "llava-phi3", "minicpm-v"]
DEFAULT_LLM_MODEL = os.getenv("OLLAMA_LLM_MODEL", "llama3.2")
FALLBACK_LLM_MODELS: List[str] = ["mistral", "llama3", "qwen2.5", "phi3"]


def resolve_ffmpeg_path() -> Optional[str]:
    """Locate FFmpeg executable across PATH and known Windows installation locations."""
    # 1. Standard PATH
    found = shutil.which("ffmpeg")
    if found:
        return found

    # 2. Check WinGet / Gyan default installation paths
    user_profile = os.getenv("USERPROFILE", "")
    local_app_data = os.getenv("LOCALAPPDATA", "")
    candidates = [
        Path(local_app_data) / "Microsoft" / "WinGet" / "Links" / "ffmpeg.exe",
        Path("C:/Program Files/KMPlayer 64X/LAVFilters64/ffmpeg.exe"),
        Path("C:/ffmpeg/bin/ffmpeg.exe"),
        Path(user_profile) / "scoop" / "shims" / "ffmpeg.exe",
        Path("C:/ProgramData/chocolatey/bin/ffmpeg.exe"),
    ]

    for candidate in candidates:
        if candidate.exists() and candidate.is_file():
            return str(candidate)

    # 3. Search WinGet Packages directory
    winget_pkgs = Path(local_app_data) / "Microsoft" / "WinGet" / "Packages"
    if winget_pkgs.exists():
        for match in winget_pkgs.glob("**/ffmpeg.exe"):
            if match.is_file():
                return str(match)

    return None


def resolve_ffprobe_path() -> Optional[str]:
    """Locate FFprobe executable."""
    found = shutil.which("ffprobe")
    if found:
        return found

    user_profile = os.getenv("USERPROFILE", "")
    local_app_data = os.getenv("LOCALAPPDATA", "")
    candidates = [
        Path(local_app_data) / "Microsoft" / "WinGet" / "Links" / "ffprobe.exe",
        Path("C:/ffmpeg/bin/ffprobe.exe"),
        Path(user_profile) / "scoop" / "shims" / "ffprobe.exe",
        Path("C:/ProgramData/chocolatey/bin/ffprobe.exe"),
    ]

    for candidate in candidates:
        if candidate.exists() and candidate.is_file():
            return str(candidate)

    winget_pkgs = Path(local_app_data) / "Microsoft" / "WinGet" / "Packages"
    if winget_pkgs.exists():
        for match in winget_pkgs.glob("**/ffprobe.exe"):
            if match.is_file():
                return str(match)

    return None


FFMPEG_BINARY = resolve_ffmpeg_path()
FFPROBE_BINARY = resolve_ffprobe_path()
