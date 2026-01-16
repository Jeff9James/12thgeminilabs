import React, { useState, useRef, useEffect } from 'react';
import { analysisService } from '../services/analysisService';
import { ConversationMessage } from '@shared/types';
import './ChatTab.css';

interface ChatTabProps {
  videoId: string;
}

interface ChatState {
  messages: ConversationMessage[];
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
}

export function ChatTab({ videoId }: ChatTabProps) {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
    conversationId: null,
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

  const handleSend = async () => {
    if (!input.trim() || state.isLoading) return;

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

    setInput('');

    try {
      const response = await analysisService.chat({
        videoId,
        message: userMessage.content,
        conversationId: state.conversationId || undefined,
      });

      if (response.success && response.data) {
        setState((prev) => ({
          ...prev,
          conversationId: response.data!.conversationId,
          messages: [...prev.messages, response.data!.message],
          isLoading: false,
        }));
      } else {
        throw new Error(response.error || 'Failed to send message');
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to send message',
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
    });
  };

  const formatTime = (timestamp?: number): string => {
    if (!timestamp) return '';
    const mins = Math.floor(timestamp / 60);
    const secs = Math.floor(timestamp % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderMessageContent = (content: string) => {
    // Simple markdown-like formatting
    return content.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <p key={i} className="message-bold">
            {line.slice(2, -2)}
          </p>
        );
      }
      if (line.startsWith('*')) {
        return (
          <p key={i} className="message-list">
            {line.slice(1)}
          </p>
        );
      }
      return (
        <p key={i} className="message-text">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="chat-tab">
      <div className="chat-header">
        <h3>Chat with Video</h3>
        {state.messages.length > 0 && (
          <button className="new-chat-button" onClick={handleNewChat}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        )}
      </div>

      {state.error && (
        <div className="chat-error">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{state.error}</span>
        </div>
      )}

      <div className="chat-messages">
        {state.messages.length === 0 ? (
          <div className="chat-empty">
            <svg className="chat-empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h4>Ask questions about this video</h4>
            <p>Try asking things like:</p>
            <ul>
              <li>"What is this video about?"</li>
              <li>"Summarize the key points"</li>
              <li>"What happens at [specific time]?"</li>
            </ul>
          </div>
        ) : (
          <>
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
                    {renderMessageContent(message.content)}
                  </div>
                  {message.timestamp && (
                    <span className="message-timestamp">
                      {formatTime(message.timestamp)}
                    </span>
                  )}
                  <span className="message-time">
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
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
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask a question..."
          className="chat-input"
          rows={1}
          disabled={state.isLoading}
        />
        <button
          className="send-button"
          onClick={handleSend}
          disabled={state.isLoading || !input.trim()}
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
