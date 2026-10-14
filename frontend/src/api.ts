import type { HealthStatus, Job, ImageItem, LogEntry, ModelStatus } from './types';

const API_BASE =
  typeof window !== 'undefined' && window.location.port !== '5173'
    ? ''
    : 'http://localhost:8000';

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error('Failed to fetch system health');
  return res.json();
}

export async function fetchModels(): Promise<ModelStatus> {
  const res = await fetch(`${API_BASE}/api/models`);
  if (!res.ok) throw new Error('Failed to fetch model status');
  return res.json();
}

export async function pullModel(modelName: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/models/pull?model_name=${encodeURIComponent(modelName)}`, {
    method: 'POST',
  });
  return res.json();
}

export async function createJob(params: {
  prompt: string;
  aspect_ratio: string;
  style: string;
  duration_seconds: number;
  music_enabled: boolean;
  captions_enabled: boolean;
}): Promise<Job> {
  const res = await fetch(`${API_BASE}/api/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create job');
  }
  return res.json();
}

export async function uploadPhotos(jobId: string, files: File[]): Promise<ImageItem[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}

export async function fetchJobImages(jobId: string): Promise<ImageItem[]> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/images`);
  if (!res.ok) throw new Error('Failed to fetch images');
  return res.json();
}

export async function startJob(jobId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/start`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to start generation');
  }
}

export async function retryJob(jobId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/retry`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to retry generation');
  }
}

export async function fetchJob(jobId: string): Promise<Job> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}`);
  if (!res.ok) throw new Error('Failed to fetch job status');
  return res.json();
}

export async function fetchJobLogs(jobId: string): Promise<LogEntry[]> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/logs`);
  if (!res.ok) throw new Error('Failed to fetch logs');
  return res.json();
}

export async function fetchAllJobs(): Promise<Job[]> {
  const res = await fetch(`${API_BASE}/api/jobs`);
  if (!res.ok) throw new Error('Failed to fetch jobs list');
  return res.json();
}

export async function deleteJob(jobId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete job');
}

export function getFileUrl(relativePath: string): string {
  if (relativePath.startsWith('http')) return relativePath;
  const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return API_BASE ? `${API_BASE}${cleanPath}` : cleanPath;
}
