import React from 'react';
import {
  Eye,
  BookOpen,
  FileCode,
  Wrench,
  Video,
  CheckCircle,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import type { Job } from '../types';

interface AgentTimelineProps {
  job: Job | null;
  onRetry: () => void;
  isRetrying: boolean;
}

const AGENTS = [
  {
    id: 'Image Analyser',
    name: '1. Image Analyser',
    desc: 'Extracts subjects, scenes, orientation, and color palette via Vision AI',
    icon: Eye,
  },
  {
    id: 'Storyboard Writer',
    name: '2. Storyboard Writer',
    desc: 'Structures narrative arc, calculated scene pacing, and subtitles',
    icon: BookOpen,
  },
  {
    id: 'Script Generator',
    name: '3. Script Generator',
    desc: 'Translates storyboard into exact Remotion frame composition props',
    icon: FileCode,
  },
  {
    id: 'Compiler & Fixer',
    name: '4. Compiler & Fixer',
    desc: 'Diagnoses asset references, performs bounded repairs, and verifies syntax',
    icon: Wrench,
  },
  {
    id: 'Renderer',
    name: '5. Renderer',
    desc: 'Composes video with Ken Burns pans, validates playable MP4 stream',
    icon: Video,
  },
];

export const AgentTimeline: React.FC<AgentTimelineProps> = ({
  job,
  onRetry,
  isRetrying,
}) => {
  if (!job) return null;

  const currentAgent = job.current_agent;
  const isFailed = job.status === 'failed';
  const isCompleted = job.status === 'completed';

  // Determine active agent index (0 to 4)
  const getAgentStatus = (agentId: string, index: number) => {
    if (isCompleted) return 'completed';

    const agentOrder = ['Image Analyser', 'Storyboard Writer', 'Script Generator', 'Compiler & Fixer', 'Renderer'];
    const currentIndex = agentOrder.indexOf(currentAgent);

    if (isFailed && agentId.includes(currentAgent)) return 'failed';
    if (currentIndex === index) return 'active';
    if (currentIndex > index || (currentIndex === -1 && isCompleted)) return 'completed';
    return 'pending';
  };

  return (
    <div className="card-panel">
      <div className="panel-header">
        <div className="flex items-center justify-between w-full">
          <div>
            <h2 className="panel-title">Five-Agent Orchestration Pipeline</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              LangGraph synchronized state machine transitioning through 5 specialist agents
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`job-status-pill ${
                isCompleted
                  ? 'status-completed'
                  : isFailed
                  ? 'status-failed'
                  : 'status-processing'
              }`}
            >
              {isCompleted ? 'Completed' : isFailed ? 'Failed' : `Agent: ${currentAgent}`}
            </span>

            {isFailed && (
              <button
                onClick={onRetry}
                disabled={isRetrying}
                className="btn-retry flex items-center gap-1.5"
              >
                <RotateCcw size={14} className={isRetrying ? 'animate-spin' : ''} />
                <span>Retry Pipeline</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-track">
          <div
            className={`progress-fill ${isFailed ? 'bg-rose-500' : 'bg-gradient-to-r from-orange-500 to-amber-400'}`}
            style={{ width: `${job.progress_pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-zinc-400 mt-1">
          <span>{job.progress_pct}% Pipeline Progress</span>
          <span>Job ID: {job.id.slice(0, 8)}...</span>
        </div>
      </div>

      {/* 5-Agent Interactive Stepper */}
      <div className="agent-grid">
        {AGENTS.map((agent, index) => {
          const status = getAgentStatus(agent.id, index);
          const Icon = agent.icon;

          return (
            <div
              key={agent.id}
              className={`agent-card ${
                status === 'active'
                  ? 'agent-active'
                  : status === 'completed'
                  ? 'agent-completed'
                  : status === 'failed'
                  ? 'agent-failed'
                  : 'agent-pending'
              }`}
            >
              <div className="agent-icon-wrap">
                {status === 'completed' ? (
                  <CheckCircle size={20} className="text-emerald-400" />
                ) : status === 'active' ? (
                  <div className="relative">
                    <Icon size={20} className="text-orange-400 animate-pulse" />
                    <span className="agent-pulse-ring" />
                  </div>
                ) : status === 'failed' ? (
                  <AlertTriangle size={20} className="text-rose-400" />
                ) : (
                  <Icon size={20} className="text-zinc-500" />
                )}
              </div>

              <div className="agent-content">
                <div className="flex items-center justify-between">
                  <h4 className="agent-title">{agent.name}</h4>
                  <span className="agent-status-tag">
                    {status === 'active'
                      ? 'Executing'
                      : status === 'completed'
                      ? 'Verified'
                      : status === 'failed'
                      ? 'Diagnostic Failed'
                      : 'Standby'}
                  </span>
                </div>
                <p className="agent-desc">{agent.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error Banner */}
      {isFailed && job.error_message && (
        <div className="error-banner">
          <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold text-rose-300">Pipeline Diagnostic Failure: </span>
            <span className="text-rose-200">{job.error_message}</span>
          </div>
        </div>
      )}
    </div>
  );
};
