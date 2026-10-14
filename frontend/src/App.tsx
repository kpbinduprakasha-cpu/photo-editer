import React, { useEffect, useState, useRef } from 'react';
import type {
  HealthStatus,
  Job,
  ImageItem,
  LogEntry,
  ModelStatus,
  SamplePack,
  VideoTemplate,
  StoryboardScene,
  ExportSettings,
} from './types';
import {
  fetchHealth,
  fetchModels,
  fetchAllJobs,
  fetchSamplePacks,
  applySamplePack,
  createJob,
  uploadPhotos,
  startJob,
  retryJob,
  fetchJob,
  fetchJobLogs,
  fetchJobImages,
  deleteJob,
  updateJobStoryboard,
  directRenderJob,
} from './api';
import { Header } from './components/Header';
import { SamplePacks } from './components/SamplePacks';
import { TemplatesSelector } from './components/TemplatesSelector';
import { AudioSelector } from './components/AudioSelector';
import { TimelineEditor } from './components/TimelineEditor';
import { ExportModal } from './components/ExportModal';
import { UploadZone } from './components/UploadZone';
import { PromptControls } from './components/PromptControls';
import { AgentTimeline } from './components/AgentTimeline';
import { StoryboardViewer } from './components/StoryboardViewer';
import { VideoPlayer } from './components/VideoPlayer';
import { LogsConsole } from './components/LogsConsole';
import { JobHistory } from './components/JobHistory';
import { OllamaModal } from './components/OllamaModal';
import { CheckCircle2, AlertCircle, X, Sparkles, LayoutTemplate, Music, Film } from 'lucide-react';

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [models, setModels] = useState<ModelStatus | null>(null);
  const [samplePacks, setSamplePacks] = useState<SamplePack[]>([]);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [jobsList, setJobsList] = useState<Job[]>([]);
  const [uploadedImages, setUploadedImages] = useState<ImageItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Studio Showcase Tabs: Templates | Quick Samples | Audio Studio
  const [activeStudioTab, setActiveStudioTab] = useState<'templates' | 'samples' | 'audio'>('templates');

  // Generation Form Parameters
  const [prompt, setPrompt] = useState('🔥 High-energy trending reel with dynamic zoom-ins, punchy beats & viral transitions');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [style, setStyle] = useState('trending');
  const [duration, setDuration] = useState(15);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [audioVolume, setAudioVolume] = useState(1.0);

  // Loading States
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isLoadingPack, setIsLoadingPack] = useState(false);
  const [activePackId, setActivePackId] = useState<string | undefined>('wedding');
  const [isDirectRendering, setIsDirectRendering] = useState(false);

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Modals
  const [isOllamaModalOpen, setIsOllamaModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Polling ref
  const pollTimerRef = useRef<number | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 6000);
  };

  // Initial load
  useEffect(() => {
    loadHealthAndModels();
    loadJobsHistory();
    loadSamplePacks();

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

  const loadSamplePacks = async () => {
    try {
      const packs = await fetchSamplePacks();
      setSamplePacks(packs);
    } catch (err) {
      console.warn('Failed to load sample packs:', err);
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
              if (updated.status === 'completed') {
                showToast('🎉 Video reel successfully generated and ready to stream!', 'success');
              } else {
                showToast(`Generation failed: ${updated.error_message || 'Check logs for details'}`, 'error');
              }
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

  // Handle Template Applied (Module 8)
  const handleTemplateApplied = async (jobId: string, template: VideoTemplate) => {
    try {
      const updated = await fetchJob(jobId);
      setCurrentJob(updated);
      setPrompt(template.description || template.title);
      setAspectRatio(template.aspect_ratio);
      setStyle(template.music_mood);
      setDuration(template.duration_seconds);

      const imgs = await fetchJobImages(jobId).catch(() => []);
      if (imgs.length > 0) {
        setUploadedImages(imgs);
      }
      showToast(`🎬 Applied template "${template.title}" with ${template.scene_count} custom scenes!`, 'success');
    } catch (err: any) {
      showToast(`Failed to load applied template job: ${err.message}`, 'error');
    }
  };

  // Handle Sample Pack Selection
  const handleSelectSamplePack = async (pack: SamplePack) => {
    setIsLoadingPack(true);
    setActivePackId(pack.id);
    try {
      setPrompt(pack.suggested_prompt);
      setAspectRatio(pack.aspect_ratio);
      setStyle(pack.theme);
      setDuration(pack.duration_seconds);

      const res = await applySamplePack(pack.id, undefined, pack.suggested_prompt);
      setCurrentJob(res.job);
      setUploadedImages(res.images);
      setLogs([]);
      showToast(`✨ Loaded ${pack.name} with ${res.images.length} verified photos! Click 'Generate Video Reel' below.`, 'success');
    } catch (err: any) {
      showToast(`Failed to load sample pack: ${err.message}`, 'error');
    } finally {
      setIsLoadingPack(false);
    }
  };

  // Handle Photo Selection
  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;
    setIsUploading(true);
    setActivePackId(undefined);

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
      showToast(`📸 Successfully added ${newImages.length} photo(s).`, 'success');
    } catch (err: any) {
      showToast(`Upload error: ${err.message}`, 'error');
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
    if (uploadedImages.length === 0 || isUploading) {
      showToast('Please upload photos or choose a template/sample reel first.', 'info');
      return;
    }

    setIsGenerating(true);
    try {
      let jobId = currentJob?.id;

      if (!jobId || currentJob?.status === 'completed' || currentJob?.status === 'failed') {
        const newJob = await createJob({
          prompt,
          aspect_ratio: aspectRatio,
          style,
          duration_seconds: duration,
          music_enabled: musicEnabled,
          captions_enabled: captionsEnabled,
        });
        setCurrentJob(newJob);
        jobId = newJob.id;
      }

      await startJob(jobId);
      const updated = await fetchJob(jobId);
      setCurrentJob(updated);
      showToast('🚀 Multi-agent video reel generation launched!', 'info');
    } catch (err: any) {
      showToast(`Generation failed to start: ${err.message}`, 'error');
      setIsGenerating(false);
    }
  };

  // Handle Storyboard Timeline Scenes Update (Module 9, 10)
  const handleUpdateScenes = async (newScenes: StoryboardScene[]) => {
    if (!currentJob || !currentJob.storyboard) return;
    const updatedStoryboard = {
      ...currentJob.storyboard,
      scenes: newScenes,
    };
    setCurrentJob((prev) => (prev ? { ...prev, storyboard: updatedStoryboard } : prev));
    try {
      await updateJobStoryboard(currentJob.id, updatedStoryboard);
      showToast('Timeline scenes updated! Click "Apply & Re-render" to update the video.', 'info');
    } catch (err: any) {
      showToast(`Failed to update timeline: ${err.message}`, 'error');
    }
  };

  // Handle Direct Re-render from Timeline Editor
  const handleTriggerTimelineRender = async () => {
    if (!currentJob) return;
    setIsDirectRendering(true);
    try {
      showToast('🎬 Rendering updated video with your timeline edits...', 'info');
      await directRenderJob(currentJob.id, {
        resolution: '1080p',
        aspect_ratio: currentJob.aspect_ratio || aspectRatio,
        fps: 30,
        music_mood: currentJob.storyboard?.background_music_mood || style,
        audio_volume: audioVolume,
      });
      const updated = await fetchJob(currentJob.id);
      setCurrentJob(updated);
      setIsGenerating(true);
    } catch (err: any) {
      showToast(`Render failed: ${err.message}`, 'error');
    } finally {
      setIsDirectRendering(false);
    }
  };

  // Handle Confirm Custom Export (Module 12)
  const handleConfirmExport = async (settings: ExportSettings) => {
    if (!currentJob) return;
    setIsExportModalOpen(false);
    setIsDirectRendering(true);
    showToast(`🎬 Exporting ${settings.resolution} @ ${settings.fps} FPS...`, 'info');
    try {
      await directRenderJob(currentJob.id, settings);
      const updated = await fetchJob(currentJob.id);
      setCurrentJob(updated);
      setIsGenerating(true);
    } catch (err: any) {
      showToast(`Export failed: ${err.message}`, 'error');
    } finally {
      setIsDirectRendering(false);
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
      showToast('🔄 Retrying video generation...', 'info');
    } catch (err: any) {
      showToast(`Retry failed: ${err.message}`, 'error');
      setIsRetrying(false);
    }
  };

  // Handle Reset / New Reel
  const handleReset = () => {
    setCurrentJob(null);
    setUploadedImages([]);
    setLogs([]);
    setIsGenerating(false);
    setActivePackId(undefined);
  };

  // Select Past Job
  const handleSelectJob = async (jobId: string) => {
    try {
      const [j, l, imgs] = await Promise.all([
        fetchJob(jobId),
        fetchJobLogs(jobId),
        fetchJobImages(jobId).catch(() => []),
      ]);
      setCurrentJob(j);
      setLogs(l);
      setUploadedImages(imgs);
      setPrompt(j.prompt);
      setAspectRatio(j.aspect_ratio);
      setStyle(j.style);
      setDuration(j.duration_seconds);
      setMusicEnabled(j.music_enabled);
      setCaptionsEnabled(j.captions_enabled);
      showToast(`Loaded past job ${j.id.slice(0, 8)}.`, 'info');
    } catch (err: any) {
      showToast(`Failed to load job: ${err.message}`, 'error');
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
      showToast('Job deleted.', 'info');
    } catch (err: any) {
      showToast(`Failed to delete: ${err.message}`, 'error');
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

      {/* In-app Toast Banner */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 max-w-md w-full animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`flex items-start justify-between gap-3 p-4 rounded-xl shadow-2xl border ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-red-950/90 border-red-500/50 text-red-200'
                : 'bg-zinc-900/90 border-orange-500/50 text-orange-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {toast.type === 'success' ? (
                <CheckCircle2 className="shrink-0 text-emerald-400 mt-0.5" size={18} />
              ) : (
                <AlertCircle className="shrink-0 text-orange-400 mt-0.5" size={18} />
              )}
              <span className="text-sm leading-relaxed">{toast.message}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-zinc-400 hover:text-zinc-200 shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <main className="main-layout flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Studio Navigation Tabs (Templates, Samples, Audio) */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveStudioTab('templates')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                activeStudioTab === 'templates'
                  ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40 shadow-sm'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <LayoutTemplate size={16} />
              <span>Director Templates (Module 8)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStudioTab('samples')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                activeStudioTab === 'samples'
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <Sparkles size={16} />
              <span>1-Click Sample Reels</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStudioTab('audio')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                activeStudioTab === 'audio'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <Music size={16} />
              <span>Soundtrack Studio (Module 5)</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-500">
            <Film size={14} className="text-primary-400" />
            <span>AI Reel Director</span>
          </div>
        </div>

        {/* Studio Active Tab Content */}
        {activeStudioTab === 'templates' && (
          <TemplatesSelector
            currentJobId={currentJob?.id}
            onTemplateApplied={handleTemplateApplied}
          />
        )}

        {activeStudioTab === 'samples' && (
          <SamplePacks
            packs={samplePacks}
            onSelectPack={handleSelectSamplePack}
            isLoading={isLoadingPack}
            activePackId={activePackId}
            disabled={isGenerating || isUploading}
          />
        )}

        {activeStudioTab === 'audio' && (
          <AudioSelector
            selectedMood={style}
            onSelectMood={(m) => setStyle(m)}
            volume={audioVolume}
            onVolumeChange={setAudioVolume}
            jobId={currentJob?.id}
          />
        )}

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
              isUploading={isUploading}
              canGenerate={uploadedImages.length > 0}
              photoCount={uploadedImages.length}
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
          <VideoPlayer
            job={currentJob}
            onReset={handleReset}
            onOpenExport={() => setIsExportModalOpen(true)}
          />
        )}

        {/* Interactive Multi-Track Timeline & Clip Editor (Module 9 & 10) */}
        {currentJob?.storyboard?.scenes && currentJob.storyboard.scenes.length > 0 && (
          <TimelineEditor
            scenes={currentJob.storyboard.scenes}
            images={uploadedImages}
            onUpdateScenes={handleUpdateScenes}
            onTriggerRender={handleTriggerTimelineRender}
            rendering={isDirectRendering || isGenerating}
          />
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

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onConfirmExport={handleConfirmExport}
        exporting={isDirectRendering}
        defaultAspectRatio={currentJob?.aspect_ratio || aspectRatio}
        defaultMusicMood={currentJob?.storyboard?.background_music_mood || style}
      />
    </div>
  );
};

export default App;
