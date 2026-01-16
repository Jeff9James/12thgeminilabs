import React, { useState, useRef, useEffect, useCallback } from 'react';
import { chatService } from '../services/chatService';
import { ConversationMessage } from '../../../shared/types';
import './ChatTab.css';

interface ChatTabProps {
  videoId: string;
  currentTime: number;
  onTimestampClick: (timestamp: number) => void;
  onCreateBookmark: (timestamp: number, note: string) => void;
}

interface ChatState {
  messages: ConversationMessage[];
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
  rateLimitRemaining: number;
}

export function ChatTab({ videoId, currentTime, onTimestampClick, onCreateBookmark }: ChatTabProps) {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
    conversationId: null,
    rateLimitRemaining: 50,
  });
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages]);

  const loadRateLimit = useCallback(async () => {
    try {
      const response = await chatService.getRateLimit(videoId);
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          rateLimitRemaining: response.data!.remaining,
        }));
      }
    } catch (error) {
      console.error('Failed to load rate limit:', error);
    }
  }, [videoId]);

  useEffect(() => {
    loadRateLimit();
  }, [loadRateLimit]);

  const handleSend = async () => {
    if (!input.trim() || state.isLoading) return;
    if (state.rateLimitRemaining <= 0) {
      setState(prev => ({ ...prev, error: 'Rate limit exceeded. Please try again later.' }));
      return;
    }

    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      createdAt: new Date(),
    };

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    const currentInput = input.trim();
    setInput('');

    try {
      const response = await chatService.sendMessage({
        videoId,
        message: currentInput,
        conversationId: state.conversationId || undefined,
      });

      if (response.success && response.data) {
        setState((prev) => ({
          ...prev,
          conversationId: response.data!.conversationId,
          messages: [...prev.messages, {
            id: response.data!.messageId,
            role: 'assistant',
            content: response.data!.reply,
            createdAt: new Date(),
          }],
          isLoading: false,
          rateLimitRemaining: prev.rateLimitRemaining - 1,
        }));
      } else {
        throw new Error(response.error || 'Failed to send message');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setState({
      messages: [],
      isLoading: false,
      error: null,
      conversationId: null,
      rateLimitRemaining: 50,
    });
  };

  const formatTime = (timestamp?: number): string => {
    if (!timestamp) return '';
    const mins = Math.floor(timestamp / 60);
    const secs = Math.floor(timestamp % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const parseTimestamps = (content: string): Array<{ text: string; timestamp?: number }> => {
    const parts: Array<{ text: string; timestamp?: number }> = [];
    const timestampPattern = /\[(\d{1,2}):(\d{2})(?:-(\d{1,2}):(\d{2}))?\]/g;
    let lastIndex = 0;
    let match;

    while ((match = timestampPattern.exec(content)) !== null) {
      // Add text before timestamp
      if (match.index > lastIndex) {
        parts.push({ text: content.slice(lastIndex, match.index) });
      }

      const startMinutes = parseInt(match[1]);
      const startSeconds = parseInt(match[2]);
      const start = startMinutes * 60 + startSeconds;

      let timestamp: number;
      if (match[3] && match[4]) {
        // Range format
        const endMinutes = parseInt(match[3]);
        const endSeconds = parseInt(match[4]);
        const end = endMinutes * 60 + endSeconds;
        timestamp = start; // Use start time for click
        parts.push({
          text: `[${formatTime(start)}-${formatTime(end)}]`,
          timestamp,
        });
      } else {
        // Single timestamp
        timestamp = start;
        parts.push({
          text: `[${formatTime(start)}]`,
          timestamp,
        });
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({ text: content.slice(lastIndex) });
    }

    return parts;
  };

  const handleTimestampClick = (timestamp: number) => {
    onTimestampClick(timestamp);
  };

  const handleBookmarkClick = (timestamp: number) => {
    const note = prompt('Add a note for this bookmark (optional):');
    if (note !== null) {
      onCreateBookmark(timestamp, note || '');
    }
  };

  const renderMessageContent = (content: string, isAssistant: boolean = false) => {
    if (!isAssistant) {
      return content.split('\n').map((line, i) => (
        <p key={i} className="message-text">
          {line}
        </p>
      ));
    }

    const parts = parseTimestamps(content);
    return parts.map((part, i) => {
      if (part.timestamp) {
        return (
          <button
            key={i}
            className="timestamp-link"
            onClick={() => handleTimestampClick(part.timestamp!)}
            title="Click to jump to this time"
          >
            {part.text}
          </button>
        );
      }
      return <span key={i}>{part.text}</span>;
    });
  };

  const questionTemplates = [
    'What is this video about?',
    'Summarize the key points',
    'What happens at the beginning?',
    'What happens at the end?',
    'Who are the main people in this video?',
    'What are the main topics discussed?',
    'Find all instances of...',
    'Extract all visible text',
    'What\'s the main action happening?',
  ];

  const handleTemplateClick = (template: string) => {
    setInput(template);
    inputRef.current?.focus();
  };

  return (
    <div className="chat-tab">
      <div className="chat-header">
        <h3>Chat with Video</h3>
        <div className="chat-header-info">
          <span className={`rate-limit ${state.rateLimitRemaining <= 10 ? 'warning' : ''}`}>
            {state.rateLimitRemaining}/50 messages left
          </span>
          {state.messages.length > 0 && (
            <button className="new-chat-button" onClick={handleNewChat}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Chat
            </button>
          )}
        </div>
      </div>

      {state.error && (
        <div className="chat-error">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{state.error}</span>
        </div>
      )}

      {state.messages.length === 0 && (
        <div className="question-templates">
          <h4>Try asking:</h4>
          <div className="template-grid">
            {questionTemplates.map((template, index) => (
              <button
                key={index}
                className="template-button"
                onClick={() => handleTemplateClick(template)}
                disabled={state.rateLimitRemaining <= 0}
              >
                {template}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chat-messages">
        {state.messages.map((message) => (
          <div
            key={message.id}
            className={`chat-message ${message.role === 'user' ? 'user' : 'assistant'}`}
          >
            <div className="message-avatar">
              {message.role === 'user' ? (
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              ) : (
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              )}
            </div>
            <div className="message-content">
              <div className="message-bubble">
                {renderMessageContent(message.content, message.role === 'assistant')}
              </div>
              <div className="message-actions">
                <span className="message-time">
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {message.role === 'assistant' && (
                  <button
                    className="bookmark-button"
                    onClick={() => handleBookmarkClick(currentTime)}
                    title="Bookmark this moment"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {state.isLoading && (
          <div className="chat-message assistant loading">
            <div className="message-avatar">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={state.rateLimitRemaining <= 0 ? "Rate limit exceeded" : "Ask a question..."}
          className="chat-input"
          rows={1}
          disabled={state.isLoading || state.rateLimitRemaining <= 0}
        />
        <button
          className="send-button"
          onClick={handleSend}
          disabled={state.isLoading || !input.trim() || state.rateLimitRemaining <= 0}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
}