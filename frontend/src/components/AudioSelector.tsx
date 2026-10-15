import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  Play,
  Pause,
  Bookmark,
  BookmarkCheck,
  Volume2,
  Music,
  Check,
  X,
  Disc,
  ArrowUpRight,
  Plus,
} from 'lucide-react';
import type { AudioTrack } from '../types';
import { fetchAudioCatalog, uploadCustomAudio, getFileUrl } from '../api';

interface AudioSelectorProps {
  isOpen?: boolean;
  onClose?: () => void;
  selectedTrackId?: string;
  selectedMood: string;
  onSelectTrack: (track: AudioTrack) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  jobId?: string;
}

export const AudioSelector: React.FC<AudioSelectorProps> = ({
  isOpen = true,
  onClose,
  selectedTrackId,
  selectedMood,
  onSelectTrack,
  volume,
  onVolumeChange,
  jobId,
}) => {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'for_you' | 'trending' | 'saved' | 'original'>('for_you');
  const [savedTrackIds, setSavedTrackIds] = useState<Set<string>>(new Set(['golden_hour', 'let_him_cook']));
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTracks();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const loadTracks = async () => {
    try {
      const data = await fetchAudioCatalog();
      setTracks(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load audio tracks');
    }
  };

  const handleTogglePlay = (track: AudioTrack, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (playingTrackId === track.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingTrackId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const streamUrl = getFileUrl(track.preview_url);
      const audio = new Audio(streamUrl);
      audio.volume = Math.min(1.0, Math.max(0.1, volume));
      audio.play().catch(() => {});
      audio.onended = () => setPlayingTrackId(null);
      audioRef.current = audio;
      setPlayingTrackId(track.id);
    }
  };

  const handleToggleSave = (trackId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSavedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
  };

  const handleSelect = (track: AudioTrack) => {
    onSelectTrack(track);
    if (onClose) {
      onClose();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const res = await uploadCustomAudio(file, jobId);
      await loadTracks();
      setShowUploadForm(false);
      setActiveTab('original');

      if (res.track) {
        onSelectTrack(res.track);
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Filter Tracks
  const filteredTracks = tracks.filter((track) => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        track.title.toLowerCase().includes(q) ||
        (track.artist && track.artist.toLowerCase().includes(q)) ||
        track.genre.toLowerCase().includes(q) ||
        track.category.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Tab filter
    if (activeTab === 'trending') {
      return track.trending === true || track.tab === 'trending' || track.category === 'social';
    }
    if (activeTab === 'saved') {
      return savedTrackIds.has(track.id) || track.is_custom;
    }
    if (activeTab === 'original') {
      return track.is_custom === true || track.tab === 'original';
    }
    // "for_you" tab shows all tracks or curated
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#12141a] text-zinc-100 w-full sm:max-w-xl max-h-[92vh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl border border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Top Drag Handle on Mobile */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>

        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <Music size={18} className="text-orange-400" />
            <h2 className="text-base font-bold text-white tracking-wide">Audio & Music</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              type="button"
              className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Instagram-Style Search Bar */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative flex items-center">
            <Search className="absolute left-3 text-zinc-400 pointer-events-none" size={17} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-[#1e2029] text-sm text-zinc-100 placeholder-zinc-400 pl-10 pr-9 py-2 rounded-xl border border-zinc-700/60 focus:outline-none focus:border-orange-500/70 focus:ring-1 focus:ring-orange-500/50 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-zinc-400 hover:text-zinc-200"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Instagram Filter Tabs: For you | Trending | Saved | Original audio */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800/60 overflow-x-auto scrollbar-none text-xs font-semibold">
          {[
            { id: 'for_you', label: 'For you' },
            { id: 'trending', label: 'Trending' },
            { id: 'saved', label: 'Saved' },
            { id: 'original', label: 'Original audio' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white text-zinc-950 font-bold shadow-sm'
                    : 'bg-[#1e2029] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 whitespace-nowrap"
          >
            <Plus size={13} />
            <span>Store / Add Music</span>
          </button>
        </div>

        {/* Custom Upload Drawer (Add / Store Music) */}
        {showUploadForm && (
          <div className="p-3 bg-zinc-900/90 border-b border-zinc-800 animate-in slide-in-from-top-2">
            <div className="text-xs font-semibold text-zinc-200 mb-2 flex items-center justify-between">
              <span>Add / Store Your Own Music File:</span>
              <button
                type="button"
                onClick={() => setShowUploadForm(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.aac,.m4a"
                onChange={handleFileUpload}
                disabled={uploading}
                className="text-xs text-zinc-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-500 file:text-white hover:file:bg-orange-600 cursor-pointer"
              />
              {uploading && <span className="text-xs text-orange-400 animate-pulse">Uploading...</span>}
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-2 mx-4 mt-2 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Track List (Exactly like Instagram Music Picker) */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/40 px-2 py-1">
          {filteredTracks.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-sm">
              <Disc size={32} className="mx-auto mb-2 opacity-40 animate-spin" />
              <span>No songs found in this category.</span>
            </div>
          ) : (
            filteredTracks.map((track) => {
              const isPlaying = playingTrackId === track.id;
              const isSelected = selectedTrackId === track.id || selectedMood === track.mood;
              const isSaved = savedTrackIds.has(track.id);

              return (
                <div
                  key={track.id}
                  onClick={() => handleSelect(track)}
                  className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer select-none group ${
                    isSelected
                      ? 'bg-orange-500/10 border border-orange-500/40'
                      : 'hover:bg-zinc-800/50'
                  }`}
                >
                  {/* Left: Artwork + Song Details */}
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                    {/* Album Cover Art */}
                    <div
                      className={`relative w-12 h-12 rounded-lg shrink-0 flex items-center justify-center shadow-md overflow-hidden bg-gradient-to-br ${
                        track.cover_gradient || 'from-orange-500 to-rose-700'
                      }`}
                    >
                      <Disc size={20} className={`text-white/80 ${isPlaying ? 'animate-spin' : ''}`} />
                      {/* Play overlay button on thumbnail */}
                      <button
                        type="button"
                        onClick={(e) => handleTogglePlay(track, e)}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-90 hover:opacity-100 transition-opacity"
                      >
                        {isPlaying ? (
                          <Pause size={18} className="text-white fill-white" />
                        ) : (
                          <Play size={18} className="text-white fill-white ml-0.5" />
                        )}
                      </button>
                    </div>

                    {/* Titles */}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-zinc-100 truncate flex items-center gap-1.5">
                        <span>{track.title}</span>
                        {isSelected && (
                          <span className="shrink-0 text-[10px] px-1.5 py-0.2 rounded bg-orange-500 text-white font-bold">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-zinc-400 mt-0.5 truncate">
                        {track.trending && (
                          <ArrowUpRight size={13} className="text-zinc-300 shrink-0" />
                        )}
                        <span className="truncate">{track.artist || 'Original Soundtrack'}</span>
                        <span className="shrink-0">•</span>
                        <span className="shrink-0 text-zinc-400">{track.duration_text || '1:00'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions: Play Preview, Bookmark, Select */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Bookmark / Save to Saved Tab */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleSave(track.id, e)}
                      className={`p-2 rounded-lg transition-colors ${
                        isSaved
                          ? 'text-white fill-white'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                      }`}
                      title={isSaved ? 'Saved to library' : 'Save to library'}
                    >
                      {isSaved ? <BookmarkCheck size={18} className="text-orange-400" /> : <Bookmark size={18} />}
                    </button>

                    {/* Select Checkmark */}
                    <button
                      type="button"
                      onClick={() => handleSelect(track)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        isSelected
                          ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-orange-500 hover:text-white'
                      }`}
                    >
                      {isSelected ? <Check size={13} /> : null}
                      <span>{isSelected ? 'Selected' : 'Use'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: Volume slider & Confirm */}
        <div className="p-3 bg-[#0d0e14] border-t border-zinc-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <Volume2 size={16} className="text-zinc-400 shrink-0" />
            <span className="text-xs text-zinc-400 shrink-0">Volume:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-orange-500 h-1.5 bg-zinc-700 rounded-lg cursor-pointer"
            />
            <span className="text-xs text-zinc-400 font-mono w-8 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="btn-primary py-1.5 px-4 text-xs font-semibold"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
