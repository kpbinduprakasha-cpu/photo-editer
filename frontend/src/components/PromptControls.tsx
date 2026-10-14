import React from 'react';
import { Sparkles, Sliders, Music, Subtitles, Play } from 'lucide-react';

interface PromptControlsProps {
  prompt: string;
  setPrompt: (val: string) => void;
  aspectRatio: string;
  setAspectRatio: (val: string) => void;
  style: string;
  setStyle: (val: string) => void;
  duration: number;
  setDuration: (val: number) => void;
  musicEnabled: boolean;
  setMusicEnabled: (val: boolean) => void;
  captionsEnabled: boolean;
  setCaptionsEnabled: (val: boolean) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  canGenerate: boolean;
}

const PRESET_PROMPTS = [
  'Aesthetic cinematic sunset montage with warm tones and gentle transitions',
  'Dynamic travel recap highlighting scenery and candid portrait moments',
  'Minimalist modern architectural visual story with rhythmic pacing',
  'Vibrant celebration reel with punchy upbeat energy and bold titles',
];

export const PromptControls: React.FC<PromptControlsProps> = ({
  prompt,
  setPrompt,
  aspectRatio,
  setAspectRatio,
  style,
  setStyle,
  duration,
  setDuration,
  musicEnabled,
  setMusicEnabled,
  captionsEnabled,
  setCaptionsEnabled,
  onGenerate,
  isGenerating,
  canGenerate,
}) => {
  return (
    <div className="card-panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Sliders className="text-orange-400" size={18} />
          <h2 className="panel-title">2. Prompt & Video Settings</h2>
        </div>
      </div>

      <div className="space-y-4">
        {/* Natural Language Prompt */}
        <div>
          <label className="input-label flex items-center justify-between">
            <span>Natural-Language Reel Vision</span>
            <span className="text-xs text-zinc-400">Multi-agent creative guidance</span>
          </label>
          <textarea
            className="input-textarea"
            rows={3}
            placeholder="Describe your desired reel vibe, story, mood, or focus..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
          />

          {/* Inspiration Chips */}
          <div className="prompt-chips">
            {PRESET_PROMPTS.map((preset, i) => (
              <button
                key={i}
                type="button"
                className="chip-btn"
                onClick={() => setPrompt(preset)}
                disabled={isGenerating}
              >
                <Sparkles size={11} className="text-orange-400" />
                <span className="truncate max-w-[200px]">{preset}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Aspect Ratio Selector */}
        <div>
          <label className="input-label">Aspect Ratio</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: '9:16', label: '9:16 Vertical Reel', sub: 'TikTok, Reels, Shorts' },
              { id: '16:9', label: '16:9 Widescreen', sub: 'YouTube, Desktop' },
              { id: '1:1', label: '1:1 Square', sub: 'Feed Post, Carousel' },
            ].map((ratio) => (
              <button
                key={ratio.id}
                type="button"
                className={`ratio-btn ${aspectRatio === ratio.id ? 'ratio-btn-active' : ''}`}
                onClick={() => setAspectRatio(ratio.id)}
                disabled={isGenerating}
              >
                <span className="font-bold">{ratio.id}</span>
                <span className="text-xs text-zinc-400">{ratio.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Style & Duration Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Style Selector */}
          <div>
            <label className="input-label">Aesthetic Style</label>
            <select
              className="input-select"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              disabled={isGenerating}
            >
              <option value="cinematic">Cinematic (Film Grade & Smooth Pans)</option>
              <option value="aesthetic">Aesthetic Mood (Soft & Warm)</option>
              <option value="energetic">Energetic (Punchy & Fast Cuts)</option>
              <option value="minimalist">Minimalist (Clean & Elegant)</option>
            </select>
          </div>

          {/* Duration Slider */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="input-label mb-0">Reel Duration</label>
              <span className="duration-badge">{duration} Seconds</span>
            </div>
            <input
              type="range"
              min={5}
              max={60}
              step={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              disabled={isGenerating}
              className="slider-input"
            />
            <div className="flex justify-between text-[11px] text-zinc-500 mt-1">
              <span>5s (Short)</span>
              <span>15s (Reel)</span>
              <span>30s (Story)</span>
              <span>60s (Full)</span>
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <label className="toggle-card">
            <input
              type="checkbox"
              checked={musicEnabled}
              onChange={(e) => setMusicEnabled(e.target.checked)}
              disabled={isGenerating}
              className="toggle-checkbox"
            />
            <div className="flex items-center gap-2">
              <Music size={16} className={musicEnabled ? 'text-orange-400' : 'text-zinc-500'} />
              <div>
                <div className="toggle-title">Background Audio</div>
                <div className="toggle-sub">Cinematic ambient music track</div>
              </div>
            </div>
          </label>

          <label className="toggle-card">
            <input
              type="checkbox"
              checked={captionsEnabled}
              onChange={(e) => setCaptionsEnabled(e.target.checked)}
              disabled={isGenerating}
              className="toggle-checkbox"
            />
            <div className="flex items-center gap-2">
              <Subtitles size={16} className={captionsEnabled ? 'text-orange-400' : 'text-zinc-500'} />
              <div>
                <div className="toggle-title">Smart Captions</div>
                <div className="toggle-sub">Animated narrative subtitle cues</div>
              </div>
            </div>
          </label>
        </div>

        {/* Generate Button */}
        <div className="pt-2">
          <button
            onClick={onGenerate}
            disabled={!canGenerate || isGenerating}
            className={`generate-btn ${
              isGenerating
                ? 'generate-btn-loading'
                : canGenerate
                ? 'generate-btn-ready'
                : 'generate-btn-disabled'
            }`}
          >
            <Play size={18} fill="currentColor" />
            <span>
              {isGenerating
                ? 'Generating Multi-Agent Reel...'
                : canGenerate
                ? 'Generate Video Reel'
                : 'Upload Photos to Begin'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
