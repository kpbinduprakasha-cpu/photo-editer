import React from 'react';
import { Film, Cpu, HardDrive, History, CheckCircle2, AlertCircle, QrCode } from 'lucide-react';
import type { HealthStatus } from '../types';

interface HeaderProps {
  health: HealthStatus | null;
  onOpenOllamaModal: () => void;
  onOpenHistory: () => void;
  onOpenQrModal?: () => void;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  onOpenOllamaModal,
  onOpenHistory,
  onOpenQrModal,
  historyCount,
}) => {
  return (
    <header className="header-container">
      <div className="header-brand">
        <div className="logo-icon-wrap">
          <Film className="logo-icon" size={24} />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#090a0f] animate-pulse" />
        </div>
        <div>
          <div className="brand-title-wrap">
            <h1 className="brand-title">FotoOwl Studio</h1>
            <span className="brand-badge">PRO CINEMA</span>
          </div>
          <p className="brand-subtitle">Autonomous AI Video Reel Synthesis & Instagram Beat Engine</p>
        </div>
      </div>

      <div className="header-actions">
        {/* Mobile View QR Scanner Button */}
        {onOpenQrModal && (
          <button
            onClick={onOpenQrModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-orange-500/20 hover:from-orange-500/30 hover:to-amber-500/30 text-orange-300 border border-orange-500/40 text-xs font-bold transition-all shadow-md shadow-orange-500/10 cursor-pointer group"
            title="Scan QR Code to open FotoOwl immediately on your mobile phone"
          >
            <QrCode size={15} className="text-orange-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Mobile Scanner</span>
            <span className="sm:hidden">QR</span>
          </button>
        )}

        {/* Ollama Status Pill */}
        <button
          onClick={onOpenOllamaModal}
          className={`status-pill ${health?.ollama_available ? 'status-pill-active' : 'status-pill-warning'}`}
          title="Click to manage Ollama local vision & LLM models"
        >
          <Cpu size={14} />
          <span className="hidden md:inline">
            {health?.ollama_available
              ? `Vision AI: ${health.ollama_models?.length || 0} Model(s)`
              : 'Ollama: Offline (CV Fallback)'}
          </span>
          <span className="md:hidden">AI</span>
          {health?.ollama_available ? (
            <CheckCircle2 size={13} className="text-emerald-400" />
          ) : (
            <AlertCircle size={13} className="text-amber-400" />
          )}
        </button>

        {/* FFmpeg 1080p Engine Pill */}
        <div
          className={`status-pill hidden sm:flex ${health?.ffmpeg_available ? 'status-pill-active' : 'status-pill-error'}`}
          title={health?.ffmpeg_version || 'FFmpeg engine status'}
        >
          <HardDrive size={14} />
          <span>{health?.ffmpeg_available ? '1080p Engine' : 'FFmpeg Missing'}</span>
        </div>

        {/* Job History Button */}
        <button onClick={onOpenHistory} className="history-btn">
          <History size={15} />
          <span>Past Reels ({historyCount})</span>
        </button>
      </div>
    </header>
  );
};
