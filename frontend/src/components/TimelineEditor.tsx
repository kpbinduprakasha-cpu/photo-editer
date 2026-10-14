import React, { useState } from 'react';
import {
  Film,
  MoveLeft,
  MoveRight,
  Trash2,
  Copy,
  Sliders,
  Clock,
  Sparkles,
  Type,
  Music,
  RefreshCw,
} from 'lucide-react';
import type { StoryboardScene, ImageItem } from '../types';
import { getFileUrl } from '../api';

interface TimelineEditorProps {
  scenes: StoryboardScene[];
  images: ImageItem[];
  onUpdateScenes: (updated: StoryboardScene[]) => void;
  onTriggerRender: () => void;
  rendering: boolean;
}

const MOTION_OPTIONS = [
  { value: 'zoom_in', label: '🔍 Zoom In (Forward)' },
  { value: 'zoom_out', label: '🔍 Zoom Out (Reveal)' },
  { value: 'pan_left', label: '⬅️ Pan Left' },
  { value: 'pan_right', label: '➡️ Pan Right' },
  { value: 'tilt_up', label: '⬆️ Tilt Up (Ascend)' },
  { value: 'tilt_down', label: '⬇️ Tilt Down' },
  { value: 'rotate', label: '🔄 Orbit / Spin' },
];

const FILTER_OPTIONS = [
  { value: 'none', label: '✨ Natural (Original)' },
  { value: 'cinematic', label: '🎬 Cinematic Moody' },
  { value: 'vibrant', label: '🌈 Vibrant Pop' },
  { value: 'vintage', label: '🎞️ Vintage Sepia' },
  { value: 'warm', label: '🌅 Golden Hour Warm' },
  { value: 'cool', label: '❄️ Cool Nordic' },
  { value: 'bw', label: '🖤 Dramatic B&W' },
  { value: 'vignette', label: '⭕ Soft Vignette' },
];

