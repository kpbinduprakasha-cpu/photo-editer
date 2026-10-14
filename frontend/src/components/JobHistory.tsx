import React from 'react';
import { X, Play, Trash2 } from 'lucide-react';
import type { Job } from '../types';

interface JobHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: Job[];
  onSelectJob: (jobId: string) => void;
  onDeleteJob: (jobId: string) => void;
}

export const JobHistory: React.FC<JobHistoryProps> = ({
  isOpen,
  onClose,
  jobs,
  onSelectJob,
  onDeleteJob,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content max-w-2xl">
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Job History & Generated Reels</h3>
            <p className="text-xs text-zinc-400">Previous reel generation runs stored in SQLite</p>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body max-h-[60vh] overflow-y-auto space-y-3">
          {jobs.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              No jobs created yet. Upload photos and generate your first video reel!
            </div>
          ) : (
            jobs.map((j) => (
              <div key={j.id} className="history-item-card">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-zinc-200 truncate">
                      {j.prompt || 'Untitled Reel'}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        j.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : j.status === 'failed'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {j.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-zinc-400">
                    <span>Aspect: {j.aspect_ratio}</span>
                    <span>Duration: {j.duration_seconds}s</span>
                    <span>Style: {j.style}</span>
                    <span>{new Date(j.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      onSelectJob(j.id);
                      onClose();
                    }}
                    className="btn-secondary text-xs flex items-center gap-1 py-1.5 px-3"
                  >
                    <Play size={12} />
                    <span>View</span>
                  </button>
                  <button
                    onClick={() => onDeleteJob(j.id)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg transition"
                    title="Delete Job"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
