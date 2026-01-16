import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { videoApi } from '../services/videoApi';
import { Video } from '@shared/types';
import './VideoGrid.css';

interface VideoGridProps {
  videos: Video[];
  isLoading: boolean;
  onDelete?: (videoId: string) => void;
  onAnalyze?: (videoId: string) => void;
}

export function VideoGrid({ videos, isLoading, onDelete, onAnalyze }: VideoGridProps) {
  const navigate = useNavigate();

  const deleteMutation = useMutation({
    mutationFn: (videoId: string) => videoApi.deleteVideo(videoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
  });

  const queryClient = useQueryClient();

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'ready':
        return 'status-badge ready';
      case 'processing':
        return 'status-badge processing';
      case 'uploaded':
        return 'status-badge uploaded';
      case 'error':
        return 'status-badge error';
      default:
        return 'status-badge pending';
    }
  };

  const handleDelete = async (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this video?')) {
      deleteMutation.mutate(videoId);
      onDelete?.(videoId);
    }
  };

  const handleAnalyze = (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation();
    onAnalyze?.(videoId);
  };

  const handleSearch = (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation();
    navigate(`/videos/${videoId}?tab=search`);
  };

  if (isLoading) {
    return (
      <div className="video-grid">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="video-card skeleton">
            <div className="video-thumbnail skeleton-thumbnail" />
            <div className="video-info">
              <div className="skeleton-text skeleton-title" />
              <div className="skeleton-text skeleton-meta" />
              <div className="skeleton-text skeleton-date" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="empty-state">
        <svg
          className="empty-icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        <h3>No videos yet</h3>
        <p>Upload your first video to get started with AI-powered analysis</p>
      </div>
    );
  }

  return (
    <div className="video-grid">
      {videos.map((video) => (
        <div
          key={video.id}
          className="video-card"
          onClick={() => navigate(`/videos/${video.id}`)}
        >
          <div className="video-thumbnail">
            <svg
              className="play-icon"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
            <span className={getStatusBadgeClass(video.status)}>
              {video.status}
            </span>
            <div className="video-duration">{formatDuration(video.duration)}</div>
          </div>
          <div className="video-info">
            <h3 className="video-title">{video.title}</h3>
            <div className="video-meta">
              <span>{video.width && video.height ? `${video.width}x${video.height}` : 'Unknown resolution'}</span>
              <span>•</span>
              <span>{formatFileSize(video.fileSize)}</span>
            </div>
            <div className="video-date">
              Uploaded {formatDate(video.createdAt)}
            </div>
          </div>
          <div className="video-actions">
            <button
              className="action-button"
              onClick={(e) => handleAnalyze(e, video.id)}
              title="Analyze video"
              disabled={video.status !== 'ready'}
            >
              <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </button>
            <button
              className="action-button"
              onClick={(e) => handleSearch(e, video.id)}
              title="Search in video"
              disabled={video.status !== 'ready'}
            >
              <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button
              className="action-button"
              onClick={(e) => {
                e.stopPropagation();
                window.open(`/api/videos/${video.id}/stream`, '_blank');
              }}
              title="Download"
            >
              <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <button
              className="action-button delete"
              onClick={(e) => handleDelete(e, video.id)}
              title="Delete"
            >
              <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
