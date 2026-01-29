'use client';

import { useState, useRef, useEffect } from 'react';
import { FileCategory } from '@/lib/fileTypes';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamps?: string[];
    thoughtSignature?: string;
}

interface FileChatProps {
    fileId: string;
    fileCategory: FileCategory;
    fileName: string;
}

// Helper function to parse timestamps like "0:05" or "1:23" to seconds
function parseTimeToSeconds(timeStr: string): number {
    // Remove brackets if present
    const cleanTime = timeStr.replace(/[\[\]]/g, '');
    const parts = cleanTime.split(':');

    if (parts.length === 2) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    } else if (parts.length === 3) {
        return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    }
    return 0;
}

// Helper to make timestamps clickable in the text (only for video/audio)
function formatMessageWithTimestamps(text: string, fileCategory: FileCategory): React.ReactNode[] {
    // Only process timestamps for video and audio files
    if (fileCategory !== 'video' && fileCategory !== 'audio') {
        return [<span key={0}>{text}</span>];
    }

    // Match timestamps in format [MM:SS] or [HH:MM:SS]
    const timestampRegex = /(\[\d{1,2}:\d{2}\]|\[\d{1,2}:\d{2}:\d{2}\])/g;
    const parts = text.split(timestampRegex);

    return parts.map((part, index) => {
        // Check if this part is a timestamp
        if (timestampRegex.test(part)) {
            return (
                <button
                    key={index}
                    onClick={() => {
                        // Try video player first
                        const videoEl = document.getElementById('videoPlayer') as HTMLVideoElement;
                        if (videoEl) {
                            const time = parseTimeToSeconds(part);
                            videoEl.currentTime = time;
                            videoEl.play();
                            videoEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            return;
                        }
                        // Try audio player
                        const audioEl = document.getElementById('audioPlayer') as HTMLAudioElement;
                        if (audioEl) {
                            const time = parseTimeToSeconds(part);
                            audioEl.currentTime = time;
                            audioEl.play();
                            audioEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }}
                    className="inline-flex items-center font-mono text-sm text-blue-600 font-semibold hover:text-blue-800 hover:underline cursor-pointer transition-colors bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded mx-0.5"
                    title={`Click to jump to ${part.replace(/[\[\]]/g, '')}`}
                >
                    {part}
                </button>
            );
        }
        // Regular text
        return <span key={index}>{part}</span>;
    });
}

// Get chat title based on file category
function getChatTitle(category: FileCategory): string {
    switch (category) {
        case 'video': return 'Chat with Video AI';
        case 'image': return 'Chat about Image';
        case 'audio': return 'Chat about Audio';
        case 'pdf': return 'Chat about PDF';
        case 'document': return 'Chat about Document';
        case 'spreadsheet': return 'Chat about Spreadsheet';
        case 'text': return 'Chat about Text';
        default: return 'Chat with AI';
    }
}

// Get example questions based on file category
function getExampleQuestions(category: FileCategory): string[] {
    switch (category) {
        case 'video':
            return [
                'What happens in this video?',
                'Can you summarize the main points?',
                'What are the key moments with timestamps?',
                'Describe what happens at 1:30'
            ];
        case 'image':
            return [
                'What do you see in this image?',
                'Describe the main objects and their positions',
                'What text is visible in this image?',
                'What is the mood or atmosphere?'
            ];
        case 'audio':
            return [
                'What is being discussed in this audio?',
                'Who are the speakers?',
                'Summarize the main points',
                'What happens at [2:30]?'
            ];
        case 'pdf':
        case 'document':
            return [
                'What is this document about?',
                'Summarize the main points',
                'What are the key findings?',
                'Extract important data'
            ];
        case 'spreadsheet':
            return [
                'What data is in this spreadsheet?',
                'What are the key metrics?',
                'Identify any trends',
                'Summarize the data'
            ];
        case 'text':
            return [
                'What is this text about?',
                'Summarize the content',
                'What are the main themes?',
                'Extract key information'
            ];
        default:
            return [
                'What is this file about?',
                'Summarize the content',
                'Extract key information'
            ];
    }
}

// Get placeholder text based on file category
function getPlaceholderText(category: FileCategory): string {
    switch (category) {
        case 'video': return 'Ask a question about the video...';
        case 'image': return 'Ask about the image...';
        case 'audio': return 'Ask about the audio content...';
        case 'pdf': return 'Ask about the PDF...';
        case 'document': return 'Ask about the document...';
        case 'spreadsheet': return 'Ask about the data...';
        case 'text': return 'Ask about the text...';
        default: return 'Ask a question...';
    }
}

export default function FileChat({ fileId, fileCategory, fileName }: FileChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Load chat history from localStorage on mount
    useEffect(() => {
        const chatKey = `chat_${fileId}`;
        const savedChat = localStorage.getItem(chatKey);
        if (savedChat) {
            try {
                const parsedChat = JSON.parse(savedChat);
                setMessages(parsedChat);
            } catch (error) {
                console.error('Failed to load chat history:', error);
            }
        }
    }, [fileId]);

    // Save chat history to localStorage whenever messages change
    useEffect(() => {
        if (messages.length > 0) {
            const chatKey = `chat_${fileId}`;
            localStorage.setItem(chatKey, JSON.stringify(messages));
        }
    }, [messages, fileId]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Auto-focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            role: 'user',
            content: input.trim()
        };

        // Add user message immediately
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Prepare history for API (excluding current message, including thought signatures)
            const history = messages.map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                content: msg.content,
                thoughtSignature: msg.thoughtSignature
            }));

            const response = await fetch(`/api/files/${fileId}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage.content,
                    history
                })
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // Add assistant message
            const assistantMessage: Message = {
                role: 'assistant',
                content: data.response,
                timestamps: data.timestamps,
                thoughtSignature: data.thoughtSignature
            };

            setMessages(prev => [...prev, assistantMessage]);

        } catch (error: any) {
            console.error('Chat error:', error);

            // Add error message with specific handling for overload errors
            let errorContent = `Sorry, I encountered an error: ${error.message}. Please try again.`;

            if (error.message?.includes('overloaded') || error.message?.includes('503')) {
                errorContent = `🔄 Gemini AI is currently experiencing high demand and is overloaded. Please wait a moment and try your question again. Your previous messages are preserved.`;
            }

            const errorMessage: Message = {
                role: 'assistant',
                content: errorContent
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Check if timestamps should be shown (only for video/audio)
    const showTimestamps = fileCategory === 'video' || fileCategory === 'audio';

    return (
        <div className="bg-white rounded-lg shadow-lg flex flex-col h-[600px]">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            {getChatTitle(fileCategory)}
                        </h2>
                        <p className="text-sm text-blue-100 mt-1">
                            Ask questions about {fileName}
                            {showTimestamps && '. Click timestamps to jump to moments!'}
                        </p>
                    </div>
                    {messages.length > 0 && (
                        <button
                            onClick={() => {
                                if (confirm('Clear this chat session? This cannot be undone.')) {
                                    setMessages([]);
                                    localStorage.removeItem(`chat_${fileId}`);
                                }
                            }}
                            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                            title="Clear chat history"
                        >
                            Clear Chat
                        </button>
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-gray-500 mt-8">
                        <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        <p className="text-lg font-semibold mb-2">Start a conversation!</p>
                        <p className="text-sm">Ask me anything about this file.</p>
                        <div className="mt-4 text-left max-w-md mx-auto">
                            <p className="text-sm font-semibold mb-2">Example questions:</p>
                            <ul className="text-sm space-y-1 text-gray-600">
                                {getExampleQuestions(fileCategory).map((q, i) => (
                                    <li key={i}>• {q}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-lg px-4 py-3 ${msg.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                                }`}
                        >
                            <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                {msg.role === 'assistant' ? (
                                    formatMessageWithTimestamps(msg.content, fileCategory)
                                ) : (
                                    msg.content
                                )}
                            </div>

                            {/* Show timestamp summary for assistant messages (video/audio only) */}
                            {showTimestamps && msg.role === 'assistant' && msg.timestamps && msg.timestamps.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-300">
                                    <p className="text-xs text-gray-600 mb-1">Referenced timestamps:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {msg.timestamps.map((ts, i) => (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    const videoEl = document.getElementById('videoPlayer') as HTMLVideoElement;
                                                    if (videoEl) {
                                                        const time = parseTimeToSeconds(ts);
                                                        videoEl.currentTime = time;
                                                        videoEl.play();
                                                        videoEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                        return;
                                                    }
                                                    const audioEl = document.getElementById('audioPlayer') as HTMLAudioElement;
                                                    if (audioEl) {
                                                        const time = parseTimeToSeconds(ts);
                                                        audioEl.currentTime = time;
                                                        audioEl.play();
                                                        audioEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                    }
                                                }}
                                                className="text-xs font-mono bg-white text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                                            >
                                                {ts}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-3">
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                                <span className="text-sm text-gray-600">Analyzing... (this may take a moment)</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t bg-gray-50 p-4 rounded-b-lg">
                <div className="flex gap-2">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={getPlaceholderText(fileCategory)}
                        className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                        disabled={isLoading}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || isLoading}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Send
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    Press Enter to send, Shift+Enter for new line
                </p>
            </div>
        </div>
    );
}
