'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, Sparkles, Clock, Video as VideoIcon, Music, Image as ImageIcon, FileText, FileSpreadsheet, File } from 'lucide-react';

interface SearchResult {
  id: string;
  videoId: string;
  videoTitle: string;
  timestamp: number;
  snippet: string;
  thumbnail?: string;
  relevance: number;
  category?: string;
}

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<string>('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setResults([]);
    setSearchStatus('Preparing search...');

    try {
      // Get all files from localStorage (both new 'uploadedFiles' and legacy 'uploadedVideos')
      const storedFiles = localStorage.getItem('uploadedFiles');
      const storedVideos = localStorage.getItem('uploadedVideos');

      let allFiles: any[] = [];

      if (storedFiles) {
        const parsedFiles = JSON.parse(storedFiles);
        allFiles = [...parsedFiles];
      }

      if (storedVideos) {
        const parsedVideos = JSON.parse(storedVideos);
        // Convert legacy video format to generic file format
        const convertedVideos = parsedVideos.map((v: any) => ({
          ...v,
          category: v.category || 'video',
          filename: v.filename || v.title || 'Unknown',
        }));
        allFiles = [...allFiles, ...convertedVideos];
      }

      if (allFiles.length === 0) {
        alert('No files found. Please upload some files first.');
        setIsSearching(false);
        return;
      }

      // Filter files that have been uploaded to Gemini (all file types supported by Gemini)
      const searchableFiles = allFiles.filter((f: any) => f.geminiFileUri);

      if (searchableFiles.length === 0) {
        alert('No files available for search. Please upload and analyze files first.');
        setIsSearching(false);
        return;
      }

      setSearchStatus(`Searching ${searchableFiles.length} file${searchableFiles.length > 1 ? 's' : ''}...`);

      // Call search API
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
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
        setResults(data.results || []);
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
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="text-sm font-medium text-white">Natural Language File Search</span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              Find moments that matter
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Search across all your files using natural language - videos, images, audio, PDFs & more
            </p>
          </motion.div>

          {/* Search Bar */}
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
                placeholder="Search across videos, images, audio, PDFs, and documents..."
                className="w-full pl-16 pr-32 py-6 text-lg rounded-2xl border-0 shadow-2xl focus:ring-4 focus:ring-blue-300 transition-all"
              />
              <button
                type="submit"
                disabled={isSearching || !query.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </motion.form>

          {/* Example Queries */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-6 flex flex-wrap gap-3 justify-center"
          >
            {[
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
            ))}
          </motion.div>
        </div>
      </div>

      {/* Results Section */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {isSearching && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
              <p className="text-gray-600 text-lg">{searchStatus || 'Searching your files...'}</p>
              <p className="text-gray-500 text-sm mt-2">Using parallel AI search for faster results</p>
            </motion.div>
          )}

          {!isSearching && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Found {results.length} results
                </h2>
                <p className="text-gray-600">
                  for "{query}"
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
      </div>
    </div>
  );
}
