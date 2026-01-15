import React, { useState, useRef } from 'react';
import { useVideoUpload, UseVideoUploadReturn } from '../hooks/useVideoUpload';
import { UPLOAD_CONSTANTS } from '../../shared/constants';
import './VideoUpload.css';

interface VideoUploadProps {
  onUploadComplete?: (videoId: string) => void;
  maxSize?: number;
  acceptedFormats?: string[];
}

interface VideoUploadWithProgressProps extends VideoUploadProps {
  uploadHook: UseVideoUploadReturn;
}

export function VideoUpload({
  onUploadComplete,
  maxSize = UPLOAD_CONSTANTS.MAX_FILE_SIZE,
  acceptedFormats = UPLOAD_CONSTANTS.SUPPORTED_FORMATS,
}: VideoUploadProps): React.ReactElement {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadHook = useVideoUpload({
    onSuccess: (videoId) => {
      onUploadComplete?.(videoId);
      setSelectedFile(null);
      setTitle('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error) => {
      setValidationError(error.message);
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    setValidationError(null);

    if (!file) {
      return;
    }

    // Validate file type
    if (!acceptedFormats.includes(file.type)) {
      setValidationError(
        `Invalid file type. Supported types: ${UPLOAD_CONSTANTS.SUPPORTED_EXTENSIONS.join(', ')}`
      );
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      const maxSizeGB = maxSize / (1024 * 1024 * 1024);
      setValidationError(`File too large. Maximum size is ${maxSizeGB}GB`);
      return;
    }

    setSelectedFile(file);
    setTitle(file.name.split('.')[0]);
  };

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!selectedFile) {
      return;
    }
    await uploadHook.upload(selectedFile, title);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="video-upload">
      <form onSubmit={handleSubmit} className="video-upload-form">
        <div className="upload-area">
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFormats.join(',')}
            onChange={handleFileSelect}
            className="file-input"
            disabled={uploadHook.isUploading}
          />
          {!selectedFile && (
            <div className="upload-placeholder">
              <svg
                className="upload-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p>Click to select a video file</p>
              <p className="upload-hint">
                Supported formats: MP4, MOV, AVI, WebM (max 2GB)
              </p>
            </div>
          )}
          {selectedFile && (
            <div className="selected-file">
              <div className="file-info">
                <span className="file-name">{selectedFile.name}</span>
                <span className="file-size">{formatFileSize(selectedFile.size)}</span>
              </div>
              <button
                type="button"
                className="remove-file"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                disabled={uploadHook.isUploading}
              >
                ×
              </button>
            </div>
          )}
        </div>

        {selectedFile && (
          <div className="upload-form-fields">
            <div className="form-group">
              <label htmlFor="video-title">Video Title</label>
              <input
                id="video-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for your video"
                required
                disabled={uploadHook.isUploading}
              />
            </div>

            {validationError && (
              <div className="error-message">{validationError}</div>
            )}

            {uploadHook.error && (
              <div className="error-message">{uploadHook.error}</div>
            )}

            <button
              type="submit"
              className="upload-button"
              disabled={!selectedFile || uploadHook.isUploading}
            >
              {uploadHook.isUploading ? 'Uploading...' : 'Upload Video'}
            </button>
          </div>
        )}
      </form>

      {uploadHook.isUploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${uploadHook.progress}%` }}
            />
          </div>
          <span className="progress-text">{uploadHook.progress}%</span>
        </div>
      )}
    </div>
  );
}

export default VideoUpload;
