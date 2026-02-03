'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Clock,
  MessageSquare,
  File,
  Files,
  Trash2,
  Eye,
  Plug,
  Video,
  Music,
  Image as ImageIcon,
  FileText,
  FileSpreadsheet,
  Search,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamps?: string[];
  thoughtSignature?: string;
  mcpToolsUsed?: string[];
}

interface FileChatSession {
  type: 'file';
  fileId: string;
  fileName: string;
  fileCategory: string;
  messages: ChatMessage[];
  lastUpdated: string;
  messageCount: number;
  mcpServersUsed: string[];
}

interface UnifiedChatSession {
  type: 'unified';
  sessionId: string;
  fileIds: string[];
  fileNames: string[];
  messages: Array<{
    question: string;
    answer: string;
    citations: string[];
    timestamp: Date;
    mcpToolsUsed?: string[];
  }>;
  lastUpdated: string;
  messageCount: number;
  mcpServersUsed: string[];
}

interface SearchSession {
  type: 'search';
  sessionId: string;
  query: string;
  timestamp: string;
  resultCount: number;
  filters: {
    excludeFiles: string[];
    includeFiles: string[];
    excludeTypes: string[];
    includeTypes: string[];
  };
  sortBy: string;
  fileSearched: number;
}

type ChatSession = FileChatSession | UnifiedChatSession | SearchSession;

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'messages'>('date');
  const [filterType, setFilterType] = useState<'all' | 'file' | 'unified' | 'search'>('all');
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = () => {
    setIsLoading(true);
    const allSessions: ChatSession[] = [];

    // Load file chat sessions from localStorage
    const keys = Object.keys(localStorage);
    const chatKeys = keys.filter(key => key.startsWith('chat_'));

    chatKeys.forEach(key => {
      try {
        const fileId = key.replace('chat_', '');
        const messages = JSON.parse(localStorage.getItem(key) || '[]');
        
        if (messages.length === 0) return;

        // Get file metadata
        let fileName = 'Unknown File';
        let fileCategory = 'file';
        
        // Try to find file in uploadedFiles
        const uploadedFiles = localStorage.getItem('uploadedFiles');
        if (uploadedFiles) {
          const files = JSON.parse(uploadedFiles);
          const file = files.find((f: any) => f.id === fileId);
          if (file) {
            fileName = file.filename || file.title || 'Unknown File';
            fileCategory = file.category || 'file';
          }
        }

        // Try legacy uploadedVideos if not found
        if (fileName === 'Unknown File') {
          const uploadedVideos = localStorage.getItem('uploadedVideos');
          if (uploadedVideos) {
            const videos = JSON.parse(uploadedVideos);
            const video = videos.find((v: any) => v.id === fileId);
            if (video) {
              fileName = video.filename || video.title || 'Unknown File';
              fileCategory = video.category || 'video';
            }
          }
        }

        // Extract MCP servers used
        const mcpServersUsed = new Set<string>();
        messages.forEach((msg: ChatMessage) => {
          if (msg.mcpToolsUsed) {
            msg.mcpToolsUsed.forEach(tool => {
              // Extract server name from tool (e.g., "read_wiki_structure(repo)" -> "DeepWiki")
              if (tool.includes('read_wiki') || tool.includes('ask_question')) {
                mcpServersUsed.add('DeepWiki MCP');
              }
            });
          }
        });

        // Get last message timestamp
        const lastMessage = messages[messages.length - 1];
        const lastUpdated = new Date().toISOString(); // Fallback

        allSessions.push({
          type: 'file',
          fileId,
          fileName,
          fileCategory,
          messages,
          lastUpdated,
          messageCount: messages.length,
          mcpServersUsed: Array.from(mcpServersUsed),
        });
      } catch (error) {
        console.error(`Error loading chat session ${key}:`, error);
      }
    });

    // Load unified chat sessions (from Chat page)
    const unifiedChatKey = 'unified_chat_history';
    const unifiedChatMetadataKey = 'unified_chat_metadata';
    const unifiedChatHistory = localStorage.getItem(unifiedChatKey);
    const unifiedChatMetadata = localStorage.getItem(unifiedChatMetadataKey);
    
    if (unifiedChatHistory) {
      try {
        const history = JSON.parse(unifiedChatHistory);
        let metadata = { lastUpdated: new Date().toISOString(), fileCount: 0, mcpConnected: false };
        
        if (unifiedChatMetadata) {
          try {
            metadata = JSON.parse(unifiedChatMetadata);
          } catch (e) {
            console.error('Error parsing metadata:', e);
          }
        }
        
        if (history.length > 0) {
          const fileIds = new Set<string>();
          const fileNames = new Set<string>();
          const mcpServersUsed = new Set<string>();

          history.forEach((msg: any) => {
            if (msg.mcpToolsUsed) {
              msg.mcpToolsUsed.forEach((tool: string) => {
                if (tool.includes('read_wiki') || tool.includes('ask_question')) {
                  mcpServersUsed.add('DeepWiki MCP');
                } else {
                  // Generic MCP tool
                  mcpServersUsed.add('MCP Server');
                }
              });
            }
            
            // Extract file information from citations
            if (msg.citations) {
              msg.citations.forEach((citation: string) => {
                // Try to extract file names from citations
                if (citation && !citation.includes('→') && !citation.includes('MCP')) {
                  fileNames.add(citation);
                }
              });
            }
          });

          allSessions.push({
            type: 'unified',
            sessionId: 'unified_session_1',
            fileIds: Array.from(fileIds),
            fileNames: Array.from(fileNames),
            messages: history,
            lastUpdated: metadata.lastUpdated,
            messageCount: history.length,
            mcpServersUsed: Array.from(mcpServersUsed),
          });
        }
      } catch (error) {
        console.error('Error loading unified chat history:', error);
      }
    }

    // Load search sessions from localStorage
    const searchHistoryKey = 'search_history';
    const searchHistory = localStorage.getItem(searchHistoryKey);
    
    if (searchHistory) {
      try {
        const searches = JSON.parse(searchHistory);
        
        if (Array.isArray(searches) && searches.length > 0) {
          searches.forEach((search: any, index: number) => {
            allSessions.push({
              type: 'search',
              sessionId: `search_${index}_${search.timestamp}`,
              query: search.query,
              timestamp: search.timestamp,
              resultCount: search.resultCount || 0,
              filters: search.filters || {
                excludeFiles: [],
                includeFiles: [],
                excludeTypes: [],
                includeTypes: [],
              },
              sortBy: search.sortBy || 'relevance',
              fileSearched: search.fileSearched || 0,
            });
          });
        }
      } catch (error) {
        console.error('Error loading search history:', error);
      }
    }

    setSessions(allSessions);
    setIsLoading(false);
  };

  const sortedSessions = [...sessions].sort((a, b) => {
    if (sortBy === 'date') {
      const dateA = a.type === 'search' ? a.timestamp : a.lastUpdated;
      const dateB = b.type === 'search' ? b.timestamp : b.lastUpdated;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    } else {
      // For search sessions, use resultCount instead of messageCount
      const countA = a.type === 'search' ? a.resultCount : a.messageCount;
      const countB = b.type === 'search' ? b.resultCount : b.messageCount;
      return countB - countA;
    }
  });

  const filteredSessions = sortedSessions.filter(session => {
    if (filterType === 'all') return true;
    return session.type === filterType;
  });

  const deleteSession = (session: ChatSession) => {
    const sessionType = session.type === 'search' ? 'search session' : 'chat session';
    if (!confirm(`Are you sure you want to delete this ${sessionType}? This cannot be undone.`)) {
      return;
    }

    if (session.type === 'file') {
      localStorage.removeItem(`chat_${session.fileId}`);
    } else if (session.type === 'unified') {
      localStorage.removeItem('unified_chat_history');
    } else if (session.type === 'search') {
      // Remove specific search session from history
      const searchHistory = localStorage.getItem('search_history');
      if (searchHistory) {
        try {
          const searches = JSON.parse(searchHistory);
          // Filter out the session to delete by matching timestamp and query
          const updatedSearches = searches.filter((s: any) => 
            !(s.timestamp === session.timestamp && s.query === session.query)
          );
          localStorage.setItem('search_history', JSON.stringify(updatedSearches));
        } catch (e) {
          console.error('Error deleting search session:', e);
        }
      }
    }

    loadChatHistory();
  };

  const viewSession = (session: ChatSession) => {
    if (session.type === 'file') {
      router.push(`/files/${session.fileId}`);
    } else if (session.type === 'unified') {
      // For unified chat, navigate to chat page
      // Ideally, you'd restore the session state
      router.push('/chat');
    } else if (session.type === 'search') {
      // For search sessions, navigate to search page
      router.push('/search');
    }
  };

  const toggleExpand = (sessionId: string) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const getFileIcon = (category: string) => {
    switch (category) {
      case 'video': return <Video className="w-5 h-5" />;
      case 'audio': return <Music className="w-5 h-5" />;
      case 'image': return <ImageIcon className="w-5 h-5" />;
      case 'pdf':
      case 'document':
      case 'text': return <FileText className="w-5 h-5" />;
      case 'spreadsheet': return <FileSpreadsheet className="w-5 h-5" />;
      default: return <File className="w-5 h-5" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getSessionId = (session: ChatSession) => {
    if (session.type === 'file') {
      return session.fileId;
    } else if (session.type === 'unified' || session.type === 'search') {
      return session.sessionId;
    }
    return 'unknown';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-4">
              <Clock className="w-4 h-4 text-yellow-300" />
              <span className="text-sm font-medium text-white">Activity History</span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              Your History
            </h1>
            <p className="text-xl text-purple-100 max-w-2xl mx-auto">
              View and manage all your chat sessions and search history
            </p>
          </motion.div>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Filter by Type */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Type:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filterType === 'all'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType('file')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                    filterType === 'file'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <File className="w-4 h-4" />
                  File Chats
                </button>
                <button
                  onClick={() => setFilterType('unified')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                    filterType === 'unified'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Files className="w-4 h-4" />
                  Multi-File
                </button>
                <button
                  onClick={() => setFilterType('search')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                    filterType === 'search'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  Searches
                </button>
              </div>
            </div>

            {/* Sort by */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'messages')}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
              >
                <option value="date">Most Recent</option>
                <option value="messages">Most Messages</option>
              </select>
            </div>

            {/* Stats */}
            <div className="ml-auto flex items-center gap-4 text-sm text-gray-600">
              <span>{filteredSessions.length} sessions</span>
              <button
                onClick={loadChatHistory}
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 rounded-full animate-spin mb-4 border-purple-200 border-t-purple-600" />
            <p className="text-gray-600">Loading chat history...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No activity yet
            </h3>
            <p className="text-gray-600 mb-6">
              Start chatting with your files or search across your content
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.push('/files')}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                Go to Files
              </button>
              <button
                onClick={() => router.push('/chat')}
                className="px-6 py-3 bg-white text-purple-600 border-2 border-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
              >
                Go to Chat
              </button>
              <button
                onClick={() => router.push('/search')}
                className="px-6 py-3 bg-white text-green-600 border-2 border-green-600 rounded-lg font-semibold hover:bg-green-50 transition-colors"
              >
                Go to Search
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map((session, index) => {
              const sessionId = getSessionId(session);
              const isExpanded = expandedSessions.has(sessionId);

              return (
                <motion.div
                  key={sessionId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Session Header */}
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                        session.type === 'file'
                          ? 'bg-blue-100 text-blue-600'
                          : session.type === 'unified'
                          ? 'bg-purple-100 text-purple-600'
                          : 'bg-green-100 text-green-600'
                      }`}>
                        {session.type === 'file' ? (
                          getFileIcon(session.fileCategory)
                        ) : session.type === 'unified' ? (
                          <Files className="w-6 h-6" />
                        ) : (
                          <Search className="w-6 h-6" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {session.type === 'file' ? (
                                session.fileName
                              ) : session.type === 'unified' ? (
                                `Chat with ${session.fileNames.length > 0 ? session.fileNames.length : 'Multiple'} Files`
                              ) : (
                                session.query
                              )}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(session.type === 'search' ? session.timestamp : session.lastUpdated)}</span>
                            </div>
                          </div>

                          {/* Type Badge */}
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            session.type === 'file'
                              ? 'bg-blue-100 text-blue-700'
                              : session.type === 'unified'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {session.type === 'file' ? 'Single File' : session.type === 'unified' ? 'Multi-File' : 'Search'}
                          </span>
                        </div>

                        {/* Stats */}
                        <div className="flex flex-wrap items-center gap-4 mt-3">
                          {session.type === 'search' ? (
                            <>
                              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                <Search className="w-4 h-4" />
                                <span>{session.resultCount} results</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                <Files className="w-4 h-4" />
                                <span>{session.fileSearched} files searched</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                <MessageSquare className="w-4 h-4" />
                                <span>{session.messageCount} messages</span>
                              </div>

                              {session.type === 'unified' && session.fileNames.length > 0 && (
                                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                  <Files className="w-4 h-4" />
                                  <span>{session.fileNames.length} files</span>
                                </div>
                              )}

                              {session.mcpServersUsed.length > 0 && (
                                <div className="flex items-center gap-1.5 text-sm text-green-600">
                                  <Plug className="w-4 h-4" />
                                  <span>{session.mcpServersUsed.length} MCP server{session.mcpServersUsed.length > 1 ? 's' : ''}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* MCP Servers Used - only for chat sessions */}
                        {session.type !== 'search' && session.mcpServersUsed.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {session.mcpServersUsed.map((server: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded"
                              >
                                {server}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Filters Used - only for search sessions */}
                        {session.type === 'search' && (
                          <div className="mt-3">
                            {(session.filters.includeTypes.length > 0 || session.filters.excludeTypes.length > 0 ||
                              session.filters.includeFiles.length > 0 || session.filters.excludeFiles.length > 0) && (
                              <div className="flex flex-wrap gap-2">
                                <span className="text-xs text-gray-600 font-medium">Filters:</span>
                                {session.filters.includeTypes.map((type, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded">
                                    +{type}
                                  </span>
                                ))}
                                {session.filters.excludeTypes.map((type, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-red-50 text-red-700 text-xs font-medium rounded">
                                    -{type}
                                  </span>
                                ))}
                                {session.filters.includeFiles.length > 0 && (
                                  <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                                    +{session.filters.includeFiles.length} files
                                  </span>
                                )}
                                {session.filters.excludeFiles.length > 0 && (
                                  <span className="px-2 py-1 bg-orange-50 text-orange-700 text-xs font-medium rounded">
                                    -{session.filters.excludeFiles.length} files
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-3 mt-4">
                          <button
                            onClick={() => viewSession(session)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            View Session
                          </button>

                          <button
                            onClick={() => toggleExpand(sessionId)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-4 h-4" />
                                Hide Preview
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4" />
                                Show Preview
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => deleteSession(session)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Preview */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50 p-6">
                      {session.type === 'search' ? (
                        <>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">
                            Search Details
                          </h4>
                          <div className="space-y-3">
                            <div className="p-4 rounded-lg bg-white border border-gray-200">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="text-xs text-gray-500 font-medium">Query</span>
                                  <p className="text-sm text-gray-900 font-medium mt-1">{session.query}</p>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500 font-medium">Sort By</span>
                                  <p className="text-sm text-gray-900 mt-1 capitalize">{session.sortBy}</p>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500 font-medium">Results Found</span>
                                  <p className="text-sm text-gray-900 mt-1">{session.resultCount}</p>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500 font-medium">Files Searched</span>
                                  <p className="text-sm text-gray-900 mt-1">{session.fileSearched}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">
                            Message Preview (Last 3)
                          </h4>
                          <div className="space-y-3">
                            {session.type === 'file' ? (
                              session.messages.slice(-3).map((msg: any, idx: number) => (
                                <div
                                  key={idx}
                                  className={`p-3 rounded-lg text-sm ${
                                    msg.role === 'user'
                                      ? 'bg-blue-100 text-blue-900'
                                      : 'bg-white text-gray-900 border border-gray-200'
                                  }`}
                                >
                                  <div className="font-medium mb-1">
                                    {msg.role === 'user' ? 'You' : 'AI'}:
                                  </div>
                                  <div className="line-clamp-2">{msg.content}</div>
                                </div>
                              ))
                            ) : session.type === 'unified' ? (
                              session.messages.slice(-3).map((msg: any, idx: number) => (
                                <div key={idx} className="space-y-2">
                                  <div className="p-3 rounded-lg text-sm bg-blue-100 text-blue-900">
                                    <div className="font-medium mb-1">You:</div>
                                    <div className="line-clamp-2">{msg.question}</div>
                                  </div>
                                  <div className="p-3 rounded-lg text-sm bg-white text-gray-900 border border-gray-200">
                                    <div className="font-medium mb-1">AI:</div>
                                    <div className="line-clamp-2">{msg.answer}</div>
                                  </div>
                                </div>
                              ))
                            ) : null}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
