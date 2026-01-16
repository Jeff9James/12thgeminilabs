import React, { useState, useCallback } from 'react';
import { searchApiService } from '../services/searchApi';
import { SearchRequest, SearchMatchResult } from '@shared/types';
import './SearchTab.css';

interface SearchTabProps {
  videoId: string;
  onResultClick?: (startTime: number, endTime: number) => void;
}

export function SearchTab({ videoId, onResultClick }: SearchTabProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchMatchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<'text' | 'semantic' | 'entity' | 'action'>('semantic');

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      const startTime = performance.now();
      const request: SearchRequest = {
        query: query.trim(),
        searchType,
        threshold: 0.3,
      };

      const response = await searchApiService.searchVideo(videoId, request);
      const endTime = performance.now();

      if (response) {
        setResults(response.matches);
        setSearchTime(endTime - startTime);
        setHasSearched(true);
      } else {
        setError('Search failed. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  }, [query, searchType, videoId]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleResultClick = (result: SearchMatchResult) => {
    onResultClick?.(result.startTime, result.endTime);
  };

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSearchTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      text: 'Text Match',
      semantic: 'Semantic',
      entity: 'Entity',
      action: 'Action',
    };
    return labels[type] || type;
  };

  return (
    <div className="search-tab">
      <div className="search-input-section">
        <div className="search-type-selector">
          {['semantic', 'text', 'entity', 'action'].map((type) => (
            <button
              key={type}
              className={`type-button ${searchType === type ? 'active' : ''}`}
              onClick={() => setSearchType(type as typeof searchType)}
            >
              {getSearchTypeLabel(type)}
            </button>
          ))}
        </div>

        <div className="search-input-wrapper">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search within video..."
            className="search-input"
            disabled={isSearching}
          />
          <button
            className="search-button"
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
          >
            {isSearching ? (
              <div className="search-spinner" />
            ) : (
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="search-error">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {hasSearched && !error && (
        <div className="search-results-info">
          {results.length > 0 ? (
            <>
              <span>Found {results.length} results in {(searchTime / 1000).toFixed(2)}s</span>
              <button className="clear-button" onClick={() => {
                setHasSearched(false);
                setResults([]);
                setQuery('');
              }}>
                Clear
              </button>
            </>
          ) : (
            <span>No results found for "{query}"</span>
          )}
        </div>
      )}

      <div className="search-results">
        {results.map((result) => (
          <div
            key={result.segmentId}
            className="search-result-item"
            onClick={() => handleResultClick(result)}
          >
            <div className="result-time-badge">
              {formatTimestamp(result.startTime)}
            </div>
            <div className="result-content">
              <p className="result-description">{result.description}</p>
              <div className="result-meta">
                <span className="relevance-score">
                  {(result.relevanceScore * 100).toFixed(0)}% relevant
                </span>
                {result.sceneType && (
                  <span className="scene-type-badge">
                    {result.sceneType}
                  </span>
                )}
                {result.entities && result.entities.length > 0 && (
                  <span className="entities-tags">
                    {result.entities.slice(0, 2).join(', ')}
                  </span>
                )}
              </div>
            </div>
            <button className="play-result-button" aria-label="Play this segment">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {!hasSearched && (
        <div className="search-tips">
          <h4>Search Tips</h4>
          <ul>
            <li>Use natural language questions like "What is shown in the beginning?"</li>
            <li>Search for specific objects, people, or actions</li>
            <li>Try different search types for better results</li>
          </ul>
        </div>
      )}
    </div>
  );
}
