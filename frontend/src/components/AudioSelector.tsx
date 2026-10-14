import React, { useEffect, useRef, useState } from 'react';
import { Music, Play, Pause, Upload, Volume2, Check, Disc, ShieldCheck } from 'lucide-react';
import type { AudioTrack } from '../types';
import { fetchAudioCatalog, uploadCustomAudio, getFileUrl } from '../api';

interface AudioSelectorProps {
  selectedMood: string;
  onSelectMood: (mood: string) => void;
  onCustomAudioUploaded?: (filePath: string) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  jobId?: string;
}

export const AudioSelector: React.FC<AudioSelectorProps> = ({
  selectedMood,
  onSelectMood,
  onCustomAudioUploaded,
  volume,
  onVolumeChange,
  jobId,
}) => {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [customTrackName, setCustomTrackName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAudioCatalog()
      .then((data) => setTracks(data))
      .catch((err) => setError(err.message || 'Failed to load audio tracks'));
  }, []);

  const handleTogglePlay = (track: AudioTrack) => {
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
      audio.volume = Math.min(1.0, volume);
      audio.play().catch(() => {});
      audio.onended = () => setPlayingTrackId(null);
      audioRef.current = audio;
      setPlayingTrackId(track.id);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const res = await uploadCustomAudio(file, jobId);
      setCustomTrackName(file.name);
      if (onCustomAudioUploaded) {
        onCustomAudioUploaded(res.file_path);
      }
    } catch (err: any) {
      setError(err.message || 'Audio upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card-panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Music className="text-primary-400" size={20} />
          <div>
            <h2 className="panel-title">Soundtrack & Audio Synchronization (Module 5)</h2>
            <p className="panel-subtitle">
              Select trending Instagram & TikTok audio, studio royalty-free beats, or upload custom music.
            </p>
          </div>
        </div>

        {/* Volume slider */}
        <div className="flex items-center gap-2 bg-zinc-900/80 px-3 py-1.5 rounded-lg border border-zinc-800">
          <Volume2 size={15} className="text-zinc-400" />
          <span className="text-xs text-zinc-300 font-mono w-9">{Math.round(volume * 100)}%</span>
          <input
            type="range"
            min="0.1"
            max="1.5"
            step="0.05"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-20 accent-primary-500 cursor-pointer"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Audio Track Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {tracks.map((track) => {
          const isSelected = selectedMood === track.mood;
          const isPlaying = playingTrackId === track.id;

          return (
            <div
              key={track.id}
              onClick={() => onSelectMood(track.mood)}
              className={`flex flex-col justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-primary-950/40 border-primary-500 shadow-md shadow-primary-500/20'
                  : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-200 line-clamp-1">
                    {track.title}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-primary-300 border border-zinc-700">
                    {track.bpm} BPM
                  </span>
                </div>

                <div className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                  {track.description}
                </div>

                <div className="flex items-center gap-2 mt-2.5 text-[10px] text-zinc-400">
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700/60 text-zinc-300">
                    {track.genre}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-emerald-400">
                    <ShieldCheck size={11} />
                    Royalty-Free
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePlay(track);
                  }}
                  className={`btn-secondary text-xs px-2.5 py-1 flex items-center gap-1.5 ${
                    isPlaying ? 'bg-primary-600/30 text-primary-300 border-primary-500/40' : ''
                  }`}
                >
                  {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                  <span>{isPlaying ? 'Pause' : 'Preview Beat'}</span>
                </button>

                <div className="flex items-center gap-1.5 text-xs">
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                      <Check size={13} /> Active Track
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Audio Upload Dropzone */}
      <div className="mt-4 pt-4 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Disc size={15} className="text-primary-400" />
          <span>
            {customTrackName ? (
              <strong className="text-emerald-400">Active Custom File: {customTrackName}</strong>
            ) : (
              'Or upload your own song/voiceover (MP3, WAV, AAC, M4A up to 30MB)'
            )}
          </span>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mp3,audio/wav,audio/aac,audio/m4a,audio/ogg"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5"
          >
            <Upload size={13} />
            <span>{uploading ? 'Uploading audio...' : 'Upload Audio File'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
