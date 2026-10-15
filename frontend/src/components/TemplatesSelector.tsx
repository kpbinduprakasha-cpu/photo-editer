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

  useEffect(() => {
    fetchTemplates()
      .then((data) => {
        setTemplates(data);
        setLoading(false);
        // Default to wedding if not selected
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

  const getTemplateIcon = (id: string) => {
    switch (id) {
      case 'wedding-anniversary':
        return <Heart className="text-pink-400" size={18} />;
      case 'nature-landscape':
        return <Trees className="text-emerald-400" size={18} />;
      case 'social-reels':
        return <Flame className="text-rose-400" size={18} />;
      case 'birthday-celebration':
        return <PartyPopper className="text-amber-400" size={18} />;
      case 'travel-adventure':
        return <Plane className="text-cyan-400" size={18} />;
      case 'family-heritage':
        return <Users className="text-blue-400" size={18} />;
      case 'cinematic-widescreen':
        return <Film className="text-purple-400" size={18} />;
      case 'product-ad':
        return <ShoppingBag className="text-teal-400" size={18} />;
      default:
        return <Sparkles className="text-orange-400" size={18} />;
    }
  };

  if (loading) {
    return (
      <div className="card-panel py-8 text-center text-zinc-400">
        <div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-2" />
        <span>Loading Video Templates...</span>
      </div>
    );
  }

  return (
    <div className="card-panel border-orange-500/20 shadow-xl">
      <div className="panel-header pb-2">
        <div className="flex items-center gap-2">
          <Layers className="text-orange-400" size={20} />
          <div>
            <h2 className="panel-title text-base text-zinc-100">
              Select Video Style & Template
            </h2>
            <p className="panel-subtitle text-xs text-zinc-400">
              Click any style box below to instantly load matching scenes, camera motion, and audio.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300">
          {error}
        </div>
      )}

      {/* 8 Template Boxes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-3">
        {templates.map((tmpl) => {
          const isSelected = activeId === tmpl.id;
          const isApplying = applyingId === tmpl.id;

          return (
            <div
              key={tmpl.id}
              onClick={() => handleSelectTemplate(tmpl)}
              className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all cursor-pointer select-none group ${
                isSelected
                  ? 'bg-gradient-to-b from-[#1c1d28] to-[#14151f] border-orange-500 ring-2 ring-orange-500/40 shadow-xl shadow-orange-500/10'
                  : 'bg-zinc-900/70 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/60'
              }`}
            >
              <div>
                {/* Header: Icon + Title + Aspect Ratio Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-orange-500/20' : 'bg-zinc-800'}`}>
                      {getTemplateIcon(tmpl.id)}
                    </div>
                    <h3 className="font-bold text-sm text-zinc-100 line-clamp-1 group-hover:text-white">
                      {tmpl.title}
                    </h3>
                  </div>
                  <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800/90 text-zinc-300 border border-zinc-700 shrink-0">
                    {tmpl.aspect_ratio}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                  {tmpl.description}
                </p>

                {/* Pills: Duration & Mood */}
                <div className="flex flex-wrap items-center gap-1.5 mt-3 text-[11px]">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800/90 border border-zinc-700/60 text-zinc-300">
                    <Clock size={11} className="text-orange-400" />
                    {tmpl.duration_seconds}s ({tmpl.scene_count} scenes)
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/20 capitalize font-medium">
                    <Sparkles size={11} />
                    #{tmpl.music_mood}
                  </span>
                </div>

                {/* Clean Feature Blueprint Preview */}
                {tmpl.scenes_blueprint && tmpl.scenes_blueprint.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-800/60 space-y-1">
                    <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                      Included Movements:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {tmpl.scenes_blueprint.slice(0, 4).map((sc, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-300 border border-zinc-700/40"
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
              <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                <span
                  className={`text-xs font-semibold flex items-center gap-1 ${
                    isSelected ? 'text-orange-400' : 'text-zinc-400 group-hover:text-zinc-200'
                  }`}
                >
                  {isApplying ? 'Loading...' : isSelected ? '✓ Active Template' : 'Click to Select'}
                </span>

                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/40'
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
