'use client';

import { useEffect, useState } from 'react';
import StreamingAnalysis from '@/components/StreamingAnalysis';
import VideoChat from '@/components/VideoChat';
import { FilePreview, FileTypeBadge, FileInfoCard } from '@/components/FilePreview';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Clock, Calendar, Sparkles, MessageSquare, FileText } from 'lucide-react';
import { createBlobUrl } from '@/lib/indexeddb';
import { FileCategory, getCategoryDisplayName, getFileIcon } from '@/lib/fileTypes';

// Helper function to parse timestamps like "0:05" or "1:23" to seconds
function parseTimeToSeconds(timeStr: string): number {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    } else if (parts.length === 3) {
        return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    }
    return 0;
}

interface FileData {
    id: string;
    title: string;
    fileName: string;
    category: FileCategory;
    mimeType: string;
    playbackUrl?: string;
    geminiFileUri?: string;
    size?: number;
    createdAt: string;
}

export default function FilePage({ params }: { params: Promise<{ id: string }> }) {
    const [file, setFile] = useState<FileData | null>(null);
    const [analysis, setAnalysis] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [id, setId] = useState<string>('');
    const [activeSection, setActiveSection] = useState<'analysis' | 'chat' | null>(null);

    useEffect(() => {
        params.then(async p => {
            setId(p.id);

            // Try to get from API first, fallback to localStorage
            fetch(`/api/files/${p.id}`)
                .then(async res => {
                    const data = await res.json();
                    if (data.success) {
                        // Try to get local file from IndexedDB for playback (video/audio only)
                        let playbackUrl = data.data.file.playbackUrl;
                        if (!playbackUrl && (data.data.file.category === 'video' || data.data.file.category === 'audio')) {
                            playbackUrl = await createBlobUrl(p.id) || undefined;
                        }

                        setFile({
                            ...data.data.file,
                            playbackUrl,
                        });
                        setAnalysis(data.data.analysis);

                        // Default to chat view (always available), or analysis if it exists
                        if (data.data.analysis) {
                            setActiveSection('analysis');
                        } else {
                            setActiveSection('chat');
                        }
                    }
                    setLoading(false);
                })
                .catch(async err => {
                    console.error('API fetch failed, trying localStorage:', err);

                    // Fallback to localStorage (legacy 'uploadedVideos' and new 'uploadedFiles')
                    const storedFiles = localStorage.getItem('uploadedFiles');
                    const storedVideos = localStorage.getItem('uploadedVideos');

                    let localFile = null;

                    if (storedFiles) {
                        const files = JSON.parse(storedFiles);
                        localFile = files.find((f: any) => f.id === p.id);
                    }

                    if (!localFile && storedVideos) {
                        const videos = JSON.parse(storedVideos);
                        localFile = videos.find((v: any) => v.id === p.id);
                    }

                    if (localFile) {
                        // Get file from IndexedDB for playback
                        const playbackUrl = await createBlobUrl(p.id);

                        setFile({
                            id: localFile.id,
                            title: localFile.filename || localFile.title,
                            fileName: localFile.filename || localFile.title,
                            category: localFile.category || 'video',
                            playbackUrl: playbackUrl,
                            geminiFileUri: localFile.geminiFileUri,
                            mimeType: localFile.mimeType || 'video/mp4',
                            size: localFile.size,
                            createdAt: localFile.uploadedAt || localFile.createdAt,
                        });
                        setActiveSection('chat');
                    }

                    setLoading(false);
                });
        });
    }, [params]);

    // Handle timestamp from URL hash (e.g., #t=123) - only for video files
    useEffect(() => {
        if (!file || !file.playbackUrl || file.category !== 'video') return;

        const handleTimestamp = () => {
            const hash = window.location.hash;
            if (hash.startsWith('#t=')) {
                const timestamp = parseFloat(hash.substring(3));
                if (!isNaN(timestamp)) {
                    const videoEl = document.getElementById('videoPlayer') as HTMLVideoElement;
                    if (videoEl) {
                        // Wait for video metadata to load before seeking
                        if (videoEl.readyState >= 1) {
                            videoEl.currentTime = timestamp;
                            videoEl.play().catch(e => console.error('Autoplay prevented:', e));
                            videoEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        } else {
                            videoEl.addEventListener('loadedmetadata', () => {
                                videoEl.currentTime = timestamp;
                                videoEl.play().catch(e => console.error('Autoplay prevented:', e));
                                videoEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, { once: true });
                        }
                    }
                }
            }
        };

        // Run after a short delay to ensure video element is rendered
        const timer = setTimeout(handleTimestamp, 100);

        // Also listen for hash changes
        window.addEventListener('hashchange', handleTimestamp);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('hashchange', handleTimestamp);
        };
    }, [file]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading file...</p>
                </div>
            </div>
        );
    }

    if (!file && !loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">File not found</h1>
                    <Link href="/" className="text-blue-600 hover:text-blue-800 underline">
                        Go back home
                    </Link>
                </div>
            </div>
        );
    }

    const isVideo = file?.category === 'video';
    const isAudio = file?.category === 'audio';
    const hasTimestamps = isVideo; // Only videos have timestamp features

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="max-w-7xl mx-auto">
                    <Link
                        href="/files"
                        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to My Files
                    </Link>

                    {/* File Title & Meta */}
                    <div className="mt-4">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold text-gray-900">{file.title}</h1>
                            <FileTypeBadge category={file.category} />
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {new Date(file.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </div>
                            {analysis && (
                                <div className="flex items-center gap-2 text-green-600">
                                    <Sparkles className="w-4 h-4" />
                                    Analyzed
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6">
                {/* File Preview */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6"
                >
                    <FilePreview
                        file={null}
                        previewUrl={file.playbackUrl || null}
                        category={file.category}
                        fileName={file.fileName}
                        fileSize={file.size}
                    />
                </motion.div>

                {/* Action Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex gap-3 mb-6"
                >
                    <button
                        onClick={() => setActiveSection('analysis')}
                        className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${activeSection === 'analysis'
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                            }`}
                    >
                        <Sparkles className="w-5 h-5" />
                        Analyze {getCategoryDisplayName(file.category)}
                    </button>

                    <button
                        onClick={() => setActiveSection('chat')}
                        className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${activeSection === 'chat'
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                            }`}
                    >
                        <MessageSquare className="w-5 h-5" />
                        Chat with {getCategoryDisplayName(file.category)}
                    </button>
                </motion.div>

                {/* Content Sections */}
                <AnimatePresence mode="wait">
                    {activeSection === 'chat' && (
                        <motion.div
                            key="chat"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <VideoChat
                                videoId={id}
                                fileCategory={file.category}
                                fileName={file.fileName}
                            />
                        </motion.div>
                    )}

                    {activeSection === 'analysis' && (
                        <motion.div
                            key="analysis"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {analysis ? (
                                <div className="bg-white rounded-2xl shadow-sm p-8">
                                    <div className="flex justify-between items-center mb-8">
                                        <h2 className="text-2xl font-bold text-gray-900">AI Analysis</h2>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <Clock className="w-4 h-4" />
                                            {new Date(analysis.createdAt).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    </div>

                                    <div className="mb-8">
                                        <h3 className="text-xl font-semibold mb-3 text-gray-800">Summary</h3>
                                        <p className="text-gray-700 leading-relaxed text-lg">{analysis.summary}</p>
                                    </div>

                                    {/* Video-specific: Scene Breakdown with timestamps */}
                                    {isVideo && analysis.scenes && analysis.scenes.length > 0 && (
                                        <div>
                                            <h3 className="text-xl font-semibold mb-4 text-gray-800">Scene Breakdown</h3>
                                            <p className="text-sm text-gray-600 mb-4">Click on timestamps to jump to that moment in the video</p>
                                            <div className="space-y-3">
                                                {analysis.scenes.map((scene: any, i: number) => (
                                                    <div key={i} className="border-l-4 border-blue-500 pl-5 py-3 bg-blue-50 rounded-r hover:bg-blue-100 transition-colors">
                                                        <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                                                            <button
                                                                onClick={() => {
                                                                    const videoEl = document.getElementById('videoPlayer') as HTMLVideoElement;
                                                                    if (videoEl) {
                                                                        const time = parseTimeToSeconds(scene.start);
                                                                        videoEl.currentTime = time;
                                                                        videoEl.play();
                                                                        videoEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                    }
                                                                }}
                                                                className="inline-flex items-center gap-1 px-3 py-1 bg-white text-blue-600 font-mono text-sm font-semibold hover:bg-blue-600 hover:text-white rounded-lg transition-colors"
                                                                title={`Click to jump to ${scene.start}`}
                                                            >
                                                                <Play className="w-3 h-3" />
                                                                {scene.start} - {scene.end}
                                                            </button>
                                                            <span className="font-semibold text-gray-900">{scene.label}</span>
                                                        </div>
                                                        <p className="text-gray-600 leading-relaxed">{scene.description}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Audio-specific: Transcription */}
                                    {file.category === 'audio' && analysis.transcription && (
                                        <div>
                                            <h3 className="text-xl font-semibold mb-4 text-gray-800">Transcription</h3>
                                            <div className="bg-gray-50 rounded-xl p-6">
                                                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{analysis.transcription}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Image-specific: Objects detected */}
                                    {file.category === 'image' && analysis.objects && analysis.objects.length > 0 && (
                                        <div>
                                            <h3 className="text-xl font-semibold mb-4 text-gray-800">Objects Detected</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {analysis.objects.map((obj: string, i: number) => (
                                                    <span key={i} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                                        {obj}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Document-specific: Key Points */}
                                    {(file.category === 'pdf' || file.category === 'document' || file.category === 'spreadsheet') && analysis.keyPoints && analysis.keyPoints.length > 0 && (
                                        <div>
                                            <h3 className="text-xl font-semibold mb-4 text-gray-800">Key Points</h3>
                                            <ul className="space-y-2">
                                                {analysis.keyPoints.map((point: string, i: number) => (
                                                    <li key={i} className="flex items-start gap-3">
                                                        <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                                                            {i + 1}
                                                        </span>
                                                        <span className="text-gray-700">{point}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* OCR Text for images and PDFs */}
                                    {(file.category === 'image' || file.category === 'pdf') && analysis.textContent && (
                                        <div className="mt-8">
                                            <h3 className="text-xl font-semibold mb-4 text-gray-800">Extracted Text</h3>
                                            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap font-mono text-sm">{analysis.textContent}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <StreamingAnalysis
                                    videoId={id}
                                    fileCategory={file.category}
                                    onAnalysisComplete={(completedAnalysis) => {
                                        setAnalysis(completedAnalysis);
                                    }}
                                />
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
