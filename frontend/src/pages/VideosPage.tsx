import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { VideoUpload } from '../components/VideoUpload';
import { videoApi } from '../services/videoApi';
import { Video } from '../../shared/types';
import './VideosPage.css';

function VideosPage() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setIsLoading(true);
      const response = await videoApi.listVideos();
      if (response.success && response.data) {
        setVideos(response.data);
      }
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadComplete = (videoId: string) => {
    setShowUploadModal(false);
    loadVideos();
    navigate(`/videos/${videoId}`);
  };

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

  return (
    <div className="videos-page">
      <div className="page-header">
        <h1 className="page-title">My Videos</h1>
        <button
          className="upload-button"
          onClick={() => setShowUploadModal(true)}
        >
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Upload Video
        </button>
      </div>

      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Upload New Video</h2>
              <button
                className="modal-close"
                onClick={() => setShowUploadModal(false)}
              >
                ×
              </button>
            </div>
            <VideoUpload onUploadComplete={handleUploadComplete} />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading videos...</p>
        </div>
      ) : videos.length === 0 ? (
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
          <button
            className="upload-button"
            onClick={() => setShowUploadModal(true)}
          >
            Upload Video
          </button>
        </div>
      ) : (
        <div className="videos-grid">
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
              </div>
              <div className="video-info">
                <h3 className="video-title">{video.title}</h3>
                <div className="video-meta">
                  <span>{formatDuration(video.duration)}</span>
                  <span>•</span>
                  <span>{video.width && video.height ? `${video.width}x${video.height}` : 'Unknown resolution'}</span>
                  <span>•</span>
                  <span>{formatFileSize(video.fileSize)}</span>
                </div>
                <div className="video-date">
                  Uploaded {formatDate(video.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default VideosPage;
