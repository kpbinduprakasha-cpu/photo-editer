import React, { useRef, useState } from 'react';
import { UploadCloud, FolderUp, X, Image as ImageIcon } from 'lucide-react';
import type { ImageItem } from '../types';
import { getFileUrl } from '../api';

interface UploadZoneProps {
  images: ImageItem[];
  onFilesSelected: (files: File[]) => void;
  onRemoveImage: (imageId: string) => void;
  isUploading: boolean;
  disabled: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  images,
  onFilesSelected,
  onRemoveImage,
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

  return (
    <div className="card-panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <ImageIcon className="text-orange-400" size={18} />
          <h2 className="panel-title">1. Upload Photographs</h2>
        </div>
        <span className="photo-count-badge">
          {images.length} {images.length === 1 ? 'Photo' : 'Photos'} Selected
        </span>
      </div>

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
            <UploadCloud size={32} className="text-orange-400" />
          </div>
          <div className="dropzone-text">
            <p className="dropzone-title">
              {isUploading ? 'Uploading & verifying photos...' : 'Drag & drop photos here, or click to browse'}
            </p>
            <p className="dropzone-hint">
              Supports JPEG, PNG, and WebP (up to 50MB each). Photos will be automatically ordered and analysed.
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

      {/* Uploaded Photos Grid Preview */}
      {images.length > 0 && (
        <div className="photo-grid">
          {images.map((img, idx) => (
            <div key={img.id} className="photo-card group">
              <img
                src={getFileUrl(img.preview_url)}
                alt={img.original_filename}
                className="photo-thumbnail"
              />
              <div className="photo-overlay">
                <span className="photo-index">#{idx + 1}</span>
                {!disabled && (
                  <button
                    onClick={() => onRemoveImage(img.id)}
                    className="photo-remove-btn"
                    title="Remove photo"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="photo-info">
                <span className="photo-name" title={img.original_filename}>
                  {img.original_filename}
                </span>
                <span className="photo-meta">
                  {img.width && img.height ? `${img.width}x${img.height} • ` : ''}
                  {Math.round(img.file_size / 1024)} KB
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
