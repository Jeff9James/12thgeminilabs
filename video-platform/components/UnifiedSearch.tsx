'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  FileText,
  HardDrive,
  Cloud,
  Filter,
  Sparkles,
  Loader2,
  File,
  Calendar,
  Database,
  TrendingUp,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  searchIndexedFiles,
  getAllIndexedFiles,
  getIndexStats,
  type SearchResult,
  type SearchOptions,
} from '@/lib/localFileIndex';
import { analyzeLocalFile, type AnalysisProgress } from '@/lib/localFileAnalysis';
import { formatFileSize } from '@/lib/localFileAccess';

// Available colors for filter
const COLOR_PRESETS = [
  { name: 'Red', class: 'bg-red-500' },
  { name: 'Blue', class: 'bg-blue-500' },
  { name: 'Green', class: 'bg-green-500' },
  { name: 'Yellow', class: 'bg-yellow-400' },
  { name: 'Orange', class: 'bg-orange-500' },
  { name: 'Purple', class: 'bg-purple-600' },
  { name: 'Pink', class: 'bg-pink-400' },
  { name: 'Black', class: 'bg-gray-900' },
  { name: 'White', class: 'bg-white border border-gray-200' },
  { name: 'Gray', class: 'bg-gray-500' },
  { name: 'Brown', class: 'bg-amber-800' },
  { name: 'Teal', class: 'bg-teal-500' },
];

