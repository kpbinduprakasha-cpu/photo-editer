import React, { useState } from 'react';
import { X, Cpu, Download, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import type { ModelStatus } from '../types';
import { pullModel } from '../api';

interface OllamaModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: ModelStatus | null;
  onRefresh: () => void;
}

export const OllamaModal: React.FC<OllamaModalProps> = ({
  isOpen,
  onClose,
  models,
  onRefresh,
}) => {
  const [downloadingModel, setDownloadingModel] = useState<string | null>(null);
  const [pullMsg, setPullMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePull = async (modelName: string) => {
    setDownloadingModel(modelName);
    setPullMsg(`Requesting Ollama to pull ${modelName}... (This downloads in background)`);
    try {
      await pullModel(modelName);
      setPullMsg(`Pull initiated for ${modelName}. Ollama will download the model layers.`);
      setTimeout(() => {
        onRefresh();
      }, 3000);
    } catch (e: any) {
      setPullMsg(`Failed to trigger pull: ${e.message}`);
    } finally {
      setDownloadingModel(null);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content max-w-2xl">
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Cpu className="text-orange-400" size={22} />
            <div>
              <h3 className="modal-title">Local AI Models & Ollama Integration</h3>
              <p className="text-xs text-zinc-400">100% private, locally runnable open-source vision & text models</p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body space-y-4">
          {/* Status Box */}
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
            models?.ollama_connected
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-amber-500/10 border-amber-500/30'
          }`}>
            {models?.ollama_connected ? (
              <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={18} />
            ) : (
              <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={18} />
            )}
            <div className="text-xs">
              <span className="font-semibold text-zinc-200">
                {models?.ollama_connected ? 'Ollama Server Connected' : 'Ollama Offline / Not Detected'}
              </span>
              <p className="text-zinc-400 mt-1">
                {models?.ollama_connected
                  ? `Running at ${models.ollama_url}. Installed models: ${models.installed_models.length > 0 ? models.installed_models.join(', ') : 'None pulled yet'}.`
                  : 'FotoOwl automatically uses its integrated computer vision analyzer when Ollama is offline or model is not loaded.'}
              </p>
            </div>
          </div>

          {/* Model Recommendations */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-200 mb-2">Recommended Free & Open Models</h4>
            <div className="space-y-2">
              {[
                {
                  name: 'moondream',
                  role: 'Vision Analysis',
                  size: '1.8B (~800MB)',
                  req: 'Runs fast on CPU / 8GB-16GB RAM',
                  desc: 'Ideal lightweight open vision model for subject & scene analysis.',
                },
                {
                  name: 'llama3.2',
                  role: 'Storyboard Writer',
                  size: '3B (~2GB)',
                  req: 'Runs smoothly on CPU / Integrated GPU',
                  desc: 'Fast, high-quality open LLM for narrative sequencing and captions.',
                },
                {
                  name: 'llama3.2-vision',
                  role: 'Advanced Vision',
                  size: '11B (~7.9GB)',
                  req: 'Requires 12GB+ free RAM or Dedicated GPU',
                  desc: 'State-of-the-art multimodal vision model.',
                },
              ].map((m) => {
                const isInstalled = models?.installed_models?.some((inst) => inst.startsWith(m.name));

                return (
                  <div key={m.name} className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-zinc-200">{m.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">{m.role}</span>
                        <span className="text-[10px] text-zinc-500">{m.size}</span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">{m.desc}</p>
                      <span className="text-[11px] text-orange-400/80">{m.req}</span>
                    </div>

                    <div>
                      {isInstalled ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold px-2 py-1 bg-emerald-500/10 rounded">
                          <CheckCircle2 size={13} /> Installed
                        </span>
                      ) : (
                        <button
                          onClick={() => handlePull(m.name)}
                          disabled={!models?.ollama_connected || downloadingModel === m.name}
                          className="btn-secondary text-xs flex items-center gap-1 py-1.5 px-3"
                        >
                          <Download size={12} />
                          <span>{downloadingModel === m.name ? 'Pulling...' : 'Pull Model'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {pullMsg && (
            <div className="p-2.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-300">
              {pullMsg}
            </div>
          )}

          {/* System Spec & License Notes */}
          <div className="p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-lg flex items-start gap-2 text-xs text-zinc-400">
            <Info size={16} className="text-zinc-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-zinc-300">Hardware & Licensing Information:</strong>
              <p className="mt-0.5">
                • Moondream is licensed under Apache 2.0. Llama 3.2 is under Meta Community License.
              </p>
              <p>
                • On integrated GPUs with 16GB RAM, <code>moondream</code> (1.8B) and <code>llama3.2</code> (3B) provide instant inference without memory exhaustion.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
