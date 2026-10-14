import React, { useRef } from 'react';
import { Download, CheckCircle2, RotateCcw, Sparkles, ExternalLink, Volume2 } from 'lucide-react';
import type { Job } from '../types';
import { getFileUrl } from '../api';

interface VideoPlayerProps {
  job: Job;
  onReset: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ job, onReset }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!job.output_video_path && !job.download_url && !job.stream_url) return null;

  // Stream URL for inline playback (Content-Disposition: inline + Range support)
  const streamUrl = job.stream_url
    ? getFileUrl(job.stream_url)
    : getFileUrl(`/storage/outputs/reel_${job.id}.mp4`);

  // Download URL for file saving
  const downloadUrl = job.download_url
    ? getFileUrl(job.download_url)
    : streamUrl;

  const aspectClass =
    job.aspect_ratio === '9:16'
      ? 'aspect-[9/16] max-h-[600px] w-auto'
      : job.aspect_ratio === '1:1'
      ? 'aspect-square max-h-[500px] w-auto'
      : 'aspect-video max-h-[460px] w-full';

  const mood = job.storyboard?.background_music_mood || job.style || 'cinematic';
  const moodBadge =
    mood === 'wedding'
      ? '💒 Wedding & Romance Music'
      : mood === 'nature'
      ? '🌲 Serene Nature Harmony'
      : mood === 'celebration'
      ? '🎉 Festive Upbeat Groove'
      : mood === 'aesthetic'
      ? '☕ Warm Lo-Fi Vibes'
      : '🎬 Cinematic Ambient Score';

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
    <div className="card-panel border-emerald-500/40 shadow-2xl shadow-emerald-500/10">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="text-emerald-400" size={22} />
          <div>
            <h2 className="panel-title text-emerald-300">Your AI Video Reel is Ready!</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs text-zinc-400">
                Verified MP4 • {job.aspect_ratio} • {job.duration_seconds}s
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                <Sparkles size={10} />
                {moodBadge}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
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

      <div className="flex flex-col items-center justify-center p-4 md:p-6 bg-zinc-950/80 rounded-xl border border-zinc-800/80">
        <div
          onClick={handleTogglePlay}
          className={`relative rounded-xl overflow-hidden shadow-2xl border border-zinc-700/60 bg-black flex items-center justify-center cursor-pointer ${aspectClass}`}
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

        <div className="flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <Volume2 size={14} className="animate-pulse" />
          <span>Soundtrack Active: {moodBadge} (Tap video or controls for sound)</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-6 w-full">
          <a
            href={downloadUrl}
            download={`FotoOwl_Reel_${job.id.slice(0, 8)}.mp4`}
            className="btn-primary flex items-center gap-2 px-5 py-2.5"
          >
            <Download size={16} />
            <span>Save Video to Device</span>
          </a>

          <a
            href={streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex items-center gap-2 px-4 py-2.5 text-xs text-zinc-300"
          >
            <ExternalLink size={14} />
            <span>Open in Fullscreen</span>
          </a>

          <button onClick={onReset} className="btn-secondary flex items-center gap-2 px-4 py-2.5">
            <RotateCcw size={15} />
            <span>Create Another Reel</span>
          </button>
        </div>
      </div>
    </div>
  );
};
