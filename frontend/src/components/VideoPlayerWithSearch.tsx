import React, { useState, useRef } from 'react';
import { SearchInterface } from './SearchInterface';
import './VideoPlayerWithSearch.css';

interface VideoPlayerWithSearchProps {
  videoId: string;
  videoUrl: string;
  title?: string;
  className?: string;
}

export const VideoPlayerWithSearch: React.FC<VideoPlayerWithSearchProps> = ({
  videoId,
  videoUrl,
  title,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Handle search result click - jump to timestamp
  const handleSearchResultClick = (startTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = startTime;
      videoRef.current.play();
    }
  };

  // Update current time from video
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Handle play/pause
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  // Handle video metadata load
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // Handle play state change
  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  // Format time for display
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle seek bar change
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Toggle search interface
  const toggleSearch = () => {
    setShowSearch(!showSearch);
  };

  return (
    <div className={`video-player-with-search ${className}`}>
      {/* Video Title */}
      {title && (
        <div className="video-title">
          <h2>{title}</h2>
        </div>
      )}

      {/* Video Player */}
      <div className="video-container">
        <video
          ref={videoRef}
          src={videoUrl}
          className="video-element"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={handlePlay}
          onPause={handlePause}
          controls={false}
          preload="metadata"
        />

        {/* Custom Controls */}
        <div className="video-controls">
          <div className="controls-row">
            <button
              onClick={handlePlayPause}
              className="control-button"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>

            <div className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            <button
              onClick={toggleSearch}
              className={`search-toggle ${showSearch ? 'active' : ''}`}
              aria-label="Toggle search"
            >
              🔍 Search
            </button>
          </div>

          {/* Seek Bar */}
          <div className="seek-bar-container">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="seek-bar"
            />
          </div>
        </div>
      </div>

      {/* Search Interface */}
      {showSearch && (
        <div className="search-section">
          <SearchInterface
            videoId={videoId}
            onSearchResultClick={handleSearchResultClick}
          />
        </div>
      )}
    </div>
  );
};