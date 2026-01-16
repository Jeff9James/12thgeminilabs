import React, { useState, useEffect } from 'react';
import { chatService } from '../services/chatService';
import { Bookmark } from '../../../shared/types';
import './BookmarksSidebar.css';

interface BookmarksSidebarProps {
  videoId: string;
  onTimestampClick: (timestamp: number) => void;
  isOpen: boolean;
  onToggle: () => void;
}

interface BookmarksState {
  bookmarks: Bookmark[];
  isLoading: boolean;
  error: string | null;
}

export function BookmarksSidebar({ videoId, onTimestampClick, isOpen, onToggle }: BookmarksSidebarProps) {
  const [state, setState] = useState<BookmarksState>({
    bookmarks: [],
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    if (isOpen) {
      loadBookmarks();
    }
  }, [isOpen, videoId]);

  const loadBookmarks = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await chatService.getBookmarks(videoId);
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          bookmarks: response.data!.bookmarks,
          isLoading: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: response.error || 'Failed to load bookmarks',
          isLoading: false,
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to load bookmarks',
        isLoading: false,
      }));
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    if (!confirm('Are you sure you want to delete this bookmark?')) {
      return;
    }

    try {
      const response = await chatService.deleteBookmark(videoId, bookmarkId);
      if (response.success) {
        setState(prev => ({
          ...prev,
          bookmarks: prev.bookmarks.filter(b => b.id !== bookmarkId),
        }));
      } else {
        alert('Failed to delete bookmark');
      }
    } catch (error) {
      alert('Failed to delete bookmark');
    }
  };

  const handleTimestampClick = (timestamp: number) => {
    onTimestampClick(timestamp);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const exportBookmarks = () => {
    const data = {
      videoId,
      exportedAt: new Date().toISOString(),
      bookmarks: state.bookmarks.map(bookmark => ({
        timestamp: bookmark.timestampSeconds,
        formattedTime: formatTime(bookmark.timestampSeconds),
        note: bookmark.note,
        createdAt: bookmark.createdAt,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `video-bookmarks-${videoId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) {
    return (
      <button className="bookmarks-toggle" onClick={onToggle} title="Show bookmarks">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        {state.bookmarks.length > 0 && (
          <span className="bookmarks-count">{state.bookmarks.length}</span>
        )}
      </button>
    );
  }

  return (
    <div className="bookmarks-sidebar">
      <div className="bookmarks-header">
        <h3>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          Bookmarks
        </h3>
        <div className="bookmarks-actions">
          {state.bookmarks.length > 0 && (
            <button className="export-button" onClick={exportBookmarks} title="Export bookmarks">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}
          <button className="close-button" onClick={onToggle} title="Hide bookmarks">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {state.error && (
        <div className="bookmarks-error">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{state.error}</span>
          <button onClick={loadBookmarks}>Retry</button>
        </div>
      )}

      <div className="bookmarks-content">
        {state.isLoading ? (
          <div className="bookmarks-loading">
            <div className="loading-spinner"></div>
            <span>Loading bookmarks...</span>
          </div>
        ) : state.bookmarks.length === 0 ? (
          <div className="bookmarks-empty">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <h4>No bookmarks yet</h4>
            <p>Save important moments while chatting to quickly navigate back to them later.</p>
          </div>
        ) : (
          <div className="bookmarks-list">
            {state.bookmarks.map((bookmark) => (
              <div key={bookmark.id} className="bookmark-item">
                <button
                  className="bookmark-timestamp"
                  onClick={() => handleTimestampClick(bookmark.timestampSeconds)}
                  title={`Jump to ${formatTime(bookmark.timestampSeconds)}`}
                >
                  {formatTime(bookmark.timestampSeconds)}
                </button>
                <div className="bookmark-content">
                  {bookmark.note && (
                    <p className="bookmark-note">{bookmark.note}</p>
                  )}
                  <span className="bookmark-date">{formatDate(bookmark.createdAt)}</span>
                </div>
                <button
                  className="bookmark-delete"
                  onClick={() => handleDeleteBookmark(bookmark.id)}
                  title="Delete bookmark"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}