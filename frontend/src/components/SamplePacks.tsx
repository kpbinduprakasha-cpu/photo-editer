import React from 'react';
import { Sparkles, Heart, Trees, PartyPopper, ArrowRight } from 'lucide-react';
import type { SamplePack } from '../types';

interface SamplePacksProps {
  packs: SamplePack[];
  onSelectPack: (pack: SamplePack) => void;
  isLoading: boolean;
  activePackId?: string;
  disabled: boolean;
}

export const SamplePacks: React.FC<SamplePacksProps> = ({
  packs,
  onSelectPack,
  isLoading,
  activePackId,
  disabled,
}) => {
  if (!packs || packs.length === 0) return null;

  const getIcon = (theme: string) => {
    switch (theme) {
      case 'wedding':
        return <Heart className="text-pink-400" size={18} />;
      case 'nature':
        return <Trees className="text-emerald-400" size={18} />;
      case 'celebration':
        return <PartyPopper className="text-amber-400" size={18} />;
      default:
        return <Sparkles className="text-orange-400" size={18} />;
    }
  };

  const getBorderColor = (theme: string, isActive: boolean) => {
    if (isActive) return 'border-orange-500 bg-orange-950/20 shadow-lg shadow-orange-500/10';
    switch (theme) {
      case 'wedding':
        return 'hover:border-pink-500/50 hover:bg-pink-950/10';
      case 'nature':
        return 'hover:border-emerald-500/50 hover:bg-emerald-950/10';
      case 'celebration':
        return 'hover:border-amber-500/50 hover:bg-amber-950/10';
      default:
        return 'hover:border-orange-500/50 hover:bg-orange-950/10';
    }
  };

  return (
    <div className="card-panel border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="text-orange-400" size={18} />
          <h3 className="text-sm font-semibold text-zinc-100">
            Instant 1-Click Sample Reels
          </h3>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
            Zero Upload
          </span>
        </div>
        <p className="text-xs text-zinc-400">
          Tap any theme to load curated photos & matching soundtrack immediately
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {packs.map((pack) => {
          const isActive = activePackId === pack.id;
          return (
            <button
              key={pack.id}
              type="button"
              disabled={disabled || isLoading}
              onClick={() => onSelectPack(pack)}
              className={`text-left p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                getBorderColor(pack.theme, isActive)
              } ${isActive ? 'ring-1 ring-orange-500/50' : 'border-zinc-800 bg-zinc-900/60'}`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {getIcon(pack.theme)}
                    <span className="text-sm font-medium text-zinc-100">{pack.name}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                    {pack.files.length} Photos
                  </span>
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2 mb-2 leading-relaxed">
                  {pack.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-400">
                <span className="text-orange-400/90 font-medium capitalize">
                  {pack.music_mood} Music • {pack.duration_seconds}s
                </span>
                <span className="flex items-center gap-1 text-orange-400 font-medium group-hover:translate-x-0.5 transition-transform">
                  {isLoading && isActive ? 'Loading...' : 'Try Reel'}
                  <ArrowRight size={12} />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
