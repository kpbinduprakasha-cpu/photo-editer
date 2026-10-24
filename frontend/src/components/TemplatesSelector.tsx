import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Clock,
  Check,
  Play,
  Film,
  Layers,
  Heart,
  Trees,
  Flame,
  PartyPopper,
  Plane,
  Users,
  ShoppingBag,
} from 'lucide-react';
import type { VideoTemplate, ImageItem } from '../types';
import { fetchTemplates, applyTemplate } from '../api';

interface TemplatesSelectorProps {
  currentJobId?: string;
  selectedTemplateId?: string;
  onTemplateApplied: (jobId: string, template: VideoTemplate, images?: ImageItem[]) => void;
  isGenerating?: boolean;
}

export const TemplatesSelector: React.FC<TemplatesSelectorProps> = ({
  currentJobId,
  selectedTemplateId,
  onTemplateApplied,
  isGenerating = false,
}) => {
  const [templates, setTemplates] = useState<VideoTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeId, setActiveId] = useState<string>(selectedTemplateId || 'wedding-anniversary');
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    fetchTemplates()
      .then((data) => {
        setTemplates(data);
        setLoading(false);
        if (!selectedTemplateId && data.length > 0) {
          const weddingTmpl = data.find((t) => t.id === 'wedding-anniversary') || data[0];
          setActiveId(weddingTmpl.id);
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load templates');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedTemplateId) {
      setActiveId(selectedTemplateId);
    }
  }, [selectedTemplateId]);

  const handleSelectTemplate = async (template: VideoTemplate) => {
    if (isGenerating) return;
    setActiveId(template.id);
    setApplyingId(template.id);
    setError(null);
    try {
      const res = await applyTemplate(template.id, currentJobId);
      onTemplateApplied(res.job_id, template, res.images);
    } catch (err: any) {
      setError(err.message || 'Failed to apply template');
    } finally {
      setApplyingId(null);
    }
  };

  const getTemplateTheme = (id: string) => {
    switch (id) {
      case 'wedding-anniversary':
        return {
          icon: <Heart className="text-pink-400" size={18} />,
          badgeBg: 'bg-pink-500/15 border-pink-500/30 text-pink-300',
          gradient: 'from-pink-500/10 via-rose-500/5 to-transparent',
          borderActive: 'border-pink-500 ring-pink-500/40 shadow-pink-500/15',
          buttonActive: 'bg-pink-500',
          category: 'romance',
        };
      case 'nature-landscape':
        return {
          icon: <Trees className="text-emerald-400" size={18} />,
          badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
          gradient: 'from-emerald-500/10 via-teal-500/5 to-transparent',
          borderActive: 'border-emerald-500 ring-emerald-500/40 shadow-emerald-500/15',
          buttonActive: 'bg-emerald-500',
          category: 'nature',
        };
      case 'social-reels':
        return {
          icon: <Flame className="text-rose-400" size={18} />,
          badgeBg: 'bg-orange-500/15 border-orange-500/30 text-orange-300',
          gradient: 'from-orange-500/10 via-amber-500/5 to-transparent',
          borderActive: 'border-orange-500 ring-orange-500/40 shadow-orange-500/15',
          buttonActive: 'bg-orange-500',
          category: 'reels',
        };
      case 'birthday-celebration':
        return {
          icon: <PartyPopper className="text-amber-400" size={18} />,
          badgeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
          gradient: 'from-amber-500/10 via-yellow-500/5 to-transparent',
          borderActive: 'border-amber-500 ring-amber-500/40 shadow-amber-500/15',
          buttonActive: 'bg-amber-500',
          category: 'romance',
        };
      case 'travel-adventure':
        return {
          icon: <Plane className="text-cyan-400" size={18} />,
          badgeBg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
          gradient: 'from-cyan-500/10 via-blue-500/5 to-transparent',
          borderActive: 'border-cyan-500 ring-cyan-500/40 shadow-cyan-500/15',
          buttonActive: 'bg-cyan-500',
          category: 'nature',
        };
      case 'family-heritage':
        return {
          icon: <Users className="text-blue-400" size={18} />,
          badgeBg: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
          gradient: 'from-blue-500/10 via-indigo-500/5 to-transparent',
          borderActive: 'border-blue-500 ring-blue-500/40 shadow-blue-500/15',
          buttonActive: 'bg-blue-500',
          category: 'romance',
        };
      case 'cinematic-widescreen':
        return {
          icon: <Film className="text-purple-400" size={18} />,
          badgeBg: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
          gradient: 'from-purple-500/10 via-violet-500/5 to-transparent',
          borderActive: 'border-purple-500 ring-purple-500/40 shadow-purple-500/15',
          buttonActive: 'bg-purple-500',
          category: 'nature',
        };
      case 'product-ad':
        return {
          icon: <ShoppingBag className="text-teal-400" size={18} />,
          badgeBg: 'bg-teal-500/15 border-teal-500/30 text-teal-300',
          gradient: 'from-teal-500/10 via-emerald-500/5 to-transparent',
          borderActive: 'border-teal-500 ring-teal-500/40 shadow-teal-500/15',
          buttonActive: 'bg-teal-500',
          category: 'reels',
        };
      default:
        return {
          icon: <Sparkles className="text-orange-400" size={18} />,
          badgeBg: 'bg-orange-500/15 border-orange-500/30 text-orange-300',
          gradient: 'from-orange-500/10 via-rose-500/5 to-transparent',
          borderActive: 'border-orange-500 ring-orange-500/40 shadow-orange-500/15',
          buttonActive: 'bg-orange-500',
          category: 'all',
        };
    }
  };

  const filteredTemplates = templates.filter((t) => {
    if (categoryFilter === 'all') return true;
    const theme = getTemplateTheme(t.id);
    return theme.category === categoryFilter;
  });

  if (loading) {
    return (
      <div className="card-panel py-12 text-center text-zinc-400">
        <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-3" />
        <span className="text-sm font-semibold text-zinc-300">Loading Hollywood Director Styles...</span>
      </div>
    );
  }

  return (
    <div className="card-panel border-orange-500/20 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/30">
            <Layers size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="panel-title text-base text-zinc-100 font-bold">
                1. Choose Director Style & Template
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase tracking-wider">
                8 Curated Packs
              </span>
            </div>
            <p className="panel-subtitle text-xs text-zinc-400">
              Click any style to immediately load matching photos, camera choreography, and synchronized soundtrack.
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900/90 rounded-xl border border-zinc-800 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              categoryFilter === 'all'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            All Styles (8)
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('romance')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              categoryFilter === 'romance'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            💒 Romance & Events
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('nature')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              categoryFilter === 'nature'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            🌲 Nature & Cinema
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('reels')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              categoryFilter === 'reels'
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            🔥 Reels & Shorts
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300">
          {error}
        </div>
      )}

      {/* 8 Template Boxes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-4">
        {filteredTemplates.map((tmpl) => {
          const isSelected = activeId === tmpl.id;
          const isApplying = applyingId === tmpl.id;
          const theme = getTemplateTheme(tmpl.id);

          return (
            <div
              key={tmpl.id}
              onClick={() => handleSelectTemplate(tmpl)}
              className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-300 cursor-pointer select-none group ${
                isSelected
                  ? `bg-gradient-to-b from-[#1c1d28] to-[#12141c] ${theme.borderActive} ring-2 shadow-2xl`
                  : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 hover:-translate-y-0.5'
              }`}
            >
              <div>
                {/* Header: Icon + Title + Aspect Ratio Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg border ${isSelected ? theme.badgeBg : 'bg-zinc-800/80 border-zinc-700/60'}`}>
                      {theme.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-zinc-100 line-clamp-1 group-hover:text-white transition-colors">
                        {tmpl.title}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-mono font-bold text-orange-400">
                          {tmpl.aspect_ratio}
                        </span>
                        <span className="text-[10px] text-zinc-500">•</span>
                        <span className="text-[10px] text-zinc-400">
                          {tmpl.duration_seconds}s
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-zinc-400 mt-2.5 line-clamp-2 leading-relaxed">
                  {tmpl.description}
                </p>

                {/* Pills: Duration & Mood */}
                <div className="flex flex-wrap items-center gap-1.5 mt-3 text-[11px]">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-zinc-300">
                    <Clock size={11} className="text-orange-400" />
                    {tmpl.scene_count} Scenes
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border capitalize font-medium ${theme.badgeBg}`}>
                    <Sparkles size={11} />
                    #{tmpl.music_mood}
                  </span>
                </div>

                {/* Clean Feature Blueprint Preview */}
                {tmpl.scenes_blueprint && tmpl.scenes_blueprint.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-800/60 space-y-1">
                    <div className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                      Camera Movements:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {tmpl.scenes_blueprint.slice(0, 4).map((sc, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700/40"
                        >
                          {sc.effect.replace('_', ' ')}
                        </span>
                      ))}
                      {tmpl.scenes_blueprint.length > 4 && (
                        <span className="text-[10px] px-1.5 py-0.5 text-zinc-400">
                          +{tmpl.scenes_blueprint.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between">
                <span
                  className={`text-xs font-semibold flex items-center gap-1.5 ${
                    isSelected ? 'text-orange-400' : 'text-zinc-400 group-hover:text-zinc-200'
                  }`}
                >
                  {isApplying ? 'Applying Style...' : isSelected ? '✓ Active Style' : 'Click to Load'}
                </span>

                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    isSelected
                      ? `${theme.buttonActive} text-white shadow-lg shadow-orange-500/30 scale-105`
                      : 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-white'
                  }`}
                >
                  {isSelected ? <Check size={14} /> : <Play size={11} className="ml-0.5" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
