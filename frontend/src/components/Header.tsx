import React from 'react';
import { Film, Cpu, HardDrive, History, CheckCircle2, AlertCircle } from 'lucide-react';
import type { HealthStatus } from '../types';

interface HeaderProps {
  health: HealthStatus | null;
  onOpenOllamaModal: () => void;
  onOpenHistory: () => void;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  onOpenOllamaModal,
  onOpenHistory,
  historyCount,
}) => {
  return (
    <header className="header-container">
      <div className="header-brand">
        <div className="logo-icon-wrap">
          <Film className="logo-icon" size={26} />
        </div>
        <div>
          <div className="brand-title-wrap">
            <h1 className="brand-title">FotoOwl</h1>
            <span className="brand-badge">Multi-Agent AI</span>
          </div>
          <p className="brand-subtitle">Automated Video Reel Synthesis & Storyboard Orchestration</p>
        </div>
      </div>

      <div className="header-actions">
        {/* Ollama Status Pill */}
        <button
          onClick={onOpenOllamaModal}
          className={`status-pill ${health?.ollama_available ? 'status-pill-active' : 'status-pill-warning'}`}
          title="Click to manage Ollama local vision & LLM models"
        >
          <Cpu size={15} />
          <span>
            {health?.ollama_available
              ? `Ollama AI: ${health.ollama_models?.length || 0} Model(s)`
              : 'Ollama: Offline (CV Fallback)'}
          </span>
          {health?.ollama_available ? (
            <CheckCircle2 size={13} className="text-emerald-400" />
          ) : (
            <AlertCircle size={13} className="text-amber-400" />
          )}
        </button>

        {/* FFmpeg Status Pill */}
        <div
          className={`status-pill ${health?.ffmpeg_available ? 'status-pill-active' : 'status-pill-error'}`}
          title={health?.ffmpeg_version || 'FFmpeg engine status'}
        >
          <HardDrive size={15} />
          <span>{health?.ffmpeg_available ? 'FFmpeg: Ready' : 'FFmpeg: Missing'}</span>
        </div>

        {/* Job History Button */}
        <button onClick={onOpenHistory} className="history-btn">
          <History size={16} />
          <span>Past Reels ({historyCount})</span>
        </button>
      </div>
    </header>
  );
};
