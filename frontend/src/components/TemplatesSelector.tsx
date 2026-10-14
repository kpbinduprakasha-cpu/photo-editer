import React, { useEffect, useState } from 'react';
import { LayoutTemplate, Sparkles, Clock, Check, ArrowRight } from 'lucide-react';
import type { VideoTemplate } from '../types';
import { fetchTemplates, applyTemplate } from '../api';

interface TemplatesSelectorProps {
  currentJobId?: string;
  onTemplateApplied: (jobId: string, template: VideoTemplate) => void;
}

export const TemplatesSelector: React.FC<TemplatesSelectorProps> = ({
  currentJobId,
  onTemplateApplied,
}) => {
  const [templates, setTemplates] = useState<VideoTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applying, setApplying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates()
      .then((data) => {
        setTemplates(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load templates');
        setLoading(false);
      });
  }, []);

  const handleApply = async (template: VideoTemplate) => {
    setSelectedId(template.id);
    setApplying(true);
    setError(null);
    try {
      const res = await applyTemplate(template.id, currentJobId);
      onTemplateApplied(res.job_id, template);
    } catch (err: any) {
      setError(err.message || 'Failed to apply template');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="card-panel py-8 text-center text-zinc-400">
        <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />
        <span>Loading Director Video Templates...</span>
      </div>
    );
  }

  return (
    <div className="card-panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="text-primary-400" size={20} />
          <div>
            <h2 className="panel-title">Director Video Templates (Module 8)</h2>
            <p className="panel-subtitle">
              Choose a professionally curated blueprint with synchronized motion, duration, and soundtrack.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
        {templates.map((tmpl) => {
          const isSelected = selectedId === tmpl.id;
          return (
            <div
              key={tmpl.id}
              onClick={() => handleApply(tmpl)}
              className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all cursor-pointer select-none ${
                isSelected
                  ? 'bg-primary-950/40 border-primary-500 shadow-lg shadow-primary-500/20'
                  : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm text-zinc-100 line-clamp-1">
                    {tmpl.title}
                  </h3>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {tmpl.aspect_ratio}
                  </span>
                </div>

                <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                  {tmpl.description}
                </p>

                <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] text-zinc-400">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700/50">
                    <Clock size={11} className="text-primary-400" />
                    {tmpl.duration_seconds}s ({tmpl.scene_count} scenes)
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-300 border border-orange-500/20 capitalize">
                    <Sparkles size={11} />
                    {tmpl.music_mood}
                  </span>
                </div>

                {tmpl.scenes_blueprint && tmpl.scenes_blueprint.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-800/60">
                    <div className="text-[10px] text-zinc-400 font-medium mb-1">Blueprint Outline:</div>
                    <div className="space-y-1">
                      {tmpl.scenes_blueprint.slice(0, 3).map((sc, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[10px] text-zinc-400">
                          <span className="truncate max-w-[130px]">{idx + 1}. {sc.label}</span>
                          <span className="text-primary-400 font-mono">{sc.effect.replace('_', ' ')}</span>
                        </div>
                      ))}
                      {tmpl.scenes_blueprint.length > 3 && (
                        <div className="text-[10px] text-zinc-400 italic">
                          + {tmpl.scenes_blueprint.length - 3} more scenes...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                <span className="text-xs font-medium text-primary-400 flex items-center gap-1">
                  {isSelected && applying ? 'Applying...' : 'Apply Blueprint'}
                </span>
                <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 group-hover:bg-primary-600 transition-colors">
                  {isSelected ? <Check size={14} className="text-emerald-400" /> : <ArrowRight size={14} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
