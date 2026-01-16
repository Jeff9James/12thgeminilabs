import React from 'react';
import { Video } from '@shared/types';
import './MetadataTab.css';

interface MetadataTabProps {
  video: Video;
}

export function MetadataTab({ video }: MetadataTabProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'Unknown';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      ready: { label: 'Ready', className: 'status-badge ready' },
      processing: { label: 'Processing', className: 'status-badge processing' },
      uploaded: { label: 'Uploaded', className: 'status-badge uploaded' },
      error: { label: 'Error', className: 'status-badge error' },
      pending: { label: 'Pending', className: 'status-badge pending' },
    };
    return statusConfig[status] || statusConfig.pending;
  };

  const metadata = [
    { label: 'Title', value: video.title },
    { label: 'Filename', value: video.originalFilename },
    { label: 'File Size', value: formatFileSize(video.fileSize) },
    { label: 'Format', value: video.mimeType || 'Unknown' },
    { label: 'Duration', value: formatDuration(video.duration) },
    { label: 'Resolution', value: video.width && video.height ? `${video.width} × ${video.height}` : 'Unknown' },
    { label: 'Frame Count', value: video.frameCount?.toLocaleString() || 'Unknown' },
    { label: 'Status', value: null, isStatus: true },
    { label: 'Created', value: formatDate(video.createdAt) },
    { label: 'Updated', value: formatDate(video.updatedAt) },
  ];

  return (
    <div className="metadata-tab">
      <div className="metadata-header">
        <h3>Video Information</h3>
      </div>

      <div className="metadata-list">
        {metadata.map((item, index) => (
          <div key={index} className="metadata-item">
            <span className="metadata-label">{item.label}</span>
            {item.isStatus ? (
              <span className={getStatusBadge(video.status).className}>
                {getStatusBadge(video.status).label}
              </span>
            ) : (
              <span className="metadata-value">{item.value}</span>
            )}
          </div>
        ))}
      </div>

      {video.googleDriveId && (
        <div className="drive-section">
          <h4>Google Drive</h4>
          <a
            href={video.googleDriveUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="drive-link"
          >
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.01 2L6.5 11h3.27v9h4.5v-9H17.5z"/>
              <path d="M4.51 12.51l-2 3.5L8.5 22l2-3.5H4.51zM15.5 15.5l2 3.5 6-6-2-3.5h-6z"/>
            </svg>
            View in Google Drive
          </a>
        </div>
      )}

      {video.uploadError && (
        <div className="error-section">
          <h4>Upload Error</h4>
          <p className="error-message">{video.uploadError}</p>
        </div>
      )}

      <div className="video-id-section">
        <h4>Video ID</h4>
        <div className="video-id-row">
          <code className="video-id">{video.id}</code>
          <button
            className="copy-button"
            onClick={() => navigator.clipboard.writeText(video.id)}
            title="Copy ID"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
