'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Send, 
  Sparkles, 
  Folder, 
  FileText, 
  Video, 
  Music, 
  Image as ImageIcon, 
  FileSpreadsheet,
  File as FileIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Database,
  Brain,
  Info
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  thoughtSignature?: string;
}

interface UploadedFile {
  id: string;
  filename: string;
  category?: string;
  geminiFileUri?: string;
  mimeType?: string;
  uploadedAt: string;
}

export default function UnifiedChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showFileSelector, setShowFileSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load uploaded files
  useEffect(() => {
    loadFiles();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadFiles = () => {
    const storedFiles = localStorage.getItem('uploadedFiles');
    const storedVideos = localStorage.getItem('uploadedVideos');

    let allFiles: UploadedFile[] = [];

    if (storedFiles) {
      const parsedFiles = JSON.parse(storedFiles);
      allFiles = [...parsedFiles];
    }

    if (storedVideos) {
      const parsedVideos = JSON.parse(storedVideos);
      const convertedVideos = parsedVideos.map((v: any) => ({
        ...v,
        category: v.category || 'video',
        filename: v.filename || v.title || 'Unknown',
      }));
      allFiles = [...allFiles, ...convertedVideos];
    }

    // Filter files that have been uploaded to Gemini
    const geminiFiles = allFiles.filter(f => f.geminiFileUri);
    setFiles(geminiFiles);

    // Auto-select all files by default
    setSelectedFiles(geminiFiles.map(f => f.id));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Get selected file URIs
      const selectedFileData = files.filter(f => selectedFiles.includes(f.id));

      const response = await fetch('/api/chat/unified', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.trim(),
          files: selectedFileData.map(f => ({
            uri: f.geminiFileUri,
            mimeType: f.mimeType || 'application/octet-stream',
            filename: f.filename,
          })),
          history: messages.map(m => ({
            role: m.role,
            content: m.content,
            thoughtSignature: m.thoughtSignature,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          thoughtSignature: data.thoughtSignature,
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Chat failed');
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId);
      } else {
        return [...prev, fileId];
      }
    });
  };

  const selectAllFiles = () => {
    setSelectedFiles(files.map(f => f.id));
  };

  const deselectAllFiles = () => {
    setSelectedFiles([]);
  };

  const getFileIcon = (category?: string) => {
    switch (category) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'pdf':
      case 'document':
      case 'text': return <FileText className="w-4 h-4" />;
      case 'spreadsheet': return <FileSpreadsheet className="w-4 h-4" />;
      default: return <FileIcon className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'video': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'audio': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'image': return 'bg-green-100 text-green-700 border-green-200';
      case 'pdf': return 'bg-red-100 text-red-700 border-red-200';
      case 'document': 
      case 'text': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'spreadsheet': return 'bg-pink-100 text-pink-700 border-pink-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* File Selector Sidebar */}
      <AnimatePresence>
        {showFileSelector && (
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className="w-80 bg-white border-r border-gray-200 flex flex-col"
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">File Context</h3>
                </div>
                <button
                  onClick={() => setShowFileSelector(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-gray-600 mb-3">
                Select files for the AI to access during conversation
              </p>
              <div className="flex gap-2">
                <button
                  onClick={selectAllFiles}
                  className="flex-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllFiles}
                  className="flex-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Files List */}
            <div className="flex-1 overflow-y-auto p-4">
              {files.length === 0 ? (
                <div className="text-center py-8">
                  <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No files uploaded yet</p>
                  <p className="text-xs text-gray-400 mt-1">Upload files to chat about them</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <label
                      key={file.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedFiles.includes(file.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file.id)}
                        onChange={() => toggleFileSelection(file.id)}
                        className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${getCategoryColor(file.category)}`}>
                            {getFileIcon(file.category)}
                            {file.category || 'file'}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 truncate" title={file.filename}>
                          {file.filename}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(file.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Count */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Selected:</span>
                <span className="font-semibold text-gray-900">
                  {selectedFiles.length} / {files.length} files
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Unified Chat</h1>
                <p className="text-sm text-gray-600">Chat with Gemini 3 Flash across all your files</p>
              </div>
            </div>

            <button
              onClick={() => setShowFileSelector(!showFileSelector)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
            >
              <Database className="w-4 h-4" />
              {selectedFiles.length} {selectedFiles.length === 1 ? 'File' : 'Files'}
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <div className="max-w-5xl mx-auto px-6 py-3">
            <div className="flex items-start gap-3 text-sm">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-gray-700">
                  <span className="font-semibold text-blue-900">AI has access to {selectedFiles.length} selected {selectedFiles.length === 1 ? 'file' : 'files'}.</span>
                  {selectedFiles.length === 0 && (
                    <span className="text-orange-700"> Select files from the sidebar to enable AI analysis.</span>
                  )}
                  {selectedFiles.length > 0 && (
                    <span> Ask questions about content, request summaries, or analyze across multiple files.</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-8 bg-gray-50">
          <div className="max-w-5xl mx-auto space-y-6">
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <MessageCircle className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Start a conversation
                </h2>
                <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                  Ask questions about your uploaded files, request summaries, compare content across multiple files, 
                  or get detailed analysis. The AI has access to all selected files.
                </p>

                {/* Example Questions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                  {[
                    { q: "Summarize all my video files", icon: Video },
                    { q: "What are the key points in my documents?", icon: FileText },
                    { q: "Find common themes across all files", icon: Sparkles },
                    { q: "What images contain landscapes?", icon: ImageIcon },
                  ].map((example, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(example.q)}
                      className="flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
                    >
                      <div className="w-10 h-10 bg-gray-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors">
                        <example.icon className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                        {example.q}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                    )}

                    <div
                      className={`max-w-3xl rounded-2xl px-6 py-4 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-900'
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>

                    {message.role === 'user' && (
                      <div className="w-8 h-8 bg-gray-300 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-gray-700">You</span>
                      </div>
                    )}
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-4"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                        <span className="text-gray-600">Thinking...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <form onSubmit={handleSendMessage} className="max-w-5xl mx-auto">
            {selectedFiles.length === 0 && (
              <div className="mb-3 flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-4 py-2 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span>Select at least one file to enable AI chat</span>
              </div>
            )}
            <div className="flex gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder={
                  selectedFiles.length === 0
                    ? "Select files to start chatting..."
                    : "Ask anything about your files... (Shift+Enter for new line)"
                }
                disabled={isLoading || selectedFiles.length === 0}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-50 disabled:text-gray-400"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '200px' }}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim() || selectedFiles.length === 0}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Powered by Gemini 3 Flash • {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
