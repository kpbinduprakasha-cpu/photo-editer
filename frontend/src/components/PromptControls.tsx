import React from 'react';
import { Sparkles, Sliders, Music, Subtitles, Play, Loader2 } from 'lucide-react';

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
  isUploading: boolean;
  canGenerate: boolean;
  photoCount: number;
}

const PRESET_PROMPTS = [
  '💒 Romantic wedding celebration with elegant titles & gentle transitions',
  '🌲 Scenic nature exploration with sweeping landscape pans & serene mood',
  '🎉 High-energy party celebration with confetti & punchy dynamic cuts',
  '🎬 Cinematic aesthetic visual story with warm tones & rhythmic pacing',
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
  isUploading,
  canGenerate,
  photoCount,
}) => {
  return (
    <div className="card-panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Sliders className="text-orange-400" size={18} />
          <h2 className="panel-title">2. Prompt & Video Settings</h2>
        </div>
        {photoCount > 0 && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            {photoCount} Photos Ready
          </span>
        )}
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
            placeholder="Describe your desired reel vibe (e.g. Wedding celebration, nature landscape, party highlights)..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating || isUploading}
          />

          {/* Inspiration Chips */}
          <div className="prompt-chips">
            {PRESET_PROMPTS.map((preset, i) => (
              <button
                key={i}
                type="button"
                className="chip-btn"
                onClick={() => setPrompt(preset)}
                disabled={isGenerating || isUploading}
              >
                <Sparkles size={11} className="text-orange-400 shrink-0" />
                <span className="truncate max-w-[220px]">{preset}</span>
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
                disabled={isGenerating || isUploading}
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
            <label className="input-label">Aesthetic Theme & Music</label>
            <select
              className="input-select"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              disabled={isGenerating || isUploading}
            >
              <option value="cinematic">🎬 Cinematic Film Grade (Smooth & Emotional)</option>
              <option value="wedding">💒 Wedding & Romance (Harp & Sweet Chimes)</option>
              <option value="nature">🌲 Serene Nature (Acoustic Pastoral)</option>
              <option value="energetic">🎉 Vibrant Celebration (Upbeat & Punchy)</option>
              <option value="aesthetic">☕ Lo-Fi Aesthetic (Warm & Relaxed)</option>
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
              disabled={isGenerating || isUploading}
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
              disabled={isGenerating || isUploading}
              className="toggle-checkbox"
            />
            <div className="flex items-center gap-2">
              <Music size={16} className={musicEnabled ? 'text-orange-400' : 'text-zinc-500'} />
              <div>
                <div className="toggle-title">Theme Soundtrack</div>
                <div className="toggle-sub">AI-composed mood audio</div>
              </div>
            </div>
          </label>

          <label className="toggle-card">
            <input
              type="checkbox"
              checked={captionsEnabled}
              onChange={(e) => setCaptionsEnabled(e.target.checked)}
              disabled={isGenerating || isUploading}
              className="toggle-checkbox"
            />
            <div className="flex items-center gap-2">
              <Subtitles size={16} className={captionsEnabled ? 'text-orange-400' : 'text-zinc-500'} />
              <div>
                <div className="toggle-title">Smart Captions</div>
                <div className="toggle-sub">Scene subtitle overlays</div>
              </div>
            </div>
          </label>
        </div>

        {/* Generate Button */}
        <div className="pt-2">
          <button
            onClick={onGenerate}
            disabled={!canGenerate || isGenerating || isUploading}
            className={`generate-btn ${
              isGenerating || isUploading
                ? 'generate-btn-loading'
                : canGenerate
                ? 'generate-btn-ready'
                : 'generate-btn-disabled'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Optimizing & Uploading Photos...</span>
              </>
            ) : isGenerating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Generating Multi-Agent Reel...</span>
              </>
            ) : canGenerate ? (
              <>
                <Play size={18} fill="currentColor" />
                <span>Generate Video Reel ({photoCount} {photoCount === 1 ? 'photo' : 'photos'})</span>
              </>
            ) : (
              <>
                <Play size={18} fill="currentColor" />
                <span>Choose Photos or Tap a Sample Reel to Begin</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
