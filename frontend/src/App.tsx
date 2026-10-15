import React, { useEffect, useState, useRef } from 'react';
import type {
  HealthStatus,
  Job,
  ImageItem,
  LogEntry,
  ModelStatus,
  VideoTemplate,
  AudioTrack,
  StoryboardScene,
  ExportSettings,
} from './types';
import {
  fetchHealth,
  fetchModels,
  fetchAllJobs,
  fetchAudioCatalog,
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
  getFileUrl,
} from './api';
import { Header } from './components/Header';
import { TemplatesSelector } from './components/TemplatesSelector';
import { AudioSelector } from './components/AudioSelector';
import { TimelineEditor } from './components/TimelineEditor';
import { ExportModal } from './components/ExportModal';
import { UploadZone } from './components/UploadZone';
import { AgentTimeline } from './components/AgentTimeline';
import { StoryboardViewer } from './components/StoryboardViewer';
import { VideoPlayer } from './components/VideoPlayer';
import { LogsConsole } from './components/LogsConsole';
import { JobHistory } from './components/JobHistory';
import { OllamaModal } from './components/OllamaModal';
import { QrModal } from './components/QrModal';
import {
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Music,
  Play,
  Pause,
  Sliders,
  ChevronDown,
  ChevronUp,
  Disc,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [models, setModels] = useState<ModelStatus | null>(null);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [jobsList, setJobsList] = useState<Job[]>([]);
  const [uploadedImages, setUploadedImages] = useState<ImageItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Selected Template & Music State
  const [selectedTemplate, setSelectedTemplate] = useState<VideoTemplate | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('wedding-anniversary');
  const [selectedTrack, setSelectedTrack] = useState<AudioTrack | null>(null);
  const [audioVolume, setAudioVolume] = useState<number>(1.0);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // Generation Parameters
  const [prompt, setPrompt] = useState('💒 Timeless romantic wedding ballad with emotional piano, warm golden tones & tender transitions');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [style, setStyle] = useState('wedding');
  const [duration, setDuration] = useState(15);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Modals & Drawers
  const [isMusicModalOpen, setIsMusicModalOpen] = useState(false);
  const [isOllamaModalOpen, setIsOllamaModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Loading States
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDirectRendering, setIsDirectRendering] = useState(false);

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Audio preview element
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

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
    loadDefaultMusic();

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
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

  const loadDefaultMusic = async () => {
    try {
      const catalog = await fetchAudioCatalog();
      if (catalog && catalog.length > 0) {
        const defaultSong = catalog.find((s) => s.id === 'golden_hour') || catalog[0];
        setSelectedTrack(defaultSong);
      }
    } catch (err) {
      console.warn('Failed to load default music:', err);
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
                showToast('🎉 Video reel successfully generated! Watch, stream, or download below.', 'success');
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

  // Handle Template Applied (User clicks any of the 8 boxes)
  const handleTemplateApplied = async (jobId: string, template: VideoTemplate, images?: ImageItem[]) => {
    setSelectedTemplate(template);
    setSelectedTemplateId(template.id);
    setPrompt(template.description || template.title);
    setAspectRatio(template.aspect_ratio);
    setStyle(template.music_mood);
    setDuration(template.duration_seconds);

    try {
      const updated = await fetchJob(jobId);
      setCurrentJob(updated);

      if (images && images.length > 0) {
        setUploadedImages(images);
      } else {
        const jobImgs = await fetchJobImages(jobId).catch(() => []);
        if (jobImgs.length > 0) {
          setUploadedImages(jobImgs);
        }
      }

      // Auto-assign matching Instagram soundtrack
      const catalog = await fetchAudioCatalog();
      let matchSong: AudioTrack | undefined;
      if (template.category === 'wedding') {
        matchSong = catalog.find((t) => t.id === 'golden_hour' || t.id === 'wedding');
      } else if (template.category === 'nature' || template.category === 'travel') {
        matchSong = catalog.find((t) => t.id === 'inspire_the_world' || t.id === 'nature');
      } else if (template.category === 'social') {
        matchSong = catalog.find((t) => t.id === 'let_him_cook' || t.id === 'trending');
      } else if (template.category === 'celebration') {
        matchSong = catalog.find((t) => t.id === 'celebration');
      } else {
        matchSong = catalog.find((t) => t.id === 'cinematic');
      }

      if (matchSong) {
        setSelectedTrack(matchSong);
      }

      showToast(`🎬 Loaded "${template.title}" with ${images?.length || template.scene_count} photos ready! Click 'Create Video Reel' below.`, 'success');
    } catch (err: any) {
      showToast(`Failed to load template job: ${err.message}`, 'error');
    }
  };

  // Handle Audio Track Selected from Instagram Drawer
  const handleSelectAudioTrack = (track: AudioTrack) => {
    setSelectedTrack(track);
    setStyle(track.id);
    setIsMusicModalOpen(false);

    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      setIsPlayingAudio(false);
    }

    showToast(`🎵 Selected "${track.title}" by ${track.artist || 'Artist'} as soundtrack!`, 'success');
  };

  // Toggle In-Card Audio Play/Pause
  const handleToggleCardAudio = () => {
    if (!selectedTrack) return;

    if (isPlayingAudio) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      setIsPlayingAudio(false);
    } else {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      const audioUrl = getFileUrl(selectedTrack.preview_url);
      const audio = new Audio(audioUrl);
      audio.volume = Math.min(1.0, Math.max(0.1, audioVolume));
      audio.play().catch(() => {});
      audio.onended = () => setIsPlayingAudio(false);
      audioPreviewRef.current = audio;
      setIsPlayingAudio(true);
    }
  };

  // Handle Uploading Custom Photos
  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;
    setIsUploading(true);

    try {
      let activeJobId = currentJob?.id;

      if (!activeJobId || currentJob?.status === 'completed' || currentJob?.status === 'failed') {
        const newJob = await createJob({
          prompt,
          aspect_ratio: aspectRatio,
          style: selectedTrack?.id || style,
          duration_seconds: duration,
          music_enabled: true,
          captions_enabled: true,
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

  // Handle Removing a Photo
  const handleRemoveImage = (imageId: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  // Handle 1-Click Create Reel Video
  const handleCreateVideo = async () => {
    if (uploadedImages.length === 0 || isUploading) {
      showToast('Please select a template or upload photos first.', 'info');
      return;
    }

    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      setIsPlayingAudio(false);
    }

    setIsGenerating(true);
    try {
      let jobId = currentJob?.id;

      if (!jobId || currentJob?.status === 'completed' || currentJob?.status === 'failed') {
        const newJob = await createJob({
          prompt,
          aspect_ratio: aspectRatio,
          style: selectedTrack?.id || style,
          duration_seconds: duration,
          music_enabled: true,
          captions_enabled: true,
        });
        setCurrentJob(newJob);
        jobId = newJob.id;
      }

      await startJob(jobId);
      const updated = await fetchJob(jobId);
      setCurrentJob(updated);
      showToast('🚀 Video reel generation launched! Analyzing images and compiling MP4...', 'info');
    } catch (err: any) {
      showToast(`Generation failed to start: ${err.message}`, 'error');
      setIsGenerating(false);
    }
  };

  // Storyboard Timeline Updates (Module 9 & 10)
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

  // Direct Re-render from Timeline Editor
  const handleTriggerTimelineRender = async () => {
    if (!currentJob) return;
    setIsDirectRendering(true);
    try {
      showToast('🎬 Rendering updated video with your timeline edits...', 'info');
      await directRenderJob(currentJob.id, {
        resolution: '1080p',
        aspect_ratio: currentJob.aspect_ratio || aspectRatio,
        fps: 30,
        music_mood: selectedTrack?.id || currentJob.storyboard?.background_music_mood || style,
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

  // Confirm Export Settings (Module 12)
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
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      setIsPlayingAudio(false);
    }
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
        onOpenQrModal={() => setIsQrModalOpen(true)}
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
        {/* SECTION 1: The 8 Template Boxes (Screenshot 1: Wedding, Nature, Reels, etc.) */}
        <TemplatesSelector
          currentJobId={currentJob?.id}
          selectedTemplateId={selectedTemplateId}
          onTemplateApplied={handleTemplateApplied}
          isGenerating={isGenerating}
        />

        {/* SECTION 2: Active Creation & Music Studio Hub */}
        <div className="card-panel border-orange-500/30 bg-gradient-to-b from-[#14151f] to-[#0e1017] shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Photos for this Reel (Dropzone + Previews) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                  <h3 className="text-sm font-bold text-zinc-100">
                    Photos for Reel ({uploadedImages.length} Ready)
                  </h3>
                  {selectedTemplate && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 truncate max-w-[200px]">
                      {selectedTemplate.title}
                    </span>
                  )}
                </div>
                <span className="text-xs text-zinc-400">
                  {uploadedImages.length > 0 ? '✓ Ready to render' : 'Upload or select style'}
                </span>
              </div>

              <UploadZone
                images={uploadedImages}
                onFilesSelected={handleFilesSelected}
                onRemoveImage={handleRemoveImage}
                isUploading={isUploading}
                disabled={isGenerating}
              />
            </div>

            {/* Right: Music Soundtrack Card (Screenshot 2: Instagram Music) + 1-Click Create Button */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Music size={16} className="text-orange-400" />
                    <h3 className="text-sm font-bold text-zinc-100">Reel Soundtrack & Audio</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMusicModalOpen(true)}
                    className="text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1"
                  >
                    <span>Change Song</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                {/* Active Soundtrack Card */}
                {selectedTrack ? (
                  <div
                    onClick={() => setIsMusicModalOpen(true)}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-orange-500/50 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Album Cover Art */}
                      <div
                        className={`relative w-12 h-12 rounded-lg shrink-0 flex items-center justify-center shadow-md overflow-hidden bg-gradient-to-br ${
                          selectedTrack.cover_gradient || 'from-orange-500 to-rose-700'
                        }`}
                      >
                        <Disc size={20} className={`text-white/80 ${isPlayingAudio ? 'animate-spin' : ''}`} />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleCardAudio();
                          }}
                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-90 hover:opacity-100 transition-opacity"
                        >
                          {isPlayingAudio ? (
                            <Pause size={18} className="text-white fill-white" />
                          ) : (
                            <Play size={18} className="text-white fill-white ml-0.5" />
                          )}
                        </button>
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-bold text-zinc-100 truncate group-hover:text-orange-300 transition-colors">
                          {selectedTrack.title}
                        </div>
                        <div className="text-xs text-zinc-400 truncate mt-0.5">
                          {selectedTrack.artist || 'FotoOwl Studio'} • {selectedTrack.duration_text || '1:00'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMusicModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-800 text-zinc-300 hover:bg-orange-500 hover:text-white transition-all shrink-0"
                    >
                      Browse
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsMusicModalOpen(true)}
                    className="w-full p-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 text-center hover:border-orange-500/60 transition-colors"
                  >
                    <Music size={22} className="mx-auto mb-1 text-orange-400" />
                    <span className="text-xs font-semibold text-zinc-200">
                      Tap to Browse & Pick Music (Screenshot 2 Library)
                    </span>
                  </button>
                )}

                {/* Reel Specifications Badge Strip */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium">
                    Ratio: <strong className="text-white font-mono">{aspectRatio}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium">
                    Duration: <strong className="text-white font-mono">{duration}s</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium">
                    Style: <strong className="text-orange-400 font-mono capitalize">{style}</strong>
                  </span>
                </div>

                {/* Optional Advanced Settings Toggle */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                    className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
                  >
                    <Sliders size={13} />
                    <span>{showAdvancedSettings ? 'Hide Vision Prompt' : 'Customize Vision Prompt'}</span>
                    {showAdvancedSettings ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  {showAdvancedSettings && (
                    <div className="mt-2 p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-2 animate-in slide-in-from-top-1">
                      <label className="text-xs font-semibold text-zinc-300 block">
                        Reel Vision & Story Direction:
                      </label>
                      <textarea
                        rows={2}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full bg-[#1e2029] text-xs text-zinc-100 p-2.5 rounded-lg border border-zinc-700 focus:outline-none focus:border-orange-500/70"
                        placeholder="Customize camera pacing or narrative vibe..."
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* One Big Glowing Create Reel Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCreateVideo}
                  disabled={isGenerating || isUploading || uploadedImages.length === 0}
                  className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm md:text-base flex items-center justify-center gap-2.5 shadow-xl transition-all ${
                    isGenerating || isUploading || uploadedImages.length === 0
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50'
                      : 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white shadow-orange-500/30 active:scale-[0.98]'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={19} className="animate-spin" />
                      <span>Generating Video Reel...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={19} />
                      <span>CREATE VIDEO REEL NOW</span>
                    </>
                  )}
                </button>
                <div className="text-center text-[11px] text-zinc-400 mt-1.5">
                  Automated scene sequence • Camera dynamics • Soundtrack sync • 1080p MP4
                </div>
              </div>
            </div>
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

        {/* SECTION 3: Generated Video Player (When Ready) */}
        {currentJob?.status === 'completed' && (
          <VideoPlayer
            job={currentJob}
            onReset={handleReset}
            onOpenExport={() => setIsExportModalOpen(true)}
          />
        )}

        {/* SECTION 4: Interactive Multi-Track Timeline & Clip Editor (Module 9 & 10) */}
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

      {/* MODALS */}

      {/* Instagram-Style Music Drawer (Screenshot 2: Search, Tabs, Play Previews, Store Music) */}
      <AudioSelector
        isOpen={isMusicModalOpen}
        onClose={() => setIsMusicModalOpen(false)}
        selectedTrackId={selectedTrack?.id}
        selectedMood={style}
        onSelectTrack={handleSelectAudioTrack}
        volume={audioVolume}
        onVolumeChange={setAudioVolume}
        jobId={currentJob?.id}
      />

      {/* Export Settings Modal (Module 12) */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onConfirmExport={handleConfirmExport}
        exporting={isDirectRendering}
        defaultAspectRatio={currentJob?.aspect_ratio || aspectRatio}
        defaultMusicMood={selectedTrack?.id || currentJob?.storyboard?.background_music_mood || style}
      />

      {/* Job History */}
      <JobHistory
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        jobs={jobsList}
        onSelectJob={handleSelectJob}
        onDeleteJob={handleDeleteJob}
      />

      {/* Ollama Models Modal */}
      <OllamaModal
        isOpen={isOllamaModalOpen}
        onClose={() => setIsOllamaModalOpen(false)}
        models={models}
        onRefresh={loadHealthAndModels}
      />

      {/* Mobile QR Scanner Modal */}
      <QrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        publicUrl="https://soft-sheep-62.loca.lt"
        localWifiUrl="http://10.106.152.185:8000"
        tunnelPassword="152.57.50.187"
      />
    </div>
  );
};

export default App;
