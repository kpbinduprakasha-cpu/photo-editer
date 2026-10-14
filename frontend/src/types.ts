export interface HealthStatus {
  status: string;
  python_version: string;
  ffmpeg_available: boolean;
  ffmpeg_version?: string;
  ffprobe_available: boolean;
  ollama_available: boolean;
  ollama_models: string[];
  active_storage_dir: string;
}

export interface ModelStatus {
  ollama_connected: boolean;
  ollama_url: string;
  installed_models: string[];
  vision_models_installed: string[];
  llm_models_installed: string[];
  recommended_vision_model: string;
  alternative_vision_models: string[];
  recommended_llm_model: string;
}

export interface ImageItem {
  id: string;
  job_id: string;
  original_filename: string;
  stored_filename: string;
  file_size: number;
  width?: number;
  height?: number;
  mime_type: string;
  sequence_index: number;
  preview_url: string;
  analysis?: {
    subject?: string;
    scene_type?: string;
    mood?: string;
    image_quality?: string;
    orientation?: string;
    colors?: string[];
    relevance_score?: number;
    tags?: string[];
    suggested_caption?: string;
    detected_theme?: string;
    faces_detected?: number;
    focal_point?: [number, number];
  };
}

export interface StoryboardScene {
  scene_index: number;
  image_id: string;
  filename: string;
  duration_seconds: number;
  caption: string;
  transition: string;
  ken_burns_effect: string;
  visual_focus?: string;
  overlay_title?: string;
}

export interface Storyboard {
  title: string;
  aspect_ratio: string;
  style: string;
  total_duration_seconds: number;
  background_music_mood: string;
  scenes: StoryboardScene[];
}

export interface Job {
  id: string;
  prompt: string;
  aspect_ratio: string;
  style: string;
  duration_seconds: number;
  music_enabled: boolean;
  captions_enabled: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  current_agent: string;
  progress_pct: number;
  error_message?: string;
  storyboard?: Storyboard;
  script?: any;
  output_video_path?: string;
  download_url?: string;
  stream_url?: string;
  created_at: string;
  updated_at: string;
  image_count: number;
}

export interface SamplePack {
  id: string;
  name: string;
  description: string;
  badge: string;
  theme: string;
  suggested_prompt: string;
  aspect_ratio: string;
  style: string;
  music_mood: string;
  duration_seconds: number;
  files: { filename: string; label: string }[];
}

export interface LogEntry {
  id: number;
  agent_name: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

export interface VideoTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  duration_seconds: number;
  aspect_ratio: string;
  music_mood: string;
  filter_effect: string;
  scene_count: number;
  scenes_blueprint?: {
    label: string;
    effect: string;
    duration: number;
    caption: string;
  }[];
}

export interface AudioTrack {
  id: string;
  title: string;
  category: string;
  genre: string;
  mood: string;
  filename: string;
  description: string;
  bpm: number;
  license: string;
  preview_url: string;
}

export interface ExportSettings {
  resolution: '1080p' | '720p';
  fps: 24 | 30 | 60;
  aspect_ratio?: string;
  music_mood?: string;
  custom_audio_path?: string;
  audio_volume: number;
}
