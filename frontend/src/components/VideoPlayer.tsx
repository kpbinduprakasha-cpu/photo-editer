import React from 'react';
import { Download, CheckCircle2, RotateCcw } from 'lucide-react';
import type { Job } from '../types';
import { getFileUrl } from '../api';

interface VideoPlayerProps {
  job: Job;
  onReset: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ job, onReset }) => {
  if (!job.output_video_path && !job.download_url) return null;

  const videoUrl = job.download_url
    ? getFileUrl(job.download_url)
    : getFileUrl(`/storage/outputs/reel_${job.id}.mp4`);

  const aspectClass =
    job.aspect_ratio === '9:16'
      ? 'aspect-[9/16] max-h-[620px]'
      : job.aspect_ratio === '1:1'
      ? 'aspect-square max-h-[520px]'
      : 'aspect-video max-h-[480px]';

  return (
    <div className="card-panel border-emerald-500/30">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="text-emerald-400" size={20} />
          <div>
            <h2 className="panel-title text-emerald-300">Generated Video Reel Ready!</h2>
            <p className="text-xs text-zinc-400">
              Verified playable MP4 stream • Aspect ratio {job.aspect_ratio} • Duration {job.duration_seconds}s
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={videoUrl}
            download={`FotoOwl_Reel_${job.id.slice(0, 8)}.mp4`}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Download size={16} />
            <span>Download MP4</span>
          </a>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-4 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
        <div className={`relative rounded-xl overflow-hidden shadow-2xl border border-zinc-700/60 ${aspectClass}`}>
          <video
            src={videoUrl}
            controls
            autoPlay
            loop
            playsInline
            className="w-full h-full object-contain bg-black"
          />
        </div>

        <div className="flex items-center gap-4 mt-6">
          <a
            href={videoUrl}
            download={`FotoOwl_Reel_${job.id.slice(0, 8)}.mp4`}
            className="btn-primary flex items-center gap-2"
          >
            <Download size={16} />
            <span>Download Video File</span>
          </a>

          <button onClick={onReset} className="btn-secondary flex items-center gap-2">
            <RotateCcw size={15} />
            <span>Create New Reel</span>
          </button>
        </div>
      </div>
    </div>
  );
};
