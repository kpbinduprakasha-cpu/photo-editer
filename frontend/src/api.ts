import type { HealthStatus, Job, ImageItem, LogEntry, ModelStatus, SamplePack } from './types';

const API_BASE =
  typeof window !== 'undefined' && window.location.port !== '5173'
    ? ''
    : 'http://localhost:8000';

async function extractError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (data && data.detail) {
      if (typeof data.detail === 'string') return data.detail;
      if (Array.isArray(data.detail)) return data.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
    }
  } catch {
    try {
      const text = await res.text();
      if (text && text.length < 200) return text;
    } catch {}
  }
  return `${fallback} (HTTP ${res.status})`;
}

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error(await extractError(res, 'Failed to fetch system health'));
  return res.json();
}

export async function fetchModels(): Promise<ModelStatus> {
  const res = await fetch(`${API_BASE}/api/models`);
  if (!res.ok) throw new Error(await extractError(res, 'Failed to fetch model status'));
  return res.json();
}

export async function pullModel(modelName: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/models/pull?model_name=${encodeURIComponent(modelName)}`, {
    method: 'POST',
  });
  return res.json();
}

export async function fetchSamplePacks(): Promise<SamplePack[]> {
  const res = await fetch(`${API_BASE}/api/sample-packs`);
  if (!res.ok) throw new Error(await extractError(res, 'Failed to load sample packs'));
  return res.json();
}

export async function applySamplePack(
  packId: string,
  jobId?: string,
  prompt?: string
): Promise<{ message: string; job: Job; pack: SamplePack; images: ImageItem[] }> {
  const res = await fetch(`${API_BASE}/api/sample-packs/${encodeURIComponent(packId)}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: jobId, prompt }),
  });
  if (!res.ok) {
    throw new Error(await extractError(res, 'Failed to apply sample pack'));
  }
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
    throw new Error(await extractError(res, 'Failed to create job'));
  }
  return res.json();
}

/**
 * Client-side high-quality image compressor using HTML5 canvas.
 * Reduces 15MB smartphone photos down to ~300KB in milliseconds,
 * eliminating cellular upload timeouts while preserving crystal sharpness.
 */
export async function compressImage(file: File, maxDim = 1920, quality = 0.88): Promise<File> {
  // If not an image or already lightweight (< 500KB), return as-is
  if (!file.type.startsWith('image/') || file.size < 500 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;

        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              resolve(file);
            } else {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export async function uploadPhotos(jobId: string, files: File[]): Promise<ImageItem[]> {
  // Compress in parallel on client before upload
  const processedFiles = await Promise.all(files.map((f) => compressImage(f)));

  const formData = new FormData();
  processedFiles.forEach((file) => formData.append('files', file));

  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    throw new Error(await extractError(res, 'Upload failed'));
  }
  return res.json();
}

export async function fetchJobImages(jobId: string): Promise<ImageItem[]> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/images`);
  if (!res.ok) throw new Error(await extractError(res, 'Failed to fetch images'));
  return res.json();
}

export async function startJob(jobId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/start`, { method: 'POST' });
  if (!res.ok) {
    throw new Error(await extractError(res, 'Failed to start generation'));
  }
}

export async function retryJob(jobId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/retry`, { method: 'POST' });
  if (!res.ok) {
    throw new Error(await extractError(res, 'Failed to retry generation'));
  }
}

export async function fetchJob(jobId: string): Promise<Job> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}`);
  if (!res.ok) throw new Error(await extractError(res, 'Failed to fetch job status'));
  return res.json();
}

export async function fetchJobLogs(jobId: string): Promise<LogEntry[]> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/logs`);
  if (!res.ok) throw new Error(await extractError(res, 'Failed to fetch logs'));
  return res.json();
}

export async function fetchAllJobs(): Promise<Job[]> {
  const res = await fetch(`${API_BASE}/api/jobs`);
  if (!res.ok) throw new Error(await extractError(res, 'Failed to fetch jobs list'));
  return res.json();
}

export async function deleteJob(jobId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await extractError(res, 'Failed to delete job'));
}

export function getFileUrl(relativePath: string): string {
  if (relativePath.startsWith('http')) return relativePath;
  const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return API_BASE ? `${API_BASE}${cleanPath}` : cleanPath;
}
