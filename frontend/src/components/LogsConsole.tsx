import React, { useEffect, useRef, useState } from 'react';
import { Terminal, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { LogEntry } from '../types';

interface LogsConsoleProps {
  logs: LogEntry[];
}

export const LogsConsole: React.FC<LogsConsoleProps> = ({ logs }) => {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!collapsed) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, collapsed]);

  const handleCopy = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.agent_name}] [${l.level.toUpperCase()}]: ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card-panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Terminal className="text-orange-400" size={18} />
          <div>
            <h2 className="panel-title">Real-Time Multi-Agent Logs & Diagnostics</h2>
            <p className="text-xs text-zinc-400">Live subprocess, agent transition, and compilation traces</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="btn-secondary text-xs flex items-center gap-1.5 py-1 px-2.5"
            title="Copy logs to clipboard"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy Logs'}</span>
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="btn-secondary text-xs py-1 px-2"
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="console-terminal">
          {logs.length === 0 ? (
            <div className="text-zinc-500 italic py-4 text-center">
              Agent execution logs will appear here when generation commences...
            </div>
          ) : (
            logs.map((log) => {
              const timeStr = log.timestamp.split('T')[1]?.slice(0, 8) || log.timestamp;
              const levelClass =
                log.level === 'error'
                  ? 'text-rose-400'
                  : log.level === 'warning'
                  ? 'text-amber-400'
                  : 'text-zinc-300';

              return (
                <div key={log.id} className="console-line">
                  <span className="console-time">{timeStr}</span>
                  <span className="console-agent">[{log.agent_name}]</span>
                  <span className={`console-msg ${levelClass}`}>{log.message}</span>
                </div>
              );
            })
          )}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  );
};
