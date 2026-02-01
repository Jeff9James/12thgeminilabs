'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, Sparkles, Clock, Video as VideoIcon, Music, Image as ImageIcon, FileText, FileSpreadsheet, File, Filter, SortAsc, X, ChevronDown, MessageSquare, Bot, RotateCcw } from 'lucide-react';

interface SearchResult {
  id: string;
  videoId: string;
  videoTitle: string;
  timestamp: number;
  snippet: string;
  thumbnail?: string;
  relevance: number;
  category?: string;
  uploadedAt?: string;
  lastUsedAt?: string;
}

interface AIResponse {
  answer: string;
  citations: string[];
}

interface ChatMessage {
  question: string;
  answer: string;
  citations: string[];
  timestamp: Date;
}

type SortOption = 'relevance' | 'uploadedAsc' | 'uploadedDesc' | 'usedAsc' | 'usedDesc' | 'nameAsc' | 'nameDesc';

interface FileFilters {
  excludeFiles: string[];
  includeFiles: string[];
  excludeTypes: string[];
  includeTypes: string[];
}

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [rawResults, setRawResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<string>('');
  const [mode, setMode] = useState<'search' | 'chat'>('search');
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  
  // Filter and sort state
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FileFilters>({
    excludeFiles: [],
    includeFiles: [],
    excludeTypes: [],
    includeTypes: [],
  });
  const [allFiles, setAllFiles] = useState<any[]>([]);
  
  // Available file types
  const fileTypes = ['video', 'audio', 'image', 'pdf', 'document', 'spreadsheet', 'text'];

  // Load all files on mount so filters are available before search
  React.useEffect(() => {
    const storedFiles = localStorage.getItem('uploadedFiles');
    const storedVideos = localStorage.getItem('uploadedVideos');

    let loadedFiles: any[] = [];

    if (storedFiles) {
      const parsedFiles = JSON.parse(storedFiles);
      loadedFiles = [...parsedFiles];
    }

    if (storedVideos) {
      const parsedVideos = JSON.parse(storedVideos);
      // Convert legacy video format to generic file format
      const convertedVideos = parsedVideos.map((v: any) => ({
        ...v,
        category: v.category || 'video',
        filename: v.filename || v.title || 'Unknown',
      }));
      loadedFiles = [...loadedFiles, ...convertedVideos];
    }

    setAllFiles(loadedFiles);
  }, []);

  // Apply filters and sort to results
  const results = useMemo(() => {
    let filtered = [...rawResults];
    
    // Apply file type filters
    if (filters.includeTypes.length > 0) {
      filtered = filtered.filter(r => filters.includeTypes.includes(r.category || 'video'));
    }
    if (filters.excludeTypes.length > 0) {
      filtered = filtered.filter(r => !filters.excludeTypes.includes(r.category || 'video'));
    }
    
    // Apply file name filters
    if (filters.includeFiles.length > 0) {
      filtered = filtered.filter(r => filters.includeFiles.includes(r.videoId));
    }
    if (filters.excludeFiles.length > 0) {
      filtered = filtered.filter(r => !filters.excludeFiles.includes(r.videoId));
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'relevance':
        return filtered.sort((a, b) => b.relevance - a.relevance);
      case 'uploadedAsc':
        return filtered.sort((a, b) => 
          new Date(a.uploadedAt || 0).getTime() - new Date(b.uploadedAt || 0).getTime()
        );
      case 'uploadedDesc':
        return filtered.sort((a, b) => 
          new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime()
        );
      case 'usedAsc':
        return filtered.sort((a, b) => 
          new Date(a.lastUsedAt || 0).getTime() - new Date(b.lastUsedAt || 0).getTime()
        );
      case 'usedDesc':
        return filtered.sort((a, b) => 
          new Date(b.lastUsedAt || 0).getTime() - new Date(a.lastUsedAt || 0).getTime()
        );
      case 'nameAsc':
        return filtered.sort((a, b) => a.videoTitle.localeCompare(b.videoTitle));
      case 'nameDesc':
        return filtered.sort((a, b) => b.videoTitle.localeCompare(a.videoTitle));
      default:
        return filtered;
    }
  }, [rawResults, filters, sortBy]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setRawResults([]);
    
    // Only clear AI response and chat history when switching modes or in search mode
    if (mode === 'search') {
      setAiResponse(null);
      setChatHistory([]);
    }
    
    setSearchStatus('Preparing search...');

    try {
      if (allFiles.length === 0) {
        alert('No files found. Please upload some files first.');
        setIsSearching(false);
        return;
      }

      // Filter files that have been uploaded to Gemini (all file types supported by Gemini)
      // Also apply pre-search filters
      let searchableFiles = allFiles.filter((f: any) => f.geminiFileUri);

      // Apply filters to searchable files before searching
      if (filters.includeTypes.length > 0) {
        searchableFiles = searchableFiles.filter(f => filters.includeTypes.includes(f.category || 'video'));
      }
      if (filters.excludeTypes.length > 0) {
        searchableFiles = searchableFiles.filter(f => !filters.excludeTypes.includes(f.category || 'video'));
      }
      if (filters.includeFiles.length > 0) {
        searchableFiles = searchableFiles.filter(f => filters.includeFiles.includes(f.id));
      }
      if (filters.excludeFiles.length > 0) {
        searchableFiles = searchableFiles.filter(f => !filters.excludeFiles.includes(f.id));
      }

      if (searchableFiles.length === 0) {
        alert('No files available for search with current filters. Please adjust your filters or upload more files.');
        setIsSearching(false);
        return;
      }

      setSearchStatus(`Searching ${searchableFiles.length} file${searchableFiles.length > 1 ? 's' : ''}...`);

      // Call search API with mode parameter and chat history
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          mode: mode,
          history: mode === 'chat' ? chatHistory : [],
          videos: searchableFiles.map((f: any) => ({
            id: f.id,
            filename: f.filename,
            title: f.filename,
            geminiFileUri: f.geminiFileUri,
            mimeType: f.mimeType || 'video/mp4',
            category: f.category || 'video',
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Search request failed');
      }

      const data = await response.json();

      if (data.success) {
        // Enrich results with upload and usage timestamps
        const enrichedResults = (data.results || []).map((result: SearchResult) => {
          const file = allFiles.find(f => f.id === result.videoId);
          return {
            ...result,
            uploadedAt: file?.uploadedAt || file?.createdAt,
            lastUsedAt: file?.lastUsedAt || file?.lastAnalyzedAt,
          };
        });
        
        setRawResults(enrichedResults);
        
        // Set AI response and update chat history if in chat mode
        if (mode === 'chat' && data.aiResponse) {
          setAiResponse(data.aiResponse);
          
          // Add to chat history
          const newMessage: ChatMessage = {
            question: query.trim(),
            answer: data.aiResponse.answer,
            citations: data.aiResponse.citations || [],
            timestamp: new Date(),
          };
          setChatHistory(prev => [...prev, newMessage]);
        }
        
        if (data.cached) {
          setSearchStatus('Results from cache');
        } else {
          setSearchStatus('Search complete');
        }
        // Clear status after 2 seconds
        setTimeout(() => setSearchStatus(''), 2000);
      } else {
        throw new Error(data.error || 'Search failed');
      }

    } catch (error: any) {
      console.error('Search error:', error);
      alert(`Search failed: ${error.message}. Please try again.`);
      setSearchStatus('');
    } finally {
      setIsSearching(false);
    }
  };

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const toggleFilter = (type: 'excludeFiles' | 'includeFiles' | 'excludeTypes' | 'includeTypes', value: string) => {
    setFilters(prev => {
      const current = prev[type];
      if (current.includes(value)) {
        return { ...prev, [type]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [type]: [...current, value] };
      }
    });
  };

  const clearFilters = () => {
    setFilters({
      excludeFiles: [],
      includeFiles: [],
      excludeTypes: [],
      includeTypes: [],
    });
  };

  const hasActiveFilters = 
    filters.excludeFiles.length > 0 ||
    filters.includeFiles.length > 0 ||
    filters.excludeTypes.length > 0 ||
    filters.includeTypes.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero/Search Area */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 py-16 lg:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="flex items-center gap-4 justify-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full">
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <span className="text-sm font-medium text-white">Natural Language File Search</span>
              </div>
              
              {/* Mode Toggle */}
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full p-1">
                <button
                  onClick={() => setMode('search')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    mode === 'search'
                      ? 'bg-white text-blue-600 shadow-lg'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <SearchIcon className="w-4 h-4" />
                    <span>Search</span>
                  </div>
                </button>
                <button
                  onClick={() => setMode('chat')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    mode === 'chat'
                      ? 'bg-white text-purple-600 shadow-lg'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>Chat</span>
                  </div>
                </button>
              </div>
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              {mode === 'search' ? 'Find moments that matter' : 'Ask questions about your files'}
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              {mode === 'search' 
                ? 'Search across all your files using natural language - videos, images, audio, PDFs & more'
                : 'Get AI-powered answers with citations from your uploaded files'}
            </p>
          </motion.div>

          {/* Search Bar - Only show in Search Mode */}
          {mode === 'search' && (
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onSubmit={handleSearch}
              className="relative"
            >  
                
              <div className="relative">
                <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={mode === 'search' 
                    ? "Search across videos, images, audio, PDFs, and documents..."
                    : "Ask a question about your files..."}
                  className="w-full pl-16 pr-32 py-6 text-lg rounded-2xl border-0 shadow-2xl focus:ring-4 focus:ring-blue-300 transition-all"
                />
                <button
                  type="submit"
                  disabled={isSearching || !query.trim()}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 px-6 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    mode === 'search'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {isSearching ? (mode === 'search' ? 'Searching...' : 'Thinking...') : (mode === 'search' ? 'Search' : 'Ask')}
                </button>
              </div>
            </motion.form>
          )}

          {/* Chat Mode Initial Prompt */}
          {mode === 'chat' && chatHistory.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <p className="text-xl text-purple-100">
                Ask a question and start a conversation with your files
              </p>
            </motion.div>
          )}  
   
          {/* Filter and Sort Controls - Available in both modes */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-6"
          >
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4">
                <div className="flex flex-wrap items-center gap-4 justify-center">
                  {/* Sort Dropdown */}
                  <div className="flex items-center gap-2">
                    <SortAsc className="w-5 h-5 text-white" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="px-4 py-2 border border-white/20 rounded-lg focus:ring-2 focus:ring-white bg-white/10 text-white backdrop-blur-sm"
                    >
                      <option value="relevance" className="text-gray-900">Sort by Relevance</option>
                      <option value="uploadedDesc" className="text-gray-900">Recently Uploaded (Newest First)</option>
                      <option value="uploadedAsc" className="text-gray-900">Recently Uploaded (Oldest First)</option>
                      <option value="usedDesc" className="text-gray-900">Recently Used (Newest First)</option>
                      <option value="usedAsc" className="text-gray-900">Recently Used (Oldest First)</option>
                      <option value="nameAsc" className="text-gray-900">Name (A-Z)</option>
                      <option value="nameDesc" className="text-gray-900">Name (Z-A)</option>
                    </select>
                  </div>

                  {/* Filter Toggle Button */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      showFilters || hasActiveFilters
                        ? `bg-white ${mode === 'search' ? 'text-blue-600' : 'text-purple-600'}`
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                    }`}
                  >
                    <Filter className="w-5 h-5" />
                    Configure Filters
                    {hasActiveFilters && (
                      <span className={`px-2 py-0.5 text-white rounded-full text-xs font-bold ${
                        mode === 'search' ? 'bg-blue-600' : 'bg-purple-600'
                      }`}>
                        {filters.excludeFiles.length + filters.includeFiles.length + 
                         filters.excludeTypes.length + filters.includeTypes.length}
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Clear Filters */}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/90 text-white hover:bg-red-600 rounded-lg font-medium transition-colors"
                    >
                      <X className="w-5 h-5" />
                      Clear Filters
                    </button>
                  )}
                </div>

                {/* Filter Panel */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* File Type Filters */}
                        <div>
                          <h3 className="text-sm font-semibold text-white mb-3">File Types</h3>
                          <div className="space-y-3">
                            {/* Include Types */}
                            <div>
                              <label className="text-xs text-blue-100 mb-2 block">Include Only:</label>
                              <div className="flex flex-wrap gap-2">
                                {fileTypes.map((type) => (
                                  <button
                                    key={`include-${type}`}
                                    onClick={() => toggleFilter('includeTypes', type)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                      filters.includeTypes.includes(type)
                                        ? 'bg-green-500 text-white'
                                        : 'bg-white/20 text-white hover:bg-white/30'
                                    }`}
                                  >
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Exclude Types */}
                            <div>
                              <label className="text-xs text-blue-100 mb-2 block">Exclude:</label>
                              <div className="flex flex-wrap gap-2">
                                {fileTypes.map((type) => (
                                  <button
                                    key={`exclude-${type}`}
                                    onClick={() => toggleFilter('excludeTypes', type)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                      filters.excludeTypes.includes(type)
                                        ? 'bg-red-500 text-white'
                                        : 'bg-white/20 text-white hover:bg-white/30'
                                    }`}
                                  >
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Specific Files Filters */}
                        <div>
                          <h3 className="text-sm font-semibold text-white mb-3">Specific Files</h3>
                          <div className="space-y-3">
                            {/* Include Files */}
                            <div>
                              <label className="text-xs text-blue-100 mb-2 block">Include Only:</label>
                              <div className="max-h-32 overflow-y-auto space-y-1 bg-white/10 backdrop-blur-sm rounded-lg p-2">
                                {allFiles.length > 0 ? (
                                  allFiles.map((file) => (
                                    <label
                                      key={`include-file-${file.id}`}
                                      className="flex items-center gap-2 px-2 py-1 hover:bg-white/20 rounded cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={filters.includeFiles.includes(file.id)}
                                        onChange={() => toggleFilter('includeFiles', file.id)}
                                        className="rounded border-white/30 text-green-500 focus:ring-green-500"
                                      />
                                      <span className="text-sm text-white truncate flex-1">
                                        {file.filename || file.title || 'Unknown'}
                                      </span>
                                      <span className="text-xs text-blue-200 uppercase">
                                        {file.category || 'file'}
                                      </span>
                                    </label>
                                  ))
                                ) : (
                                  <p className="text-sm text-blue-200 text-center py-2">No files available. Upload files to search!</p>
                                )}
                              </div>
                            </div>

                            {/* Exclude Files */}
                            <div>
                              <label className="text-xs text-blue-100 mb-2 block">Exclude:</label>
                              <div className="max-h-32 overflow-y-auto space-y-1 bg-white/10 backdrop-blur-sm rounded-lg p-2">
                                {allFiles.length > 0 ? (
                                  allFiles.map((file) => (
                                    <label
                                      key={`exclude-file-${file.id}`}
                                      className="flex items-center gap-2 px-2 py-1 hover:bg-white/20 rounded cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={filters.excludeFiles.includes(file.id)}
                                        onChange={() => toggleFilter('excludeFiles', file.id)}
                                        className="rounded border-white/30 text-red-500 focus:ring-red-500"
                                      />
                                      <span className="text-sm text-white truncate flex-1">
                                        {file.filename || file.title || 'Unknown'}
                                      </span>
                                      <span className="text-xs text-blue-200 uppercase">
                                        {file.category || 'file'}
                                      </span>
                                    </label>
                                  ))
                                ) : (
                                  <p className="text-sm text-blue-200 text-center py-2">No files available</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
          </motion.div>

          {/* Clear Conversation Button (Chat Mode Only) */}
          {mode === 'chat' && chatHistory.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 flex justify-center"
            >
              <button
                onClick={() => {
                  setChatHistory([]);
                  setAiResponse(null);
                  setRawResults([]);
                  setQuery('');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Start New Conversation
              </button>
            </motion.div>
          )}

          {/* Example Queries */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`${mode === 'chat' && chatHistory.length > 0 ? 'mt-2' : 'mt-4'} flex flex-wrap gap-3 justify-center`}
          >
            {mode === 'search' ? (
              [
                'Show me action scenes',
                'Find images with mountains',
                'What does the PDF say about budget?',
                'Audio clips about meetings',
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setQuery(example)}
                  className="px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg text-sm hover:bg-white/20 transition-colors"
                >
                  {example}
                </button>
              ))
            ) : (
              [
                'Summarize what was discussed in the meetings',
                'What are the key points from the presentation?',
                'Explain the budget allocation',
                'What recommendations were made?',
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setQuery(example)}
                  className="px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg text-sm hover:bg-white/20 transition-colors"
                >
                  {example}
                </button>
              ))
            )}
          </motion.div>
        </div>
      </div>

      {/* Results Info Bar - Only show after search */}
      {rawResults.length > 0 && (
        <div className={`bg-gradient-to-r border-b ${
          mode === 'search' 
            ? 'from-blue-50 to-indigo-50 border-blue-100'
            : 'from-purple-50 to-pink-50 border-purple-100'
        }`}>
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                {mode === 'search' ? (
                  <Sparkles className="w-4 h-4 text-blue-600" />
                ) : (
                  <Bot className="w-4 h-4 text-purple-600" />
                )}
                <span className="font-semibold text-gray-900">
                  {mode === 'search' ? 'Search Results' : 'AI Response & Sources'}
                </span>
              </div>
              <div className="flex items-center gap-4">
                {hasActiveFilters && (
                  <span className={`font-medium ${mode === 'search' ? 'text-blue-600' : 'text-purple-600'}`}>
                    {filters.excludeFiles.length + filters.includeFiles.length + 
                     filters.excludeTypes.length + filters.includeTypes.length} filters active
                  </span>
                )}
                <span className="text-gray-600">
                  Showing <span className="font-bold text-gray-900">{results.length}</span> of <span className="font-bold text-gray-900">{rawResults.length}</span> results
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      <div className={`max-w-7xl mx-auto px-6 ${mode === 'chat' ? 'pb-32' : 'py-12'}`}>
        <AnimatePresence mode="wait">
          {isSearching && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className={`w-16 h-16 border-4 rounded-full animate-spin mb-4 ${
                mode === 'search' 
                  ? 'border-blue-200 border-t-blue-600'
                  : 'border-purple-200 border-t-purple-600'
              }`} />
              <p className="text-gray-600 text-lg">{searchStatus || (mode === 'search' ? 'Searching your files...' : 'Generating AI response...')}</p>
              <p className="text-gray-500 text-sm mt-2">Using parallel AI search for faster results</p>
            </motion.div>
          )}

          {!isSearching && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Chat History Section (Chat Mode Only) */}
              {mode === 'chat' && chatHistory.length > 0 && (
                <div className="mb-8 space-y-6">
                  {chatHistory.map((msg, index) => (
                    <div key={index} className="space-y-4">
                      {/* User Question */}
                      <div className="flex justify-end">
                        <div className="max-w-3xl bg-blue-600 text-white rounded-2xl px-6 py-4">
                          <p className="font-medium">{msg.question}</p>
                          <p className="text-xs text-blue-100 mt-2">
                            {msg.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      
                      {/* AI Response */}
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border-2 border-purple-200 shadow-lg">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                              <Bot className="w-6 h-6 text-white" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                              <span>AI Response</span>
                              {index === chatHistory.length - 1 && (
                                <span className="px-2 py-1 bg-purple-200 text-purple-700 text-xs font-bold rounded-full">
                                  FOLLOW-UP AWARE
                                </span>
                              )}
                            </h3>
                            <div className="prose prose-purple max-w-none">
                              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{msg.answer}</p>
                            </div>
                            
                            {/* Citations */}
                            {msg.citations && msg.citations.length > 0 && (
                              <div className="mt-6">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                  <FileText className="w-4 h-4" />
                                  Sources ({msg.citations.length})
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {msg.citations.map((citation, citIndex) => (
                                    <div
                                      key={citIndex}
                                      className="px-3 py-1.5 bg-white rounded-lg text-sm border border-purple-200 text-purple-700 font-medium"
                                    >
                                      [{citIndex + 1}] {citation}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Follow-up prompt */}
                  {!isSearching && (
                    <div className="flex items-center justify-center gap-2 text-sm text-purple-600 bg-purple-50 px-4 py-3 rounded-lg border border-purple-200">
                      <MessageSquare className="w-4 h-4" />
                      <span>Ask a follow-up question to continue the conversation</span>
                    </div>
                  )}
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {mode === 'search' ? 'Found' : 'Source Files'} {results.length} {mode === 'search' ? 'results' : 'references'}
                </h2>
                <p className="text-gray-600">
                  {mode === 'search' ? 'for' : 'used to answer'} "{query}"
                </p>
              </div>

              {/* Masonry Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((result, index) => {
                  // Get icon and styling based on file category
                  const isVideo = result.category === 'video' || !result.category;
                  const isAudio = result.category === 'audio';
                  const isImage = result.category === 'image';
                  const isPDF = result.category === 'pdf';
                  const isDocument = result.category === 'document' || result.category === 'text';
                  const isSpreadsheet = result.category === 'spreadsheet';

                  // Get gradient based on category
                  let gradient = 'from-gray-200 to-gray-300';
                  let iconColor = 'text-gray-400';
                  let icon = <VideoIcon className="w-12 h-12 text-gray-400" />;
                  let actionText = 'View Details';

                  if (isVideo) {
                    gradient = 'from-blue-100 to-blue-200';
                    iconColor = 'text-blue-500';
                    icon = <VideoIcon className={`w-12 h-12 ${iconColor}`} />;
                    actionText = 'Play from ' + formatTimestamp(result.timestamp);
                  } else if (isAudio) {
                    gradient = 'from-purple-100 to-purple-200';
                    iconColor = 'text-purple-500';
                    icon = <Music className={`w-12 h-12 ${iconColor}`} />;
                    actionText = 'Play from ' + formatTimestamp(result.timestamp);
                  } else if (isImage) {
                    gradient = 'from-green-100 to-green-200';
                    iconColor = 'text-green-500';
                    icon = <ImageIcon className={`w-12 h-12 ${iconColor}`} />;
                    actionText = 'View Image';
                  } else if (isPDF) {
                    gradient = 'from-red-100 to-red-200';
                    iconColor = 'text-red-500';
                    icon = <FileText className={`w-12 h-12 ${iconColor}`} />;
                    actionText = 'View PDF';
                  } else if (isDocument) {
                    gradient = 'from-orange-100 to-orange-200';
                    iconColor = 'text-orange-500';
                    icon = <FileText className={`w-12 h-12 ${iconColor}`} />;
                    actionText = 'View Document';
                  } else if (isSpreadsheet) {
                    gradient = 'from-pink-100 to-pink-200';
                    iconColor = 'text-pink-500';
                    icon = <FileSpreadsheet className={`w-12 h-12 ${iconColor}`} />;
                    actionText = 'View Spreadsheet';
                  }

                  return (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                      onClick={() => router.push(`/files/${result.videoId}`)}
                    >
                      {/* Thumbnail */}
                      <div className={`relative aspect-video bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                        {icon}

                        {/* Timestamp Badge - only for video/audio */}
                        {(isVideo || isAudio) && result.timestamp > 0 && (
                          <div className="absolute bottom-3 right-3 px-3 py-1 bg-black/80 text-white rounded-lg text-sm font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimestamp(result.timestamp)}
                          </div>
                        )}

                        {/* Relevance Badge */}
                        <div className="absolute top-3 right-3 px-2 py-1 bg-green-500 text-white rounded text-xs font-bold">
                          {Math.round(result.relevance * 100)}%
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          {isVideo && <VideoIcon className="w-4 h-4" />}
                          {isAudio && <Music className="w-4 h-4" />}
                          {isImage && <ImageIcon className="w-4 h-4" />}
                          {(isPDF || isDocument) && <FileText className="w-4 h-4" />}
                          {isSpreadsheet && <FileSpreadsheet className="w-4 h-4" />}
                          <span className="font-medium">{result.videoTitle}</span>
                        </div>

                        <p className="text-gray-700 leading-relaxed line-clamp-3">
                          {result.snippet}
                        </p>

                        <button className="mt-4 w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          {actionText}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {!isSearching && results.length === 0 && query && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <SearchIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No results found
              </h3>
              <p className="text-gray-600">
                Try a different search query or upload more files
              </p>
            </motion.div>
          )}
        </AnimatePresence>
          {/* Chat Input Box - Fixed at Bottom (Chat Mode Only) */}
        {mode === 'chat' && (
          <div className="fixed bottom-0 left-0 right-0 lg:left-72 bg-white border-t border-gray-200 shadow-2xl z-30">
            <div className="max-w-7xl mx-auto px-6 py-4">
              {/* Conversation counter + clear button */}
              {chatHistory.length > 0 && (
                <div className="mb-3 flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    {chatHistory.length} {chatHistory.length === 1 ? 'exchange' : 'exchanges'} in conversation
                  </span>
                  <button
                    onClick={() => {
                      setChatHistory([]);
                      setAiResponse(null);
                      setRawResults([]);
                      setQuery('');
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium text-sm"
                  >
                    <RotateCcw className="w-3 h-3" />
                    New Conversation
                  </button>
                </div>
              )}

              {/* Chat Input Form */}
              <form onSubmit={handleSearch} className="relative">
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={chatHistory.length === 0 
                      ? "Ask a question about your files..."
                      : "Ask a follow-up question..."}
                    disabled={isSearching}
                    className="w-full pl-12 pr-32 py-4 text-base rounded-xl border-2 border-purple-200 focus:ring-4 focus:ring-purple-300 focus:border-purple-400 transition-all disabled:bg-gray-100"
                  />
                  <button
                    type="submit"
                    disabled={isSearching || !query.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {isSearching ? 'Thinking...' : (chatHistory.length === 0 ? 'Ask' : 'Send')}
                  </button>
                </div>
        
                {/* Example queries - only on first question */}
                {chatHistory.length === 0 && (
                   <div className="mt-2 flex flex-wrap gap-2">
                     {[
                       'Summarize all files',
                       'What are the key points?',
                       'Find budget information',
                       'What topics are covered?',
                      ].map((example) => (
                       <button
                         key={example}
                         type="button"
                         onClick={() => setQuery(example)}
                         className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs hover:bg-purple-100 transition-colors"
                        >
                         {example}
                        </button>
                      ))}
                    </div>
                  )}
                </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}