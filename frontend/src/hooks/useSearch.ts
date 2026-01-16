import { useState, useEffect, useCallback, useRef } from 'react';
import { searchApiService } from '../services/searchApi';
import { SearchRequest, SearchResponse, IndexingJob, TemporalSegment } from '../types';

export interface UseSearchOptions {
  videoId: string;
  autoStartIndexing?: boolean;
  pollingInterval?: number;
}

export interface UseSearchReturn {
  // Indexing state
  indexingJob: IndexingJob | null;
  isIndexing: boolean;
  segments: TemporalSegment[];
  isIndexed: boolean;
  
  // Search state
  searchResults: SearchResponse | null;
  isSearching: boolean;
  searchError: string | null;
  
  // Actions
  startIndexing: () => Promise<void>;
  search: (request: SearchRequest) => Promise<void>;
  getSuggestions: (query: string) => Promise<string[]>;
  getPopularTerms: () => Promise<string[]>;
  reindex: () => Promise<void>;
  clearSearch: () => void;
  loadSegments: () => Promise<void>;
  
  // Polling
  startPolling: () => void;
  stopPolling: () => void;
}

export function useSearch(options: UseSearchOptions): UseSearchReturn {
  const { videoId, autoStartIndexing = false, pollingInterval = 3000 } = options;
  
  // Indexing state
  const [indexingJob, setIndexingJob] = useState<IndexingJob | null>(null);
  const [segments, setSegments] = useState<TemporalSegment[]>([]);
  
  // Search state
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Polling
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Computed values
  const isIndexing = indexingJob?.status === 'processing' || indexingJob?.status === 'pending';
  const isIndexed = segments.length > 0 && !isIndexing;

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Load segments
  const loadSegments = useCallback(async () => {
    try {
      const loadedSegments = await searchApiService.getVideoSegments(videoId);
      setSegments(loadedSegments);
    } catch (error) {
      console.error('Error loading segments:', error);
    }
  }, [videoId]);

  // Check indexing status
  const checkIndexingStatus = useCallback(async () => {
    try {
      const job = await searchApiService.getIndexingStatus(videoId);
      setIndexingJob(job);
      
      if (job?.status === 'complete') {
        // Load segments when indexing is complete
        await loadSegments();
        stopPolling();
      } else if (job?.status === 'error') {
        stopPolling();
      }
    } catch (error) {
      console.error('Error checking indexing status:', error);
      stopPolling();
    }
  }, [videoId, loadSegments, stopPolling]);

  // Start polling for indexing status
  const startPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    pollingRef.current = setInterval(checkIndexingStatus, pollingInterval);
  }, [checkIndexingStatus, pollingInterval]);

  // Start indexing
  const startIndexing = useCallback(async () => {
    try {
      const job = await searchApiService.startIndexing(videoId);
      setIndexingJob(job);
      setSegments([]);
      startPolling();
    } catch (error) {
      console.error('Error starting indexing:', error);
      throw error;
    }
  }, [videoId, startPolling]);

  // Perform search
  const search = useCallback(async (request: SearchRequest) => {
    if (!isIndexed) {
      setSearchError('Video must be indexed before searching');
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const results = await searchApiService.searchVideo(videoId, request);
      setSearchResults(results);
    } catch (error) {
      const errorMessage = error instanceof Error && 'response' in error 
        ? ((error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Search failed')
        : 'Search failed';
      setSearchError(errorMessage);
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  }, [videoId, isIndexed]);

  // Get search suggestions
  const getSuggestions = useCallback(async (query: string): Promise<string[]> => {
    if (!query.trim()) return [];
    
    try {
      return await searchApiService.getSearchSuggestions(videoId, query);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  }, [videoId]);

  // Get popular search terms
  const getPopularTerms = useCallback(async (): Promise<string[]> => {
    try {
      return await searchApiService.getPopularSearchTerms(videoId);
    } catch (error) {
      console.error('Error getting popular terms:', error);
      return [];
    }
  }, [videoId]);

  // Re-index video
  const reindex = useCallback(async () => {
    try {
      const job = await searchApiService.reindexVideo(videoId);
      setIndexingJob(job);
      setSegments([]);
      setSearchResults(null);
      startPolling();
    } catch (error) {
      console.error('Error re-indexing:', error);
      throw error;
    }
  }, [videoId, startPolling]);

  // Clear search results
  const clearSearch = useCallback(() => {
    setSearchResults(null);
    setSearchError(null);
  }, []);

  // Initialize - check indexing status and optionally start indexing
  useEffect(() => {
    checkIndexingStatus();
    
    return () => {
      stopPolling();
    };
  }, [checkIndexingStatus, stopPolling]);

  // Auto-start indexing if enabled
  useEffect(() => {
    if (autoStartIndexing && !isIndexed && !isIndexing && !indexingJob) {
      startIndexing();
    }
  }, [autoStartIndexing, isIndexed, isIndexing, indexingJob, startIndexing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    // State
    indexingJob,
    isIndexing,
    segments,
    isIndexed,
    searchResults,
    isSearching,
    searchError,
    
    // Actions
    startIndexing,
    search,
    getSuggestions,
    getPopularTerms,
    reindex,
    clearSearch,
    loadSegments,
    
    // Polling
    startPolling,
    stopPolling,
  };
}