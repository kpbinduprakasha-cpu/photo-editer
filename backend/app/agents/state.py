"""LangGraph shared state definition for FotoOwl multi-agent video reel generation."""

from typing import Any, Dict, List, Optional
from typing_extensions import TypedDict


class VideoGenerationState(TypedDict):
    job_id: str
    prompt: str
    aspect_ratio: str
    style: str
    duration_seconds: int
    music_enabled: bool
    captions_enabled: bool
    images: List[Dict[str, Any]]
    analyses: List[Dict[str, Any]]
    storyboard: Optional[Dict[str, Any]]
    script: Optional[Dict[str, Any]]
    compilation_success: bool
    compilation_errors: List[str]
    repair_attempts: int
    render_success: bool
    output_video_path: Optional[str]
    download_url: Optional[str]
    error_message: Optional[str]
    current_agent: str
