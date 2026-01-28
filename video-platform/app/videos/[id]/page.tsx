'use client';

import { useEffect, useState } from 'react';
import StreamingAnalysis from '@/components/StreamingAnalysis';
import VideoChat from '@/components/VideoChat';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Clock, Calendar, Sparkles, MessageSquare } from 'lucide-react';

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

export default function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const [video, setVideo] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState<string>('');
  const [activeSection, setActiveSection] = useState<'analysis' | 'chat' | null>(null);

  useEffect(() => {
    params.then(p => {
      setId(p.id);
      fetch(`/api/videos/${p.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setVideo(data.data.video);
            setAnalysis(data.data.analysis);
            // If analysis exists, default to analysis view
            if (data.data.analysis) {
              setActiveSection('analysis');
            }
          }
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    });
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading video...</p>
        </div>
      </div>
    );
  }
  if (!video && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Video not found</h1>
          <Link href="/" className="text-blue-600 hover:text-blue-800 underline">
            Go back home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <Link 
            href="/videos" 
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Videos
          </Link>
          
          {/* Video Title & Meta */}
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{video.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(video.createdAt).toLocaleDateString('en-US', {
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
        {/* Video Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6"
        >
          <div className="relative bg-black aspect-video">
            {video.playbackUrl ? (
              <video 
                id="videoPlayer"
                controls
                className="w-full h-full"
                preload="metadata"
              >
                <source src={video.playbackUrl} type={video.mimeType || 'video/mp4'} />
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-white p-8">
                  <Play className="w-20 h-20 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-semibold mb-2">Video Preview</p>
                  <p className="text-sm opacity-75">Video not available for playback</p>
                </div>
              </div>
            )}
          </div>
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
            className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
              activeSection === 'analysis'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            Analyze Video
          </button>
          
          <button
            onClick={() => setActiveSection('chat')}
            className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
              activeSection === 'chat'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            Chat with Video
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
              <VideoChat videoId={id} />
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
                  
                  {analysis.scenes && analysis.scenes.length > 0 && (
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
                </div>
              ) : (
                <StreamingAnalysis 
                  videoId={id} 
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
