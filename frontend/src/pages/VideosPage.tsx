import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { videoApi } from '../services/videoApi';
import { useVideos } from '../hooks/useVideos';
import { VideoGrid } from '../components/VideoGrid';
import { VideoUpload } from '../components/VideoUpload';
import './VideosPage.css';

// SIMPLIFIED: Removed Google Drive import for demo

function VideosPage() {
  const navigate = useNavigate();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'title' | 'duration' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { videos, isLoading, error, refetch } = useVideos({
    search: searchQuery,
    sortBy,
    sortOrder,
  });

  const handleUploadComplete = (videoId: string) => {
    setShowUploadModal(false);
    refetch();
    // Auto-redirect to video detail page
    navigate(`/videos/${videoId}`);
  };

  const handleDelete = async (videoId: string) => {
    try {
      await videoApi.deleteVideo(videoId);
      refetch();
    } catch (err) {
      console.error('Failed to delete video:', err);
    }
  };

  const handleAnalyze = (videoId: string) => {
    navigate(`/videos/${videoId}?tab=summary`);
  };

  return (
    <div className="videos-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">My Videos</h1>
          <p className="page-subtitle">{videos.length} videos</p>
        </div>
        <div className="header-actions">
          {/* SIMPLIFIED: Removed Google Drive import button for demo */}
          <button
            className="upload-button primary"
            onClick={() => setShowUploadModal(true)}
          >
            <svg className="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Video
          </button>
        </div>
      </div>

      <div className="filters-bar">
        <div className="search-input-wrapper">
          <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="sort-controls">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="sort-select"
          >
            <option value="createdAt">Date</option>
            <option value="title">Name</option>
            <option value="duration">Duration</option>
            <option value="status">Status</option>
          </select>
          <button
            className="sort-order-button"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            aria-label="Toggle sort order"
          >
            {sortOrder === 'asc' ? (
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
            ) : (
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Failed to load videos: {error}</span>
          <button onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Upload New Video</h2>
              <button
                className="modal-close"
                onClick={() => setShowUploadModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <VideoUpload onUploadComplete={handleUploadComplete} />
          </div>
        </div>
      )}

      {/* SIMPLIFIED: Removed Google Drive import modal */}

      <VideoGrid
        videos={videos}
        isLoading={isLoading}
        onDelete={handleDelete}
        onAnalyze={handleAnalyze}
      />
    </div>
  );
}

export default VideosPage;
