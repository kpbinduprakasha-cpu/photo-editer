import React, { useState } from 'react';
import { Download, Sliders, X, RefreshCw, Tv, Monitor } from 'lucide-react';
import type { ExportSettings } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExport: (settings: ExportSettings) => void;
  exporting: boolean;
  defaultAspectRatio?: string;
  defaultMusicMood?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onConfirmExport,
  exporting,
  defaultAspectRatio = '9:16',
  defaultMusicMood = 'trending',
}) => {
  const [resolution, setResolution] = useState<'1080p' | '720p'>('1080p');
  const [aspectRatio, setAspectRatio] = useState<string>(defaultAspectRatio);
  const [fps, setFps] = useState<24 | 30 | 60>(30);
  const [volume, setVolume] = useState<number>(1.0);

  if (!isOpen) return null;

  const handleExport = () => {
    onConfirmExport({
      resolution,
      aspect_ratio: aspectRatio,
      fps,
      music_mood: defaultMusicMood,
      audio_volume: volume,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="card-panel max-w-md w-full border-primary-500/40 shadow-2xl shadow-primary-500/10">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-primary-400" />
            <h2 className="text-base font-bold text-zinc-100">Video Export Settings (Module 12)</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 my-4">
          {/* 1. Resolution */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              Target Resolution:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setResolution('1080p')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 ${
                  resolution === '1080p'
                    ? 'bg-primary-950/60 border-primary-500 text-primary-300 shadow-sm'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <Monitor size={14} />
                <span>1080p Full HD</span>
              </button>
              <button
                type="button"
                onClick={() => setResolution('720p')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 ${
                  resolution === '720p'
                    ? 'bg-primary-950/60 border-primary-500 text-primary-300 shadow-sm'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <Tv size={14} />
                <span>720p Fast HD</span>
              </button>
            </div>
          </div>

          {/* 2. Aspect Ratio */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              Framing & Aspect Ratio:
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { value: '9:16', label: '9:16 (Reels/Shorts)' },
                { value: '16:9', label: '16:9 (Landscape)' },
                { value: '1:1', label: '1:1 (Square Feed)' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setAspectRatio(item.value)}
                  className={`py-2 px-1 rounded-lg border text-center font-medium ${
                    aspectRatio === item.value
                      ? 'bg-primary-950/60 border-primary-500 text-primary-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Frame Rate */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              Frame Rate (FPS):
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { value: 30, label: '30 FPS (Standard)' },
                { value: 60, label: '60 FPS (Ultra Smooth)' },
                { value: 24, label: '24 FPS (Cinematic)' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFps(item.value as any)}
                  className={`py-2 px-1 rounded-lg border text-center font-medium ${
                    fps === item.value
                      ? 'bg-primary-950/60 border-primary-500 text-primary-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Audio Volume */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 mb-1">
              <span>Soundtrack Volume:</span>
              <span className="font-mono text-primary-400">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.5"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full accent-primary-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={exporting}
            className="btn-secondary text-xs px-3 py-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2"
          >
            {exporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
            <span>{exporting ? 'Rendering MP4...' : 'Render & Export MP4'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
