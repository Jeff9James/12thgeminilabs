import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import { Video, VideoStatus } from '../../shared/types';
import { VideoUpload } from '../components/VideoUpload';
import { VIDEO_STATUS, SUCCESS_MESSAGES } from '../../shared/constants';
import './VideosPage.css';

export const VideosPage: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<VideoStatus | 'all'>('all');
  const navigate = useNavigate();

  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<Video[]>('/videos');
      if (response.success && response.data) {
        setVideos(response.data);
      } else {
        setError(response.error || 'Failed to fetch videos');
      }
    } catch (err) {
      setError('An error occurred while fetching videos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleUploadComplete = useCallback((video: Video) => {
    setVideos((prev) => [video, ...prev]);
  }, []);

  const handleDelete = useCallback(async (videoId: string) => {
    if (!window.confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      const response = await apiClient.delete(`/videos/${videoId}`);
      if (response.success) {
        setVideos((prev) => prev.filter((v) => v.id !== videoId));
      } else {
        setError(response.error || 'Failed to delete video');
      }
    } catch (err) {
      setError('An error occurred while deleting the video');
    }
  }, []);

  const handleVideoClick = useCallback((videoId: string) => {
    navigate(`/videos/${videoId}`);
  }, [navigate]);

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadgeClass = (status: VideoStatus): string => {
    switch (status) {
      case VIDEO_STATUS.READY:
        return 'badge-ready';
      case VIDEO_STATUS.PROCESSING:
        return 'badge-processing';
      case VIDEO_STATUS.UPLOADING:
      case VIDEO_STATUS.UPLOADED:
      case VIDEO_STATUS.PENDING:
        return 'badge-pending';
      case VIDEO_STATUS.ERROR:
        return 'badge-error';
      default:
        return '';
    }
  };

  const filteredVideos = filter === 'all'
    ? videos
    : videos.filter((v) => v.status === filter);

  if (loading) {
    return (
      <div className="videos-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading videos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="videos-page">
      <div className="page-header">
        <h1>My Videos</h1>
        <p className="page-description">
          Upload and manage your video collection
        </p>
      </div>

      <div className="upload-section">
        <VideoUpload onUploadComplete={handleUploadComplete} />
      </div>

      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="filter-section">
        <div className="filter-tabs">
          {(['all', 'ready', 'processing', 'error'] as const).map((f) => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All Videos' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <span className="video-count">
          {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filteredVideos.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            <polygon points="14 2 20 8 14 8" />
          </svg>
          <h3>No videos yet</h3>
          <p>Upload your first video to get started</p>
        </div>
      ) : (
        <div className="videos-grid">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="video-card"
              onClick={() => handleVideoClick(video.id)}
            >
              <div className="video-thumbnail">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                  <line x1="7" y1="2" x2="7" y2="22" />
                  <line x1="17" y1="2" x2="17" y2="22" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <line x1="2" y1="7" x2="7" y2="7" />
                  <line x1="2" y1="17" x2="7" y2="17" />
                  <line x1="17" y1="17" x2="22" y2="17" />
                  <line x1="17" y1="7" x2="22" y2="7" />
                </svg>
                <span className={`status-badge ${getStatusBadgeClass(video.status)}`}>
                  {video.status}
                </span>
                {video.duration && (
                  <span className="duration-badge">
                    {formatDuration(video.duration)}
                  </span>
                )}
              </div>
              <div className="video-info">
                <h3 className="video-title">{video.title}</h3>
                <div className="video-meta">
                  <span>{formatFileSize(video.fileSize)}</span>
                  <span>•</span>
                  <span>{video.width}x{video.height}</span>
                  <span>•</span>
                  <span>{formatDate(video.createdAt)}</span>
                </div>
              </div>
              <div className="video-actions">
                <button
                  className="action-btn delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(video.id);
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideosPage;
