import React, { useRef } from 'react';
import { Download, CheckCircle2, RotateCcw, Sparkles, ExternalLink, Volume2, Sliders } from 'lucide-react';
import type { Job } from '../types';
import { getFileUrl } from '../api';

interface VideoPlayerProps {
  job: Job;
  onReset: () => void;
  onOpenExport?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ job, onReset, onOpenExport }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!job.output_video_path && !job.download_url && !job.stream_url) return null;

  const streamUrl = job.stream_url
    ? getFileUrl(job.stream_url)
    : getFileUrl(`/storage/outputs/reel_${job.id}.mp4`);

  const downloadUrl = job.download_url
    ? getFileUrl(job.download_url)
    : streamUrl;

  const aspectClass =
    job.aspect_ratio === '9:16'
      ? 'aspect-[9/16] max-h-[640px] w-auto'
      : job.aspect_ratio === '1:1'
      ? 'aspect-square max-h-[520px] w-auto'
      : 'aspect-video max-h-[480px] w-full';

  const mood = job.storyboard?.background_music_mood || job.style || 'cinematic';
  const moodBadge =
    mood === 'wedding'
      ? '💒 Wedding & Romance Harmony'
      : mood === 'nature'
      ? '🌲 Serene Nature Ambient'
      : mood === 'celebration'
      ? '🎉 Festive Upbeat Groove'
      : mood === 'aesthetic'
      ? '☕ Warm Lo-Fi Chords'
      : '🎬 Cinematic Hollywood Score';

  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  };

  return (
    <div className="card-panel border-emerald-500/50 shadow-2xl shadow-emerald-500/15 animate-in fade-in duration-300">
      <div className="panel-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="panel-title text-emerald-300 text-base md:text-lg">
                Your AI Video Reel is Ready!
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                1080p Cinema MP4
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs text-zinc-400">
                Format: <strong className="text-zinc-200 font-mono">{job.aspect_ratio}</strong> • Duration: <strong className="text-zinc-200 font-mono">{job.duration_seconds}s</strong>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                <Sparkles size={11} />
                {moodBadge}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenExport && (
            <button
              type="button"
              onClick={onOpenExport}
              className="btn-secondary flex items-center gap-2 text-xs md:text-sm py-2 px-3 text-zinc-300 hover:text-white"
              title="Change Resolution (1080p), FPS, or Audio Volume"
            >
              <Sliders size={15} className="text-orange-400" />
              <span>Export Options</span>
            </button>
          )}
          <a
            href={downloadUrl}
            download={`FotoOwl_Reel_${job.id.slice(0, 8)}.mp4`}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Download size={16} />
            <span>Download MP4</span>
          </a>
        </div>
      </div>

      {/* Cinema Theater Player with Ambient Backlight Glow */}
      <div className="cinema-theater-container">
        <div className="cinema-ambient-light" />

        <div
          onClick={handleTogglePlay}
          className={`relative z-10 rounded-2xl overflow-hidden shadow-2xl border-2 border-zinc-700/80 bg-black flex items-center justify-center cursor-pointer transition-all hover:border-orange-500/60 ${aspectClass}`}
        >
          <video
            ref={videoRef}
            src={streamUrl}
            controls
            autoPlay
            loop
            playsInline
            preload="auto"
            className="w-full h-full object-contain"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <Volume2 size={15} className="animate-pulse" />
          <span>Soundtrack Synchronized • Beat-Detected Cuts • Ken Burns Dynamics Active</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-5 w-full">
          <a
            href={downloadUrl}
            download={`FotoOwl_Reel_${job.id.slice(0, 8)}.mp4`}
            className="btn-primary flex items-center gap-2 px-6 py-3 text-sm md:text-base font-bold shadow-lg shadow-orange-500/30"
          >
            <Download size={18} />
            <span>Save MP4 to Device</span>
          </a>

          <a
            href={streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex items-center gap-2 px-4 py-3 text-xs md:text-sm text-zinc-300"
          >
            <ExternalLink size={15} />
            <span>Fullscreen Theater</span>
          </a>

          {onOpenExport && (
            <button
              type="button"
              onClick={onOpenExport}
              className="btn-secondary flex items-center gap-2 px-4 py-3 text-xs md:text-sm text-orange-300 hover:text-orange-200 border-orange-500/30 hover:border-orange-500/50"
            >
              <Sliders size={15} />
              <span>Export Custom 1080p / 60fps</span>
            </button>
          )}

          <button onClick={onReset} className="btn-secondary flex items-center gap-2 px-4 py-3 text-xs md:text-sm">
            <RotateCcw size={15} />
            <span>Create Another Reel</span>
          </button>
        </div>
      </div>
    </div>
  );
};