export const TimelineEditor: React.FC<TimelineEditorProps> = ({
  scenes,
  images,
  onUpdateScenes,
  onTriggerRender,
  rendering,
}) => {
  const [selectedClipIndex, setSelectedClipIndex] = useState<number | null>(0);

  const imageMap = new Map<string, ImageItem>();
  images.forEach((img) => imageMap.set(img.id, img));

  const totalDuration = scenes.reduce((acc, s) => acc + (s.duration_seconds || 3.0), 0);

  // Move clip left
  const handleMoveLeft = (index: number) => {
    if (index <= 0) return;
    const copy = [...scenes];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    // Re-index
    copy.forEach((sc, i) => (sc.scene_index = i));
    onUpdateScenes(copy);
    setSelectedClipIndex(index - 1);
  };

  // Move clip right
  const handleMoveRight = (index: number) => {
    if (index >= scenes.length - 1) return;
    const copy = [...scenes];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    copy.forEach((sc, i) => (sc.scene_index = i));
    onUpdateScenes(copy);
    setSelectedClipIndex(index + 1);
  };

  // Delete clip
  const handleDelete = (index: number) => {
    if (scenes.length <= 1) return; // Keep at least one clip
    const copy = scenes.filter((_, i) => i !== index);
    copy.forEach((sc, i) => (sc.scene_index = i));
    onUpdateScenes(copy);
    setSelectedClipIndex(Math.max(0, index - 1));
  };

  // Duplicate clip
  const handleDuplicate = (index: number) => {
    const copy = [...scenes];
    const cloned = { ...copy[index] };
    copy.splice(index + 1, 0, cloned);
    copy.forEach((sc, i) => (sc.scene_index = i));
    onUpdateScenes(copy);
    setSelectedClipIndex(index + 1);
  };

  // Update specific clip field
  const handleUpdateClip = (index: number, patch: Partial<StoryboardScene>) => {
    const copy = [...scenes];
    copy[index] = { ...copy[index], ...patch };
    onUpdateScenes(copy);
  };

  const activeClip = selectedClipIndex !== null && scenes[selectedClipIndex] ? scenes[selectedClipIndex] : null;
  const activeImage = activeClip ? imageMap.get(activeClip.image_id) : null;

  return (
    <div className="card-panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Film className="text-primary-400" size={20} />
          <div>
            <h2 className="panel-title">Interactive Timeline & Clip Editor (Module 9 & 10)</h2>
            <p className="panel-subtitle">
              Drag, reorder, adjust durations, configure camera dynamics, text overlays, and color grading.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-zinc-300 font-mono bg-zinc-900/90 px-3 py-1.5 rounded-lg border border-zinc-800 flex items-center gap-1.5">
            <Clock size={13} className="text-primary-400" />
            <span>Total Duration: <strong>{totalDuration.toFixed(1)}s</strong> ({scenes.length} clips)</span>
          </div>

          <button
            type="button"
            onClick={onTriggerRender}
            disabled={rendering || scenes.length === 0}
            className="btn-primary text-xs flex items-center gap-1.5 px-3.5 py-1.5"
          >
            {rendering ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
            <span>{rendering ? 'Rendering...' : 'Render Timeline Reel'}</span>
          </button>
        </div>
      </div>

      {/* Multi-Track Timeline Visualizer */}
      <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 overflow-x-auto space-y-3">
        {/* Track 1: Video / Image Clips */}
        <div>
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Film size={11} className="text-primary-400" />
            <span>Track 1: Video & Photograph Clips</span>
          </div>
          <div className="flex items-center gap-2 min-w-max pb-1">
            {scenes.map((scene, idx) => {
              const img = imageMap.get(scene.image_id);
              const isSelected = selectedClipIndex === idx;
              const imgUrl = img?.preview_url ? getFileUrl(img.preview_url) : '';

              return (
                <div
                  key={`timeline-clip-${idx}`}
                  onClick={() => setSelectedClipIndex(idx)}
                  className={`relative flex-shrink-0 w-36 h-28 rounded-lg overflow-hidden border transition-all cursor-pointer group ${
                    isSelected
                      ? 'border-primary-500 ring-2 ring-primary-500/30 shadow-lg'
                      : 'border-zinc-800 hover:border-zinc-700 opacity-90 hover:opacity-100'
                  }`}
                >
                  {/* Thumbnail */}
                  {imgUrl ? (
                    <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-500 text-xs">
                      Photo {idx + 1}
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex flex-col justify-between p-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-white backdrop-blur-sm">
                        #{idx + 1}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary-950/80 text-primary-300 border border-primary-500/40">
                        {scene.duration_seconds}s
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-300 font-medium truncate block max-w-full drop-shadow">
                        {scene.ken_burns_effect.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Track 2: Audio Soundtrack Track */}
        <div>
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Music size={11} className="text-emerald-400" />
            <span>Track 2: Audio & Soundtrack (Continuous Sync)</span>
          </div>
          <div className="h-7 rounded-md bg-emerald-950/30 border border-emerald-800/40 flex items-center px-3 gap-2 text-xs text-emerald-400">
            <div className="flex-1 flex items-center gap-1 overflow-hidden h-3">
              {Array.from({ length: 48 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-emerald-500/60 rounded-full"
                  style={{ height: `${20 + ((i * 17) % 80)}%` }}
                />
              ))}
            </div>
            <span className="text-[10px] font-mono whitespace-nowrap text-emerald-300">
              Synced to {totalDuration.toFixed(1)}s (192kbps AAC Stereo)
            </span>
          </div>
        </div>

        {/* Track 3: Text & Titles Track */}
        <div>
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Type size={11} className="text-orange-400" />
            <span>Track 3: Text & Caption Overlays</span>
          </div>
          <div className="flex items-center gap-2 min-w-max">
            {scenes.map((scene, idx) => (
              <div
                key={`text-track-${idx}`}
                className="w-36 h-6 rounded bg-orange-950/20 border border-orange-800/30 flex items-center px-2 text-[10px] text-orange-300 truncate"
              >
                {idx === 0 && scene.overlay_title ? (
                  <span className="font-bold">Title: {scene.overlay_title}</span>
                ) : (
                  <span>{scene.caption || '(no caption)'}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Clip Properties Inspector */}
      {activeClip && (
        <div className="mt-4 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              {activeImage && activeImage.preview_url && (
                <img
                  src={getFileUrl(activeImage.preview_url)}
                  alt={activeClip.filename}
                  className="w-7 h-7 rounded object-cover border border-zinc-700"
                />
              )}
              <Sliders size={16} className="text-primary-400" />
              <h3 className="text-xs font-bold text-zinc-200">
                Editing Clip #{selectedClipIndex! + 1}: {activeClip.filename}
              </h3>
            </div>

            {/* Clip Reorder and Actions */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleMoveLeft(selectedClipIndex!)}
                disabled={selectedClipIndex === 0}
                className="btn-secondary p-1.5 text-xs text-zinc-300 disabled:opacity-40"
                title="Move clip earlier"
              >
                <MoveLeft size={13} />
              </button>
              <button
                type="button"
                onClick={() => handleMoveRight(selectedClipIndex!)}
                disabled={selectedClipIndex === scenes.length - 1}
                className="btn-secondary p-1.5 text-xs text-zinc-300 disabled:opacity-40"
                title="Move clip later"
              >
                <MoveRight size={13} />
              </button>
              <button
                type="button"
                onClick={() => handleDuplicate(selectedClipIndex!)}
                className="btn-secondary p-1.5 text-xs text-zinc-300"
                title="Duplicate clip"
              >
                <Copy size={13} />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(selectedClipIndex!)}
                disabled={scenes.length <= 1}
                className="btn-secondary p-1.5 text-xs text-red-400 hover:text-red-300 disabled:opacity-40"
                title="Delete clip"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            {/* 1. Camera Motion Dynamics */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                Camera Motion (Module 4 & 7):
              </label>
              <select
                value={activeClip.ken_burns_effect || 'zoom_in'}
                onChange={(e) =>
                  handleUpdateClip(selectedClipIndex!, { ken_burns_effect: e.target.value })
                }
                className="input-field text-xs py-1.5 w-full"
              >
                {MOTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Color Grading Filter */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                Visual Filter (Module 10):
              </label>
              <select
                value={(activeClip as any).filter_effect || 'none'}
                onChange={(e) =>
                  handleUpdateClip(selectedClipIndex!, { filter_effect: e.target.value } as any)
                }
                className="input-field text-xs py-1.5 w-full"
              >
                {FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Clip Duration */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                Duration (Seconds):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1.5"
                  max="8.0"
                  step="0.5"
                  value={activeClip.duration_seconds || 3.0}
                  onChange={(e) =>
                    handleUpdateClip(selectedClipIndex!, {
                      duration_seconds: parseFloat(e.target.value),
                    })
                  }
                  className="flex-1 accent-primary-500 cursor-pointer"
                />
                <span className="text-xs font-mono text-zinc-200 w-10">
                  {activeClip.duration_seconds}s
                </span>
              </div>
            </div>

            {/* 4. Text Caption Overlay */}
            <div className="md:col-span-3">
              <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                Text Caption / Subtitle Overlay:
              </label>
              <input
                type="text"
                value={activeClip.caption || ''}
                onChange={(e) =>
                  handleUpdateClip(selectedClipIndex!, { caption: e.target.value })
                }
                placeholder="Enter caption for this scene..."
                className="input-field text-xs py-1.5 w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