export default function UnifiedSearch() {
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'all' | 'local' | 'cloud'>('all');
  const [loading, setLoading] = useState(false);
  const [localResults, setLocalResults] = useState<SearchResult[]>([]);
  const [cloudResults, setCloudResults] = useState<any[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Partial<SearchOptions>>({
    fileTypes: [],
    includeAnalyzed: true,
    includeUnanalyzed: true,
    sortBy: 'relevance',
    maxResults: 50,
  });
  const [indexStats, setIndexStats] = useState<any>(null);

  useEffect(() => {
    loadIndexStats();
  }, []);

  const loadIndexStats = async () => {
    try {
      const stats = await getIndexStats();
      setIndexStats(stats);
    } catch (error) {
      console.error('[UnifiedSearch] Error loading stats:', error);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      setLocalResults([]);
      setCloudResults([]);
      return;
    }

    setLoading(true);

    try {
      // Search local files
      if (searchMode === 'all' || searchMode === 'local') {
        const options: SearchOptions = {
          query: query.trim(),
          ...filters,
        };

        const results = await searchIndexedFiles(options);
        setLocalResults(results);
      }

      // Search cloud files (uploaded files)
      if (searchMode === 'all' || searchMode === 'cloud') {
        // TODO: Implement cloud search
        // For now, search localStorage
        const uploadedFiles = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
        const cloudMatches = uploadedFiles.filter((f: any) =>
          f.filename.toLowerCase().includes(query.toLowerCase())
        );
        setCloudResults(cloudMatches);
      }
    } catch (error) {
      console.error('[UnifiedSearch] Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeFile = async (result: SearchResult) => {
    if (!result.file.handle) {
      alert('File handle not available. Please re-index this file.');
      return;
    }

    setAnalyzing(result.file.id);
    setAnalysisProgress(null);

    try {
      await analyzeLocalFile(result.file, (progress) => {
        setAnalysisProgress(progress);
      });

      // Refresh search results
      await handleSearch();
      alert('Analysis complete!');
    } catch (error) {
      console.error('[UnifiedSearch] Analysis error:', error);
      alert(`Analysis failed: ${(error as Error).message}`);
    } finally {
      setAnalyzing(null);
      setAnalysisProgress(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const totalResults = localResults.length + cloudResults.length;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Search Header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-8 mb-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">AI-Powered Search</h1>
            <p className="text-blue-100">Search across local and uploaded files</p>
          </div>
        </div>

        {/* Search Input */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by filename, content, or AI-analyzed topics..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full pl-12 pr-4 py-4 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-white/50 text-lg"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Search
              </>
            )}
          </button>
        </div>

        {/* Search Mode Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setSearchMode('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${searchMode === 'all'
              ? 'bg-white text-blue-600'
              : 'bg-white/20 text-white hover:bg-white/30'
              }`}
          >
            <Database className="w-4 h-4 inline mr-2" />
            All Files
          </button>
          <button
            onClick={() => setSearchMode('local')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${searchMode === 'local'
              ? 'bg-white text-blue-600'
              : 'bg-white/20 text-white hover:bg-white/30'
              }`}
          >
            <HardDrive className="w-4 h-4 inline mr-2" />
            Local Files
            {indexStats && (
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {indexStats.totalFiles}
              </span>
            )}
          </button>
          <button
            onClick={() => setSearchMode('cloud')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${searchMode === 'cloud'
              ? 'bg-white text-blue-600'
              : 'bg-white/20 text-white hover:bg-white/30'
              }`}
          >
            <Cloud className="w-4 h-4 inline mr-2" />
            Uploaded Files
          </button>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="ml-auto px-4 py-2 rounded-lg font-medium bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <Filter className="w-4 h-4 inline mr-2" />
            Filters
            {showFilters ? (
              <ChevronDown className="w-4 h-4 inline ml-2" />
            ) : (
              <ChevronRight className="w-4 h-4 inline ml-2" />
            )}
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">File Types</label>
                <select
                  multiple
                  className="w-full px-3 py-2 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-white/50"
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                    setFilters({ ...filters, fileTypes: selected });
                  }}
                >
                  <option value=".mp4">Videos (.mp4)</option>
                  <option value=".pdf">PDFs (.pdf)</option>
                  <option value=".jpg">Images (.jpg)</option>
                  <option value=".txt">Text (.txt)</option>
                  <option value=".docx">Word (.docx)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Analysis Status</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-white">
                    <input
                      type="checkbox"
                      checked={filters.includeAnalyzed}
                      onChange={(e) =>
                        setFilters({ ...filters, includeAnalyzed: e.target.checked })
                      }
                      className="rounded"
                    />
                    Include Analyzed
                  </label>
                  <label className="flex items-center gap-2 text-white">
                    <input
                      type="checkbox"
                      checked={filters.includeUnanalyzed}
                      onChange={(e) =>
                        setFilters({ ...filters, includeUnanalyzed: e.target.checked })
                      }
                      className="rounded"
                    />
                    Include Unanalyzed
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) =>
                    setFilters({ ...filters, sortBy: e.target.value as any })
                  }
                  className="w-full px-3 py-2 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  <option value="relevance">Relevance</option>
                  <option value="name">Name</option>
                  <option value="date">Date</option>
                  <option value="size">Size</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-white mb-2">Dominant Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setFilters({ ...filters, color: filters.color === color.name ? undefined : color.name })}
                      className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${color.class} ${filters.color === color.name ? 'ring-2 ring-white ring-offset-2 ring-offset-blue-600 scale-110 shadow-lg' : 'hover:scale-110'
                        }`}
                      title={color.name}
                    >
                      {filters.color === color.name && (
                        <div className={`w-2 h-2 rounded-full ${color.name === 'White' ? 'bg-black' : 'bg-white'}`} />
                      )}
                    </button>
                  ))}
                  {filters.color && (
                    <button
                      onClick={() => setFilters({ ...filters, color: undefined })}
                      className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      Clear: {filters.color}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {indexStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Indexed</p>
                <p className="text-2xl font-bold text-gray-900">{indexStats.totalFiles}</p>
              </div>
              <Database className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Analyzed</p>
                <p className="text-2xl font-bold text-green-600">{indexStats.analyzedFiles}</p>
              </div>
              <Sparkles className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Directories</p>
                <p className="text-2xl font-bold text-purple-600">
                  {indexStats.directories.length}
                </p>
              </div>
              <HardDrive className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Size</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatFileSize(indexStats.totalSize)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {totalResults > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {totalResults} Result{totalResults !== 1 ? 's' : ''} Found
          </h2>

          {/* Local Results */}
          {localResults.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-blue-500" />
                Local Files ({localResults.length})
              </h3>

              <div className="space-y-3">
                {localResults.map((result) => (
                  <div
                    key={result.file.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedResult(result)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <File className="w-4 h-4 text-gray-400" />
                          <h4 className="font-semibold text-gray-900">{result.file.name}</h4>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            {result.matchType}
                          </span>
                          {result.file.analyzed && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Analyzed
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 mb-2">{result.file.path}</p>

                        {result.highlights && result.highlights.length > 0 && (
                          <div className="space-y-1">
                            {result.highlights.map((highlight, idx) => (
                              <p key={idx} className="text-sm text-gray-700 bg-yellow-50 px-2 py-1 rounded">
                                {highlight}
                              </p>
                            ))}
                          </div>
                        )}

                        {result.file.analysisResult?.colors && result.file.analysisResult.colors.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {result.file.analysisResult.colors.map((color, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-medium uppercase border border-gray-200">
                                {color}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{formatFileSize(result.file.size)}</span>
                          <span>
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {new Date(result.file.lastModified).toLocaleDateString()}
                          </span>
                          <span>Score: {result.score}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        {!result.file.analyzed && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAnalyzeFile(result);
                            }}
                            disabled={analyzing === result.file.id}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {analyzing === result.file.id ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3" />
                                Analyze
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Analysis Progress */}
                    {analyzing === result.file.id && analysisProgress && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-900">
                            {analysisProgress.stage}
                          </span>
                          <span className="text-sm text-blue-700">
                            {analysisProgress.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${analysisProgress.progress}%` }}
                          />
                        </div>
                        {analysisProgress.message && (
                          <p className="text-xs text-blue-700 mt-1">
                            {analysisProgress.message}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cloud Results */}
          {cloudResults.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Cloud className="w-5 h-5 text-green-500" />
                Uploaded Files ({cloudResults.length})
              </h3>

              <div className="space-y-3">
                {cloudResults.map((file) => (
                  <div
                    key={file.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <h4 className="font-semibold text-gray-900">{file.filename}</h4>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                        Uploaded
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{file.category}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Results */}
      {!loading && query && totalResults === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-600">
            Try different keywords or check if your files are indexed
          </p>
        </div>
      )}

      {/* Empty State */}
      {!query && totalResults === 0 && !loading && (
        <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
          <Sparkles className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Revolutionary AI-Powered Search
          </h3>
          <p className="text-gray-600 mb-4">
            Search across your local and uploaded files using natural language
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
              Search by filename
            </span>
            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
              Search by content
            </span>
            <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
              Search by AI analysis
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
