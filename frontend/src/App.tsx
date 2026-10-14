import React, { useEffect, useState, useRef } from 'react';
import type {
  HealthStatus,
  Job,
  ImageItem,
  LogEntry,
  ModelStatus,
} from './types';
import {
  fetchHealth,
  fetchModels,
  fetchAllJobs,
  createJob,
  uploadPhotos,
  startJob,
  retryJob,
  fetchJob,
  fetchJobLogs,
  deleteJob,
} from './api';
import { Header } from './components/Header';
import { UploadZone } from './components/UploadZone';
import { PromptControls } from './components/PromptControls';
import { AgentTimeline } from './components/AgentTimeline';
import { StoryboardViewer } from './components/StoryboardViewer';
import { VideoPlayer } from './components/VideoPlayer';
import { LogsConsole } from './components/LogsConsole';
import { JobHistory } from './components/JobHistory';
import { OllamaModal } from './components/OllamaModal';

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [models, setModels] = useState<ModelStatus | null>(null);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [jobsList, setJobsList] = useState<Job[]>([]);
  const [uploadedImages, setUploadedImages] = useState<ImageItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Generation Form Parameters
  const [prompt, setPrompt] = useState('Create an aesthetic, dynamic video reel highlighting the best moments');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [style, setStyle] = useState('cinematic');
  const [duration, setDuration] = useState(15);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);

  // Loading States
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Modals
  const [isOllamaModalOpen, setIsOllamaModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Polling ref
  const pollTimerRef = useRef<number | null>(null);

  // Initial load
  useEffect(() => {
    loadHealthAndModels();
    loadJobsHistory();
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const loadHealthAndModels = async () => {
    try {
      const [h, m] = await Promise.all([fetchHealth(), fetchModels()]);
      setHealth(h);
      setModels(m);
    } catch (err) {
      console.warn('System status check:', err);
    }
  };

  const loadJobsHistory = async () => {
    try {
      const jobs = await fetchAllJobs();
      setJobsList(jobs);
    } catch (err) {
      console.warn('Failed to load past jobs:', err);
    }
  };

  // Job Polling
  useEffect(() => {
    if (!currentJob) return;

    if (currentJob.status === 'processing') {
      setIsGenerating(true);
      if (!pollTimerRef.current) {
        pollTimerRef.current = window.setInterval(async () => {
          try {
            const [updated, newLogs] = await Promise.all([
              fetchJob(currentJob.id),
              fetchJobLogs(currentJob.id),
            ]);
            setCurrentJob(updated);
            setLogs(newLogs);

            if (updated.status === 'completed' || updated.status === 'failed') {
              setIsGenerating(false);
              setIsRetrying(false);
              if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
              }
              loadJobsHistory();
            }
          } catch (e) {
            console.error('Polling error:', e);
          }
        }, 1500);
      }
    } else {
      setIsGenerating(false);
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [currentJob?.status, currentJob?.id]);

  // Handle Photo Selection
  const handleFilesSelected = async (files: File[]) => {
    setIsUploading(true);
    try {
      let activeJobId = currentJob?.id;

      // If no active pending job, create one
      if (!activeJobId || currentJob?.status === 'completed' || currentJob?.status === 'failed') {
        const newJob = await createJob({
          prompt,
          aspect_ratio: aspectRatio,
          style,
          duration_seconds: duration,
          music_enabled: musicEnabled,
          captions_enabled: captionsEnabled,
        });
        setCurrentJob(newJob);
        activeJobId = newJob.id;
        setUploadedImages([]);
        setLogs([]);
      }

      const newImages = await uploadPhotos(activeJobId, files);
      setUploadedImages((prev) => [...prev, ...newImages]);
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Removing Photo
  const handleRemoveImage = (imageId: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  // Handle Start Generation
  const handleGenerate = async () => {
    if (!currentJob || uploadedImages.length === 0) return;
    setIsGenerating(true);

    try {
      await startJob(currentJob.id);
      const updated = await fetchJob(currentJob.id);
      setCurrentJob(updated);
    } catch (err: any) {
      alert(`Generation failed to start: ${err.message}`);
      setIsGenerating(false);
    }
  };

  // Handle Retry
  const handleRetry = async () => {
    if (!currentJob) return;
    setIsRetrying(true);
    try {
      await retryJob(currentJob.id);
      const updated = await fetchJob(currentJob.id);
      setCurrentJob(updated);
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
      setIsRetrying(false);
    }
  };

  // Handle Reset / New Reel
  const handleReset = () => {
    setCurrentJob(null);
    setUploadedImages([]);
    setLogs([]);
    setIsGenerating(false);
  };

  // Select Past Job
  const handleSelectJob = async (jobId: string) => {
    try {
      const [j, l] = await Promise.all([fetchJob(jobId), fetchJobLogs(jobId)]);
      setCurrentJob(j);
      setLogs(l);
      setPrompt(j.prompt);
      setAspectRatio(j.aspect_ratio);
      setStyle(j.style);
      setDuration(j.duration_seconds);
      setMusicEnabled(j.music_enabled);
      setCaptionsEnabled(j.captions_enabled);
    } catch (err: any) {
      alert(`Failed to load job: ${err.message}`);
    }
  };

  // Delete Job
  const handleDeleteJob = async (jobId: string) => {
    try {
      await deleteJob(jobId);
      if (currentJob?.id === jobId) {
        handleReset();
      }
      loadJobsHistory();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col font-sans">
      <Header
        health={health}
        onOpenOllamaModal={() => setIsOllamaModalOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={jobsList.length}
      />

      <main className="main-layout flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Top Control Grid: Upload + Prompt Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6">
            <UploadZone
              images={uploadedImages}
              onFilesSelected={handleFilesSelected}
              onRemoveImage={handleRemoveImage}
              isUploading={isUploading}
              disabled={isGenerating}
            />
          </div>

          <div className="lg:col-span-6">
            <PromptControls
              prompt={prompt}
              setPrompt={setPrompt}
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
              style={style}
              setStyle={setStyle}
              duration={duration}
              setDuration={setDuration}
              musicEnabled={musicEnabled}
              setMusicEnabled={setMusicEnabled}
              captionsEnabled={captionsEnabled}
              setCaptionsEnabled={setCaptionsEnabled}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              canGenerate={uploadedImages.length > 0}
            />
          </div>
        </div>

        {/* 5-Agent Pipeline Timeline */}
        {currentJob && (
          <AgentTimeline
            job={currentJob}
            onRetry={handleRetry}
            isRetrying={isRetrying}
          />
        )}

        {/* Generated Video Player (Rendered MP4) */}
        {currentJob?.status === 'completed' && (
          <VideoPlayer job={currentJob} onReset={handleReset} />
        )}

        {/* Storyboard Viewer */}
        {currentJob?.storyboard && (
          <StoryboardViewer
            storyboard={currentJob.storyboard}
            images={uploadedImages}
          />
        )}

        {/* Real-time Agent Logs Console */}
        {currentJob && <LogsConsole logs={logs} />}
      </main>

      {/* Modals */}
      <JobHistory
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        jobs={jobsList}
        onSelectJob={handleSelectJob}
        onDeleteJob={handleDeleteJob}
      />

      <OllamaModal
        isOpen={isOllamaModalOpen}
        onClose={() => setIsOllamaModalOpen(false)}
        models={models}
        onRefresh={loadHealthAndModels}
      />
    </div>
  );
};

export default App;
