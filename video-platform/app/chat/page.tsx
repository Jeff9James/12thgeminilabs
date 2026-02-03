'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search as SearchIcon,
  Sparkles,
  Clock,
  Video as VideoIcon,
  Music,
  Image as ImageIcon,
  FileText,
  FileSpreadsheet,
  File,
  Filter,
  SortAsc,
  X,
  ChevronDown,
  MessageSquare,
  Bot,
  RotateCcw,
  Database,
  Plug,
  Wrench,
  Loader2,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import {
  connectToMCPServer,
  disconnectFromMCPServer,
  callMCPTool,
  type MCPServerConnection,
  type MCPTool
} from '@/lib/mcp';

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
  mcpToolsUsed?: string[];
  role?: 'user' | 'assistant';
  pendingActions?: AgentAction[];
}

interface AgentAction {
  toolName: string;
  args: any;
  id: string;
}

type SortOption = 'relevance' | 'uploadedAsc' | 'uploadedDesc' | 'usedAsc' | 'usedDesc' | 'nameAsc' | 'nameDesc';

interface FileFilters {
  excludeFiles: string[];
  includeFiles: string[];
  excludeTypes: string[];
  includeTypes: string[];
}

export default function ChatPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [rawResults, setRawResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // Search mode: true = use metadata only (fast, cheap), false = use full file (detailed, slower)
  const [useMetadata, setUseMetadata] = useState(true);

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

  // MCP Server state
  const [mcpServerUrl, setMcpServerUrl] = useState('https://mcp.deepwiki.com/mcp');
  const [mcpConnection, setMcpConnection] = useState<MCPServerConnection | null>(null);
  const [mcpConnecting, setMcpConnecting] = useState(false);
  const [mcpError, setMcpError] = useState<string | null>(null);
  const [showMCPPanel, setShowMCPPanel] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [selectedMCPTool, setSelectedMCPTool] = useState<MCPTool | null>(null);
  const [mcpToolArgs, setMcpToolArgs] = useState<Record<string, string>>({});

  // Agent State
  const [isAgentMode, setIsAgentMode] = useState(true);
  const [pendingActions, setPendingActions] = useState<AgentAction[]>([]);
  const [isApplying, setIsApplying] = useState(false);

  // MCP connection handler
  const handleMCPConnect = async () => {
    if (!mcpServerUrl.trim()) return;
    setMcpConnecting(true);
    setMcpError(null);
    try {
      const connection = await connectToMCPServer(mcpServerUrl.trim());
      setMcpConnection(connection);
    } catch (err: any) {
      setMcpError(err.message || 'Failed to connect');
    } finally {
      setMcpConnecting(false);
    }
  };

  const handleMCPDisconnect = async () => {
    if (mcpConnection) {
      await disconnectFromMCPServer(mcpConnection);
      setMcpConnection(null);
      setSelectedMCPTool(null);
      setMcpToolArgs({});
    }
  };

  const handleCallMCPTool = async () => {
    if (!mcpConnection || !selectedMCPTool) return;
    setIsSearching(true);
    setSearchStatus(`Calling ${selectedMCPTool.name}...`);
    try {
      const result = await callMCPTool(mcpConnection, selectedMCPTool.name, mcpToolArgs);

      // Extract text content from MCP response
      let responseText = '';
      let isError = false;

      if (result && typeof result === 'object') {
        const mcpResult = result as { content?: Array<{ type: string; text?: string }>; isError?: boolean };

        // Check for error
        if (mcpResult.isError) {
          isError = true;
        }

        // Extract text from content array (standard MCP format)
        if (mcpResult.content && Array.isArray(mcpResult.content)) {
          responseText = mcpResult.content
            .filter((item) => item.type === 'text' && item.text)
            .map((item) => item.text)
            .join('\n\n');
        }

        // If no text content found, try other formats
        if (!responseText) {
          // Try output field (some tools use this)
          if ('output' in result && typeof (result as any).output === 'string') {
            responseText = (result as any).output;
          } else {
            // Fallback to pretty JSON
            responseText = '```json\n' + JSON.stringify(result, null, 2) + '\n```';
          }
        }
      } else if (typeof result === 'string') {
        responseText = result;
      } else {
        responseText = String(result);
      }

      // Format the question to show tool call details
      const argsDisplay = Object.entries(mcpToolArgs)
        .map(([k, v]) => `${k}: "${v}"`)
        .join(', ');

      const newMessage = {
        question: `🔧 **Tool:** \`${selectedMCPTool.name}\`\n**Arguments:** ${argsDisplay || '(none)'}`,
        answer: isError ? `❌ **Error:**\n${responseText}` : responseText,
        citations: [`${mcpConnection.serverInfo?.name || 'MCP Server'} → ${selectedMCPTool.name}`],
        timestamp: new Date(),
      };
      setChatHistory(prev => [...prev, newMessage]);
      setSearchStatus('');
    } catch (err: any) {
      setMcpError(err.message || 'Tool call failed');
      setSearchStatus('');
    } finally {
      setIsSearching(false);
    }
  };

  // Available file types
  const fileTypes = ['video', 'audio', 'image', 'pdf', 'document', 'spreadsheet', 'text'];

  // Save unified chat history to localStorage whenever it changes
  React.useEffect(() => {
    if (chatHistory.length > 0) {
      const sessionData = {
        history: chatHistory,
        lastUpdated: new Date().toISOString(),
        fileCount: allFiles.length,
        mcpConnected: mcpConnection !== null,
      };
      localStorage.setItem('unified_chat_history', JSON.stringify(sessionData.history));
      localStorage.setItem('unified_chat_metadata', JSON.stringify({
        lastUpdated: sessionData.lastUpdated,
        fileCount: sessionData.fileCount,
        mcpConnected: sessionData.mcpConnected,
      }));
    }
  }, [chatHistory, allFiles, mcpConnection]);

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

  // Helper function to detect if query needs MCP tools and call them
  const handleMCPToolsIfNeeded = async (userQuery: string): Promise<{
    mcpResults: string[];
    toolsUsed: string[];
  }> => {
    const mcpResults: string[] = [];
    const toolsUsed: string[] = [];

    // Only attempt MCP if connected
    if (!mcpConnection || !mcpConnection.connected) {
      return { mcpResults, toolsUsed };
    }

    // Check if query mentions repos or GitHub-related terms that DeepWiki can handle
    const needsDeepWiki = /github|repository|repo|documentation|wiki|moinfra|modelcontextprotocol|typescript-sdk|mcp-client-sdk/i.test(userQuery);

    if (!needsDeepWiki) {
      return { mcpResults, toolsUsed };
    }

    setSearchStatus('Using MCP tools for GitHub repositories...');

    // Extract repository names from query
    const repoMatches = userQuery.match(/['"]?([a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)['"]?/g);
    const repos = repoMatches?.map(r => r.replace(/['"]/g, '')) || [];

    // If no specific repos found but mentions specific known repos, add them
    if (repos.length === 0) {
      if (/moinfra.*mcp-client-sdk|mcp-client-sdk/i.test(userQuery)) {
        repos.push('moinfra/mcp-client-sdk');
      }
      if (/modelcontextprotocol.*typescript-sdk|typescript-sdk/i.test(userQuery)) {
        repos.push('modelcontextprotocol/typescript-sdk');
      }
    }

    // Use MCP tools for each repository
    for (const repo of repos.slice(0, 3)) { // Limit to 3 repos to avoid timeouts
      try {
        // First get the wiki structure
        const structureResult = await callMCPTool(mcpConnection, 'read_wiki_structure', {
          repoName: repo
        });

        let structureText = '';
        if (structureResult && typeof structureResult === 'object') {
          const mcpResult = structureResult as { content?: Array<{ type: string; text?: string }> };
          if (mcpResult.content && Array.isArray(mcpResult.content)) {
            structureText = mcpResult.content
              .filter((item) => item.type === 'text' && item.text)
              .map((item) => item.text)
              .join('\n');
          }
        }

        if (structureText) {
          mcpResults.push(`Wiki Structure for ${repo}:\n${structureText}`);
          toolsUsed.push(`read_wiki_structure(${repo})`);
        }

        // Then read the full wiki contents
        const contentsResult = await callMCPTool(mcpConnection, 'read_wiki_contents', {
          repoName: repo
        });

        let contentsText = '';
        if (contentsResult && typeof contentsResult === 'object') {
          const mcpResult = contentsResult as { content?: Array<{ type: string; text?: string }> };
          if (mcpResult.content && Array.isArray(mcpResult.content)) {
            contentsText = mcpResult.content
              .filter((item) => item.type === 'text' && item.text)
              .map((item) => item.text)
              .join('\n');
          }
        }

        if (contentsText) {
          mcpResults.push(`Wiki Contents for ${repo}:\n${contentsText}`);
          toolsUsed.push(`read_wiki_contents(${repo})`);
        }

        // If query is asking a specific question, use ask_question tool
        if (/how|what|why|when|where|explain|describe|tell me|guide|tutorial/i.test(userQuery)) {
          const questionResult = await callMCPTool(mcpConnection, 'ask_question', {
            repoName: repo,
            question: userQuery
          });

          let answerText = '';
          if (questionResult && typeof questionResult === 'object') {
            const mcpResult = questionResult as { content?: Array<{ type: string; text?: string }> };
            if (mcpResult.content && Array.isArray(mcpResult.content)) {
              answerText = mcpResult.content
                .filter((item) => item.type === 'text' && item.text)
                .map((item) => item.text)
                .join('\n');
            }
          }

          if (answerText) {
            mcpResults.push(`Answer from DeepWiki about ${repo}:\n${answerText}`);
            toolsUsed.push(`ask_question(${repo})`);
          }
        }

      } catch (toolError: any) {
        console.error(`Error calling MCP tool for ${repo}:`, toolError);
        // Don't fail the whole request, just log and continue
        mcpResults.push(`Note: Could not fetch information for ${repo} via MCP`);
      }
    }

    return { mcpResults, toolsUsed };
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setRawResults([]);

    setSearchStatus(isAgentMode ? 'Consulting File Agent...' : 'Preparing chat...');

    try {
      if (isAgentMode) {
        const response = await fetch('/api/chat/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: query.trim(),
            history: chatHistory.slice(-5) // Send some context
          })
        });

        const data = await response.json();
        if (data.success) {
          const newMessage: ChatMessage = {
            question: query.trim(),
            answer: data.answer,
            citations: [],
            timestamp: new Date(),
            role: 'assistant',
            pendingActions: data.pendingActions
          };
          setChatHistory(prev => [...prev, newMessage]);
          if (data.pendingActions?.length > 0) {
            setPendingActions(prev => [...prev, ...data.pendingActions]);
          }
        } else {
          throw new Error(data.error || 'Agent request failed');
        }
        setIsSearching(false);
        setQuery('');
        return;
      }

      // First, check if we should use MCP tools
      const { mcpResults, toolsUsed } = await handleMCPToolsIfNeeded(query.trim());
      // ... (rest of search logic remains until line 567)

      if (allFiles.length === 0 && mcpResults.length === 0) {
        alert('No files found and no MCP results. Please upload some files or connect to an MCP server.');
        setIsSearching(false);
        return;
      }

      // If we have MCP results and no files, create a direct response
      if (mcpResults.length > 0 && allFiles.length === 0) {
        // Create AI response from MCP results only
        setSearchStatus('Generating response from MCP data...');

        const combinedMCPData = mcpResults.join('\n\n---\n\n');
        const aiAnswer = `Based on the information retrieved from the connected MCP server:\n\n${combinedMCPData}`;

        setAiResponse({
          answer: aiAnswer,
          citations: toolsUsed
        });

        const newMessage: ChatMessage = {
          question: query.trim(),
          answer: aiAnswer,
          citations: toolsUsed,
          timestamp: new Date(),
          mcpToolsUsed: toolsUsed
        };
        setChatHistory(prev => [...prev, newMessage]);

        setSearchStatus('Chat complete');
        setTimeout(() => setSearchStatus(''), 2000);
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

      if (searchableFiles.length === 0 && mcpResults.length === 0) {
        alert('No files available for chat with current filters. Please adjust your filters or upload more files.');
        setIsSearching(false);
        return;
      }

      setSearchStatus(`Analyzing ${searchableFiles.length} file${searchableFiles.length > 1 ? 's' : ''}${mcpResults.length > 0 ? ' and MCP data' : ''}...`);

      // Call search API with mode=chat and chat history for follow-up support
      // Do NOT send MCP results in query to avoid JSON parsing issues
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(), // Original query only
          mode: 'chat',
          history: chatHistory,
          useMetadata,
          videos: searchableFiles.map((f: any) => ({
            id: f.id,
            filename: f.filename,
            title: f.filename,
            geminiFileUri: f.geminiFileUri,
            mimeType: f.mimeType || 'video/mp4',
            category: f.category || 'video',
            analysis: f.analysis, // Include analysis for metadata search
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Chat request failed');
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

        // Log mode used for developer transparency
        if (data.usedMetadata) {
          console.log('✅ Quick Mode: Searched metadata only (major cost savings)');
        } else {
          console.log('🔍 Detailed Mode: AI processed all files');
        }

        // Set AI response and update chat history for follow-up support
        if (data.aiResponse || mcpResults.length > 0) {
          // If we have MCP results, enhance the AI response
          let enhancedAnswer = '';

          if (data.aiResponse) {
            enhancedAnswer = data.aiResponse.answer;
          } else if (mcpResults.length > 0) {
            // No file results, but we have MCP results
            enhancedAnswer = `I couldn't find relevant information in your uploaded files for this query, but I retrieved information from the connected MCP server:`;
          }

          if (mcpResults.length > 0) {
            enhancedAnswer += `\n\n---\n\n**Information from MCP server:**\n\n${mcpResults.join('\n\n---\n\n')}`;
          }

          setAiResponse({
            answer: enhancedAnswer,
            citations: [...(data.aiResponse?.citations || []), ...toolsUsed]
          });

          // Add to chat history with MCP tools used
          const newMessage: ChatMessage = {
            question: query.trim(),
            answer: enhancedAnswer,
            citations: [...(data.aiResponse?.citations || []), ...toolsUsed],
            timestamp: new Date(),
            mcpToolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined
          };
          setChatHistory(prev => [...prev, newMessage]);
        }

        if (data.cached) {
          setSearchStatus('Results from cache');
        } else {
          setSearchStatus('Chat complete');
        }
        // Clear status after 2 seconds
        setTimeout(() => setSearchStatus(''), 2000);
      } else {
        throw new Error(data.error || 'Chat failed');
      }

    } catch (error: any) {
      console.error('Chat error:', error);
      alert(`Chat failed: ${error.message}. Please try again.`);
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

  const getFileIcon = (category?: string) => {
    switch (category) {
      case 'video': return <VideoIcon className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'pdf':
      case 'document':
      case 'text': return <FileText className="w-4 h-4" />;
      case 'spreadsheet': return <FileSpreadsheet className="w-4 h-4" />;
      default: return <File className="w-4 h-4" />;
    }
  };

  const applyActions = async () => {
    if (pendingActions.length === 0) return;
    setIsApplying(true);
    try {
      const res = await fetch('/api/chat/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actions: pendingActions })
      });
      const data = await res.json();
      if (data.success) {
        setPendingActions([]);
        setChatHistory(prev => [...prev, {
          question: "✅ Action Execution",
          answer: "Successfully applied all proposed changes to your files and folders.",
          citations: [],
          timestamp: new Date(),
          role: 'assistant'
        }]);
        // Refresh files
        const storedFiles = localStorage.getItem('uploadedFiles');
        // In a real app we'd trigger a re-fetch from API
        window.location.reload();
      }
    } catch (err) {
      console.error('Apply actions failed:', err);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left Sidebar for Desktop Settings */}
      <aside className="hidden lg:flex w-80 bg-white border-r border-gray-100 flex-col h-screen sticky top-0 overflow-y-auto shrink-0 z-40">
        <div className="p-6 space-y-10">
          <div>
            <div className="flex items-center gap-2 mb-4 px-1">
              <Plug className="w-4 h-4 text-purple-600" />
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">MCP Server</h2>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="space-y-4">
                <input
                  type="text"
                  value={mcpServerUrl}
                  onChange={(e) => setMcpServerUrl(e.target.value)}
                  placeholder="MCP Server URL"
                  disabled={!!mcpConnection || mcpConnecting}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50 transition-all font-medium"
                />
                {!mcpConnection ? (
                  <button
                    onClick={handleMCPConnect}
                    disabled={mcpConnecting || !mcpServerUrl.trim()}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-xs shadow-sm shadow-purple-200"
                  >
                    {mcpConnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    CONNECT SERVER
                  </button>
                ) : (
                  <button
                    onClick={handleMCPDisconnect}
                    className="w-full px-4 py-2 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 rounded-lg font-bold transition-all flex items-center justify-center gap-2 text-xs"
                  >
                    <XCircle className="w-3 h-3" />
                    DISCONNECT
                  </button>
                )}
              </div>

              {mcpError && <p className="mt-3 text-[10px] text-red-500 font-medium px-1 bg-red-50 py-1 rounded border border-red-100">{mcpError}</p>}

              {mcpConnection && (
                <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded flex items-center gap-2 border border-green-100 uppercase tracking-tight">
                    <CheckCircle2 className="w-3 h-3" />
                    Connected: {mcpConnection.serverInfo?.name || 'MCP'}
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Available Tools ({mcpConnection.tools.length})</p>
                    <div className="max-h-48 overflow-y-auto space-y-1 p-1 bg-white rounded-lg border border-gray-100 shadow-inner">
                      {mcpConnection.tools.map(tool => (
                        <button
                          key={tool.name}
                          onClick={() => { setSelectedMCPTool(tool); setMcpToolArgs({}); }}
                          className={`w-full p-2.5 text-left rounded-md text-[11px] transition-all flex items-center gap-2 ${selectedMCPTool?.name === tool.name ? 'bg-purple-600 text-white shadow-md shadow-purple-200 font-bold' : 'hover:bg-purple-50 text-gray-700 hover:text-purple-700 font-medium'}`}
                        >
                          <div className="truncate flex-1">{tool.name}</div>
                          {selectedMCPTool?.name === tool.name && <Wrench className="w-3 h-3" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedMCPTool && (
                    <div className="pt-4 border-t border-gray-100 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-2 px-1">
                        <Wrench className="w-3 h-3 text-purple-600" />
                        <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Call: {selectedMCPTool.name}</p>
                      </div>
                      <div className="space-y-3 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                        {selectedMCPTool.inputSchema && typeof selectedMCPTool.inputSchema === 'object' && 'properties' in selectedMCPTool.inputSchema && (
                          Object.entries((selectedMCPTool.inputSchema as any).properties).map(([key, schema]: any) => (
                            <div key={key}>
                              <label className="text-[9px] font-bold text-gray-400 mb-1 block uppercase tracking-tighter">{key}</label>
                              <input
                                type="text"
                                value={mcpToolArgs[key] || ''}
                                onChange={(e) => setMcpToolArgs(prev => ({ ...prev, [key]: e.target.value }))}
                                className="w-full px-2 py-1.5 rounded-md border border-gray-100 text-[11px] bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                                placeholder={`Enter ${key}...`}
                              />
                            </div>
                          ))
                        )}
                        <button
                          onClick={handleCallMCPTool}
                          disabled={isSearching}
                          className="w-full py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg text-xs font-black shadow-md shadow-purple-100 hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 tracking-widest"
                        >
                          {isSearching ? 'CALLING...' : 'RUN TOOL'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-10">
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 mb-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-600" />
                  <span className="font-bold text-gray-900 text-xs uppercase tracking-tight">File Agent Mode</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={isAgentMode}
                    onChange={(e) => setIsAgentMode(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
              <p className="text-[10px] text-purple-700 leading-relaxed font-medium">
                Proactive AI actions for files/folders.
                <span className="block mt-1 font-bold">Review required before apply.</span>
              </p>
            </div>

            {/* Search Mode Toggle */}
            <div className="mb-6 px-1">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-green-600" />
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Search Mode</h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setUseMetadata(true)}
                  className={`flex-1 px-3 py-2.5 text-xs font-bold rounded-lg transition-all border-2 ${
                    useMetadata
                      ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-100'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-green-200 hover:text-green-600'
                  }`}
                  title="Fast mode using saved analysis metadata (reduces AI costs by ~90%)"
                >
                  ⚡ Quick Mode
                </button>
                <button
                  onClick={() => setUseMetadata(false)}
                  className={`flex-1 px-3 py-2.5 text-xs font-bold rounded-lg transition-all border-2 ${
                    !useMetadata
                      ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-100'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-200 hover:text-blue-600'
                  }`}
                  title="Detailed mode using full files (more accurate but slower and uses more AI tokens)"
                >
                  🔍 Detailed Mode
                </button>
              </div>
              <p className="text-[9px] text-gray-500 mt-2 leading-relaxed font-medium px-1">
                {useMetadata 
                  ? '⚡ Using cached analysis (90% cost savings, faster responses)'
                  : '🔍 Processing full files (more accurate, slower, higher cost)'}
              </p>
            </div>

            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-purple-600" />
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Filters & Sorting</h2>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-[10px] text-red-500 font-black hover:text-red-600 transition-colors uppercase tracking-tight flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>

            <div className="space-y-8">
              {/* Sort Select */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block px-1">Sort By</label>
                <div className="relative">
                  <SortAsc className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-purple-500" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-700 focus:ring-2 focus:ring-purple-200 outline-none appearance-none cursor-pointer transition-all hover:bg-white"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="uploadedDesc">Recent</option>
                    <option value="uploadedAsc">Oldest</option>
                    <option value="nameAsc">A-Z</option>
                    <option value="nameDesc">Z-A</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* File Type Filters */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block px-1">Supported Types</label>
                <div className="flex flex-wrap gap-1.5">
                  {fileTypes.map(type => (
                    <button
                      key={`sidebar-include-${type}`}
                      onClick={() => toggleFilter('includeTypes', type)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all border ${filters.includeTypes.includes(type) ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-100' : 'bg-white text-gray-500 border-gray-100 hover:border-purple-200 hover:text-purple-600'}`}
                    >
                      {type.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specific File Filter */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block px-1">Specific Files</label>
                <div className="max-h-60 overflow-y-auto space-y-1 bg-gray-50 rounded-xl p-2 border border-gray-100 shadow-inner">
                  {allFiles.length > 0 ? (
                    allFiles.map(file => (
                      <button
                        key={`sidebar-file-${file.id}`}
                        onClick={() => toggleFilter('includeFiles', file.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[11px] transition-all border ${filters.includeFiles.includes(file.id) ? 'bg-white border-purple-200 text-purple-700 font-bold shadow-sm' : 'bg-transparent border-transparent text-gray-600 hover:bg-white hover:border-gray-100'}`}
                      >
                        <span className="truncate flex-1 text-left">{file.filename || file.title}</span>
                        <div className={`p-1 rounded-md ml-2 transition-colors ${filters.includeFiles.includes(file.id) ? 'bg-purple-50' : 'bg-gray-100'}`}>
                          {getFileIcon(file.category)}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="py-8 text-center space-y-2">
                      <File className="w-8 h-8 text-gray-200 mx-auto" />
                      <p className="text-[10px] text-gray-400 font-medium px-2 italic">Connect files to filter them here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer in Sidebar */}
        <div className="mt-auto p-6 border-t border-gray-50 bg-gray-50/50">
          <button
            onClick={() => {
              setChatHistory([]);
              setAiResponse(null);
              setRawResults([]);
              setQuery('');
              localStorage.removeItem('unified_chat_history');
              localStorage.removeItem('unified_chat_metadata');
            }}
            className="w-full flex items-center justify-center gap-2 py-3 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all font-black text-xs border border-red-100 uppercase tracking-widest shadow-sm shadow-red-50"
          >
            <RotateCcw className="w-3 h-3" />
            RESET CONVERSATION
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto relative">
        {/* Hero Area (Simplified) */}
        <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 py-12 lg:py-16 shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 -left-20 w-80 h-80 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-0 -right-20 w-80 h-80 bg-purple-400 rounded-full blur-3xl" />
          </div>

          <div className="max-w-4xl mx-auto px-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <div className="flex items-center gap-3 justify-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full">
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  <span className="text-sm font-medium text-white">AI-Powered Chat</span>
                </div>

                {/* Mobile Settings Toggle */}
                <button
                  onClick={() => setShowMobileSettings(!showMobileSettings)}
                  className="lg:hidden inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-all border border-white/20"
                >
                  <Filter className="w-4 h-4" />
                  <span className="text-sm font-medium">Settings</span>
                </button>
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
                Ask questions about your files
              </h1>
              <p className="text-xl text-purple-100 max-w-2xl mx-auto">
                Get AI-powered answers with citations from your uploaded files
              </p>
            </motion.div>

            {/* Mobile Settings Panel (Collapsible) */}
            <AnimatePresence>
              {showMobileSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="lg:hidden mb-8 overflow-hidden"
                >
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 space-y-6">
                    {/* MCP Settings (Simplified for Mobile) */}
                    <div>
                      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                        <Plug className="w-4 h-4" />
                        MCP Server
                      </h3>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={mcpServerUrl}
                          onChange={(e) => setMcpServerUrl(e.target.value)}
                          className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                          placeholder="MCP URL"
                        />
                        <button
                          onClick={handleMCPConnect}
                          className="px-4 py-2 bg-white text-purple-600 rounded-lg font-bold text-sm"
                        >
                          {mcpConnection ? 'Connected' : 'Connect'}
                        </button>
                      </div>
                    </div>

                    {/* Search Mode (Mobile) */}
                    <div className="pt-6 border-t border-white/10">
                      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Search Mode
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setUseMetadata(true)}
                          className={`flex-1 px-4 py-2.5 text-sm font-bold rounded-lg transition-all ${
                            useMetadata
                              ? 'bg-green-500 text-white shadow-lg'
                              : 'bg-white/10 text-white/70 hover:bg-white/20 border border-white/20'
                          }`}
                        >
                          ⚡ Quick
                        </button>
                        <button
                          onClick={() => setUseMetadata(false)}
                          className={`flex-1 px-4 py-2.5 text-sm font-bold rounded-lg transition-all ${
                            !useMetadata
                              ? 'bg-blue-500 text-white shadow-lg'
                              : 'bg-white/10 text-white/70 hover:bg-white/20 border border-white/20'
                          }`}
                        >
                          🔍 Detailed
                        </button>
                      </div>
                      <p className="text-xs text-white/70 mt-2">
                        {useMetadata ? '⚡ Fast & cheaper' : '🔍 Accurate & slower'}
                      </p>
                    </div>

                    {/* Filters and Sort (Simplified for Mobile) */}
                    <div className="pt-6 border-t border-white/10">
                      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        Filters & Sort
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as SortOption)}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                        >
                          <option value="relevance" className="text-gray-900">Relevance</option>
                          <option value="uploadedDesc" className="text-gray-900">Newest</option>
                          <option value="nameAsc" className="text-gray-900">A-Z</option>
                        </select>
                        <button
                          onClick={clearFilters}
                          className="px-4 py-2 bg-red-500/20 text-white rounded-lg font-bold text-sm border border-red-500/30"
                        >
                          Clear Filters
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chat Mode Initial Prompt */}
            {chatHistory.length === 0 && (
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



            {/* Clear Conversation Button (Chat History exists) */}
            {chatHistory.length > 0 && (
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
                    // Clear localStorage for this session
                    localStorage.removeItem('unified_chat_history');
                    localStorage.removeItem('unified_chat_metadata');
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
              className={`${chatHistory.length > 0 ? 'mt-2' : 'mt-4'} flex flex-wrap gap-3 justify-center`}
            >
              {[
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
              ))}
            </motion.div>
          </div>
        </div>

        {/* Results Info Bar - Only show after search */}
        {rawResults.length > 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
            <div className="max-w-7xl mx-auto px-6 py-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <Bot className="w-4 h-4 text-purple-600" />
                  <span className="font-semibold text-gray-900">
                    AI Response & Sources
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {hasActiveFilters && (
                    <span className="font-medium text-purple-600">
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
        <div className="max-w-7xl mx-auto px-6 pb-32">
          <AnimatePresence mode="wait">
            {isSearching && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <div className="w-16 h-16 border-4 rounded-full animate-spin mb-4 border-purple-200 border-t-purple-600" />
                <p className="text-gray-600 text-lg">{searchStatus || 'Generating AI response...'}</p>
                <p className="text-gray-500 text-sm mt-2">Using parallel AI search for faster results</p>
              </motion.div>
            )}

            {!isSearching && (results.length > 0 || chatHistory.length > 0) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Chat History Section */}
                {chatHistory.length > 0 && (
                  <div className="mb-8 space-y-6">
                    {chatHistory.map((msg, index) => (
                      <div key={index} className="space-y-4">
                        {/* User Question / MCP Tool Call */}
                        <div className="flex justify-end">
                          <div className={`max-w-3xl rounded-2xl px-6 py-4 ${msg.question.startsWith('🔧')
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                            : 'bg-blue-600 text-white'
                            }`}>
                            <p className="font-medium whitespace-pre-wrap">{msg.question}</p>
                            <p className="text-xs opacity-70 mt-2">
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

                              {/* Pending Actions UI */}
                              {msg.pendingActions && msg.pendingActions.length > 0 && (
                                <div className="mt-6 p-4 bg-white rounded-xl border-2 border-purple-200 border-dashed">
                                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <Wrench className="w-4 h-4 text-purple-600" />
                                    Proposed Actions ({msg.pendingActions.length})
                                  </h4>
                                  <div className="space-y-2">
                                    {msg.pendingActions.map((action, actionIndex) => (
                                      <div key={actionIndex} className="flex items-center justify-between p-2 bg-purple-50 rounded-lg text-sm border border-purple-100">
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono text-purple-700 font-bold">{action.toolName}</span>
                                          <span className="text-gray-500 truncate max-w-[200px]">
                                            {Object.entries(action.args).map(([k, v]) => `${k}: ${v}`).join(', ')}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded font-bold uppercase">Pending</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {index === chatHistory.length - 1 && pendingActions.length > 0 && (
                                    <div className="mt-4 flex gap-2">
                                      <button
                                        onClick={applyActions}
                                        disabled={isApplying}
                                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                      >
                                        {isApplying ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <CheckCircle2 className="w-4 h-4" />
                                        )}
                                        Apply All Changes
                                      </button>
                                      <button
                                        onClick={() => {
                                          setPendingActions([]);
                                          // Remove pending actions from the last message as well
                                          setChatHistory(prev => {
                                            const newHistory = [...prev];
                                            const last = newHistory[newHistory.length - 1];
                                            if (last) last.pendingActions = [];
                                            return newHistory;
                                          });
                                        }}
                                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200 transition-all"
                                      >
                                        Discard
                                      </button>
                                    </div>
                                  )}
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
                    Source Files {results.length} references
                  </h2>
                  <p className="text-gray-600">
                    used to answer "{query}"
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
                  Try a different question or upload more files
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Chat Input Box - Fixed at Bottom */}
          <div className="fixed bottom-0 left-0 right-0 lg:left-[calc(18rem+20rem)] bg-white border-t border-gray-200 shadow-2xl z-30 transition-all duration-300">
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
                      // Clear localStorage for this session
                      localStorage.removeItem('unified_chat_history');
                      localStorage.removeItem('unified_chat_metadata');
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
        </div>
      </div>
    </div>
  );
}