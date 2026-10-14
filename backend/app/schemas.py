"""Pydantic schemas for FotoOwl API and agent data contracts."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    python_version: str
    ffmpeg_available: bool
    ffmpeg_version: Optional[str] = None
    ffprobe_available: bool
    ollama_available: bool
    ollama_models: List[str] = []
    active_storage_dir: str


class ImageAnalysis(BaseModel):
    image_id: str
    filename: str
    subject: str = Field(description="Primary subject or focus of the photo")
    scene_type: str = Field(description="e.g. outdoor, indoor, portrait, landscape, architectural")
    mood: str = Field(description="Visual mood or aesthetic tone")
    image_quality: str = Field(description="high, medium, low")
    orientation: str = Field(description="portrait, landscape, square")
    colors: List[str] = Field(default_factory=list, description="Dominant colors or palette")
    relevance_score: float = Field(ge=0.0, le=1.0, description="Relevance to prompt (0 to 1)")
    tags: List[str] = Field(default_factory=list)
    suggested_caption: Optional[str] = None


class StoryboardScene(BaseModel):
    scene_index: int
    image_id: str
    filename: str
    duration_seconds: float = 3.0
    caption: str = ""
    transition: str = "fade"  # fade, slide_left, slide_right, zoom_in, wipe
    ken_burns_effect: str = "zoom_in"  # zoom_in, zoom_out, pan_left, pan_right
    visual_focus: Optional[str] = None
    overlay_title: Optional[str] = None


class Storyboard(BaseModel):
    title: str = "My Reel"
    aspect_ratio: str = "9:16"  # 9:16, 16:9, 1:1
    style: str = "cinematic"
    total_duration_seconds: float = 15.0
    background_music_mood: str = "upbeat"
    scenes: List[StoryboardScene] = []


class RemotionScriptConfig(BaseModel):
    composition_id: str = "ReelComposition"
    width: int = 1080
    height: int = 1920
    fps: int = 30
    duration_in_frames: int = 450
    title: str
    aspect_ratio: str
    scenes: List[Dict[str, Any]]
    music_enabled: bool = True
    captions_enabled: bool = True


class JobCreateRequest(BaseModel):
    prompt: str = Field(default="Create an aesthetic, dynamic video reel highlighting the best moments")
    aspect_ratio: str = Field(default="9:16", pattern="^(9:16|16:9|1:1)$")
    style: str = Field(default="cinematic")
    duration_seconds: int = Field(default=15, ge=5, le=60)
    music_enabled: bool = True
    captions_enabled: bool = True


class JobResponse(BaseModel):
    id: str
    prompt: str
    aspect_ratio: str
    style: str
    duration_seconds: int
    music_enabled: bool
    captions_enabled: bool
    status: str
    current_agent: str
    progress_pct: int
    error_message: Optional[str] = None
    storyboard: Optional[Storyboard] = None
    script: Optional[Dict[str, Any]] = None
    output_video_path: Optional[str] = None
    download_url: Optional[str] = None
    stream_url: Optional[str] = None
    created_at: str
    updated_at: str
    image_count: int = 0


class LogEntry(BaseModel):
    id: int
    agent_name: str
    level: str
    message: str
    timestamp: str


class ImageItem(BaseModel):
    id: str
    job_id: str
    original_filename: str
    stored_filename: str
    file_size: int
    width: Optional[int] = None
    height: Optional[int] = None
    mime_type: str
    sequence_index: int
    preview_url: str
    analysis: Optional[Dict[str, Any]] = None
