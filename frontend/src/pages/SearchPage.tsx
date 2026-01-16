import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Video } from '@shared/types';
import { useVideos } from '../hooks/useVideos';
import './SearchPage.css';

function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'title' | 'content'>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Video[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const { videos, isLoading } = useVideos({
    search: query,
  });

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    const results = videos.filter((video) => {
      if (searchType === 'title' || searchType === 'all') {
        return (
          video.title.toLowerCase().includes(query.toLowerCase()) ||
          video.originalFilename.toLowerCase().includes(query.toLowerCase())
        );
      }
      return false;
    });

    setSearchResults(results);
    setIsSearching(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
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

  const displayVideos = hasSearched ? searchResults : videos;

  return (
    <div className="search-page">
      <div className="search-header">
        <h1>Search Videos</h1>
        <p>Find videos by title, filename, or content</p>
      </div>

      <div className="search-box">
        <div className="search-input-group">
          <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search your videos..."
            className="search-input"
            disabled={isLoading}
          />
          <button
            className="search-button"
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
          >
            {isSearching ? (
              <div className="search-spinner" />
            ) : (
              'Search'
            )}
          </button>
        </div>

        <div className="search-filters">
          <label className="filter-label">Search in:</label>
          <div className="filter-options">
            {[
              { value: 'all', label: 'All Videos' },
              { value: 'title', label: 'Title' },
            ].map((option) => (
              <label key={option.value} className="filter-option">
                <input
                  type="radio"
                  name="searchType"
                  value={option.value}
                  checked={searchType === option.value}
                  onChange={(e) => setSearchType(e.target.value as typeof searchType)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {hasSearched && (
        <div className="search-results-info">
          {searchResults.length > 0 ? (
            <span>Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{query}"</span>
          ) : (
            <span>No results found for "{query}"</span>
          )}
          <button className="clear-search" onClick={() => {
            setQuery('');
            setHasSearched(false);
            setSearchResults([]);
          }}>
            Clear search
          </button>
        </div>
      )}

      <div className="search-results">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading videos...</p>
          </div>
        ) : displayVideos.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            <h3>{hasSearched ? 'No results found' : 'No videos yet'}</h3>
            <p>{hasSearched ? 'Try a different search term' : 'Upload some videos to get started'}</p>
            {!hasSearched && (
              <Link to="/videos" className="upload-link">
                Go to Videos
              </Link>
            )}
          </div>
        ) : (
          <div className="results-grid">
            {displayVideos.map((video) => (
              <Link
                key={video.id}
                to={`/videos/${video.id}`}
                className="result-card"
              >
                <div className="result-thumbnail">
                  <svg fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span className={`status-badge ${video.status}`}>{video.status}</span>
                  <span className="duration">{formatDuration(video.duration)}</span>
                </div>
                <div className="result-info">
                  <h3>{video.title}</h3>
                  <div className="result-meta">
                    <span>{formatFileSize(video.fileSize)}</span>
                    <span>•</span>
                    <span>{video.width && video.height ? `${video.width}x${video.height}` : 'Unknown'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchPage;
