import React, { useRef, useState } from 'react';
import { UploadCloud, FolderUp, X, Sparkles } from 'lucide-react';
import type { ImageItem } from '../types';
import { getFileUrl } from '../api';

interface UploadZoneProps {
  images: ImageItem[];
  onFilesSelected: (files: File[]) => void;
  onRemoveImage: (imageId: string) => void;
  onQuickSamplePack?: (packId: string) => void;
  isUploading: boolean;
  disabled: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  images,
  onFilesSelected,
  onRemoveImage,
  onQuickSamplePack,
  isUploading,
  disabled,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith('image/')
      );
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const getKenBurnsBadge = (idx: number) => {
    const moves = ['Zoom In', 'Pan Right', 'Tilt Up', 'Zoom Out', 'Pan Left', 'Dynamic Drift'];
    return moves[idx % moves.length];
  };

  return (
    <div className="space-y-3">
      {/* Drag & Drop Target Box */}
      <div
        className={`dropzone-box ${isDragOver ? 'dropzone-active' : ''} ${disabled ? 'dropzone-disabled' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore
          webkitdirectory=""
          // @ts-ignore
          directory=""
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />

        <div className="dropzone-content">
          <div className="dropzone-icon-wrap">
            <UploadCloud size={30} className="text-orange-400" />
          </div>
          <div className="dropzone-text">
            <p className="dropzone-title">
              {isUploading ? 'Validating & optimizing photos...' : 'Drag & drop photos here, or click to browse'}
            </p>
            <p className="dropzone-hint">
              Supports JPEG, PNG, WebP • Auto-compressed • Preserves faces & scenery
            </p>
          </div>
          <div className="dropzone-buttons" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
            >
              Choose Photos
            </button>
            <button
              type="button"
              className="btn-secondary text-xs flex items-center gap-1"
              onClick={() => folderInputRef.current?.click()}
              disabled={disabled || isUploading}
            >
              <FolderUp size={14} /> Upload Folder
            </button>
          </div>
        </div>
      </div>

      {/* Quick Sample Photos Shortcut Strip */}
      {onQuickSamplePack && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs">
          <span className="text-zinc-400 font-medium flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-400" />
            <span>Don't have photos handy? Try demo pack:</span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => onQuickSamplePack('wedding-pack')}
              disabled={disabled || isUploading}
              className="px-2.5 py-1 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/20 font-semibold transition-colors"
            >
              💒 Wedding
            </button>
            <button
              type="button"
              onClick={() => onQuickSamplePack('nature-pack')}
              disabled={disabled || isUploading}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 font-semibold transition-colors"
            >
              🌲 Nature
            </button>
            <button
              type="button"
              onClick={() => onQuickSamplePack('celebration-pack')}
              disabled={disabled || isUploading}
              className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 font-semibold transition-colors"
            >
              🎉 City/Celebration
            </button>
          </div>
        </div>
      )}

      {/* Uploaded Photos Grid Preview */}
      {images.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
            <span className="font-semibold text-zinc-300">
              Choreographed Scenes ({images.length})
            </span>
            <span>Hover to preview motion assignment</span>
          </div>

          <div className="photo-grid">
            {images.map((img, idx) => (
              <div key={img.id} className="photo-card group">
                <img
                  src={getFileUrl(img.preview_url)}
                  alt={img.original_filename}
                  className="photo-thumbnail group-hover:scale-105 transition-transform duration-300"
                />
                <div className="photo-overlay">
                  <span className="photo-index">#{idx + 1}</span>
                  {!disabled && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveImage(img.id);
                      }}
                      className="photo-remove-btn"
                      title="Remove photo"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="photo-info">
                  <div className="flex items-center justify-between">
                    <span className="photo-name font-bold text-zinc-200" title={img.original_filename}>
                      {img.original_filename}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-semibold text-orange-400 mt-0.5">
                    {getKenBurnsBadge(idx)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
