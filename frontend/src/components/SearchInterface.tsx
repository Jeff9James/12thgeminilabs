import React, { useState, useEffect, useRef } from 'react';
import { useSearch } from '../hooks/useSearch';
import { SearchRequest } from '../types';
import './SearchInterface.css';

interface SearchInterfaceProps {
  videoId: string;
  onSearchResultClick?: (startTime: number, endTime: number) => void;
  className?: string;
}

export const SearchInterface: React.FC<SearchInterfaceProps> = ({
  videoId,
  onSearchResultClick,
  className = '',
}) => {
  const {
    indexingJob,
    isIndexing,
    segments,
    isIndexed,
    searchResults,
    isSearching,
    searchError,
    startIndexing,
    search,
    getSuggestions,
    getPopularTerms,
    clearSearch,
    loadSegments,
  } = useSearch({ videoId });

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [popularTerms, setPopularTerms] = useState<string[]>([]);
  const [searchOptions, setSearchOptions] = useState({
    threshold: 0.5,
    searchType: 'text' as 'text' | 'semantic' | 'entity' | 'action' | 'scene_type',
  });
  
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Load popular terms when indexed
  useEffect(() => {
    if (isIndexed) {
      getPopularTerms().then(setPopularTerms).catch(console.error);
      loadSegments();
    }
  }, [isIndexed, getPopularTerms, loadSegments]);

  // Handle query changes and get suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.trim().length > 1) {
        const newSuggestions = await getSuggestions(query);
        setSuggestions(newSuggestions);
        setShowSuggestions(newSuggestions.length > 0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [query, getSuggestions]);

  // Handle clicks outside suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;

    const searchRequest: SearchRequest = {
      query: query.trim(),
      threshold: searchOptions.threshold,
      searchType: searchOptions.searchType,
    };

    await search(searchRequest);
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    handleSearch();
  };

  const handlePopularTermClick = (term: string) => {
    setQuery(term);
    handleSearch();
  };

  const handleResultClick = (startTime: number, endTime: number) => {
    if (onSearchResultClick) {
      onSearchResultClick(startTime, endTime);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSearchTypeLabel = (type: string): string => {
    const labels = {
      text: 'Text Search',
      semantic: 'Semantic Search',
      entity: 'Entity Search',
      action: 'Action Search',
      scene_type: 'Scene Type Search',
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <div className={`search-interface ${className}`}>
      {/* Indexing Status */}
      {!isIndexed && (
        <div className="indexing-status">
          {isIndexing ? (
            <div className="indexing-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${indexingJob?.progress || 0}%` }}
                />
              </div>
              <p>
                Indexing video... {indexingJob?.progress || 0}% 
                ({indexingJob?.processedSegments || 0}/{indexingJob?.totalSegments || 0} segments)
              </p>
            </div>
          ) : (
            <div className="indexing-prompt">
              <p>This video needs to be indexed for search functionality.</p>
              <button 
                onClick={startIndexing}
                className="btn btn-primary"
              >
                Start Indexing
              </button>
            </div>
          )}
        </div>
      )}

      {/* Search Interface */}
      {isIndexed && (
        <div className="search-container">
          {/* Search Input */}
          <div className="search-input-container" ref={suggestionsRef}>
            <div className="search-input-wrapper">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search within this video..."
                className="search-input"
                disabled={isSearching}
              />
              <button
                onClick={handleSearch}
                disabled={isSearching || !query.trim()}
                className="search-button"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="suggestions-dropdown">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="suggestion-item"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Search Options */}
          <div className="search-options">
            <div className="search-type-selector">
              <label>Search Type:</label>
              <select
                value={searchOptions.searchType}
                onChange={(e) => setSearchOptions(prev => ({ 
                  ...prev, 
                  searchType: e.target.value as any 
                }))}
                className="search-type-select"
              >
                <option value="text">Text Search</option>
                <option value="semantic">Semantic Search</option>
                <option value="entity">Entity Search</option>
                <option value="action">Action Search</option>
                <option value="scene_type">Scene Type Search</option>
              </select>
            </div>

            <div className="threshold-selector">
              <label>Relevance Threshold:</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={searchOptions.threshold}
                onChange={(e) => setSearchOptions(prev => ({ 
                  ...prev, 
                  threshold: parseFloat(e.target.value) 
                }))}
                className="threshold-slider"
              />
              <span className="threshold-value">{searchOptions.threshold}</span>
            </div>
          </div>

          {/* Popular Terms */}
          {popularTerms.length > 0 && (
            <div className="popular-terms">
              <label>Popular terms:</label>
              <div className="terms-container">
                {popularTerms.slice(0, 8).map((term, index) => (
                  <button
                    key={index}
                    onClick={() => handlePopularTermClick(term)}
                    className="term-chip"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchResults && (
            <div className="search-results">
              <div className="results-header">
                <h3>
                  Found {searchResults.totalResults} results in {searchResults.searchTime}ms
                </h3>
                <button onClick={clearSearch} className="clear-button">
                  Clear Results
                </button>
              </div>

              <div className="results-list">
                {searchResults.matches.map((match, index) => (
                  <div
                    key={match.segmentId}
                    className="result-item"
                    onClick={() => handleResultClick(match.startTime, match.endTime)}
                  >
                    <div className="result-time">
                      {formatTime(match.startTime)} - {formatTime(match.endTime)}
                    </div>
                    <div className="result-content">
                      <div className="result-description">
                        {match.description}
                      </div>
                      <div className="result-meta">
                        <span className="relevance-score">
                          Relevance: {(match.relevanceScore * 100).toFixed(0)}%
                        </span>
                        {match.sceneType && (
                          <span className="scene-type">
                            {match.sceneType}
                          </span>
                        )}
                        {match.entities && match.entities.length > 0 && (
                          <span className="entities">
                            {match.entities.slice(0, 3).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Error */}
          {searchError && (
            <div className="search-error">
              <p>Search failed: {searchError}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};