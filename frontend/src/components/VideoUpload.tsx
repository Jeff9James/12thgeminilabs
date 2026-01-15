import React, { useCallback, useState } from 'react';
import { useVideoUpload } from '../hooks/useVideoUpload';
import { Video } from '../../shared/types';
import './VideoUpload.css';

interface VideoUploadProps {
  onUploadComplete?: (video: Video) => void;
  maxFileSize?: number;
  acceptedFormats?: string[];
}

export const VideoUpload: React.FC<VideoUploadProps> = ({
  onUploadComplete,
  maxFileSize = 2 * 1024 * 1024 * 1024, // 2GB default
  acceptedFormats = ['mp4', 'mov', 'avi', 'webm'],
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const {
    upload,
    progress,
    isUploading,
    error,
    reset,
  } = useVideoUpload({
    onSuccess: (video) => {
      setSelectedFile(null);
      onUploadComplete?.(video);
    },
    onError: (err) => {
      console.error('Upload error:', err);
    },
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (selectedFile) {
      await upload(selectedFile);
    }
  }, [selectedFile, upload]);

  const handleCancel = useCallback(() => {
    setSelectedFile(null);
    reset();
  }, [reset]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = (): string => {
    if (error) return 'Upload failed';
    if (progress.percentage === 100) return 'Processing...';
    if (isUploading) return `Uploading ${progress.percentage}%`;
    if (selectedFile) return 'Ready to upload';
    return 'Select a video';
  };

  return (
    <div className="video-upload">
      <div
        className={`drop-zone ${dragActive ? 'active' : ''} ${selectedFile ? 'has-file' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="video-input"
          accept={acceptedFormats.map((f) => `.${f}`).join(',')}
          onChange={handleFileChange}
          disabled={isUploading}
          hidden
        />

        {!selectedFile && !isUploading && (
          <label htmlFor="video-input" className="drop-zone-label">
            <div className="drop-zone-content">
              <svg
                className="upload-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="upload-text">
                Drag & drop your video here, or click to browse
              </p>
              <p className="upload-hint">
                Supports: {acceptedFormats.join(', ')} (max {formatFileSize(maxFileSize)})
              </p>
            </div>
          </label>
        )}

        {selectedFile && !isUploading && progress.percentage === 0 && (
          <div className="file-preview">
            <div className="file-info">
              <svg className="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <polygon points="14 2 20 8 14 8" />
              </svg>
              <div className="file-details">
                <span className="file-name">{selectedFile.name}</span>
                <span className="file-size">{formatFileSize(selectedFile.size)}</span>
              </div>
            </div>
            <div className="file-actions">
              <button className="btn btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleUpload}>
                Upload
              </button>
            </div>
          </div>
        )}

        {isUploading && (
          <div className="upload-progress">
            <div className="progress-header">
              <span className="progress-status">{getStatusText()}</span>
              <span className="progress-percent">{progress.percentage}%</span>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <div className="progress-details">
              <span>{formatFileSize(progress.loaded)} / {formatFileSize(progress.total)}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="upload-error">
            <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
            <button className="btn btn-text" onClick={reset}>
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUpload;
