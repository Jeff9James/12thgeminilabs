'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Video, Clock, Calendar, Trash2, Play } from 'lucide-react';
import Link from 'next/link';

interface VideoMetadata {
  id: string;
  filename: string;
  uploadedAt: string;
  analyzed: boolean;
  duration?: number;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoMetadata[]>([]);

  useEffect(() => {
    // Load videos from localStorage
    const storedVideos = localStorage.getItem('uploadedVideos');
    if (storedVideos) {
      setVideos(JSON.parse(storedVideos));
    }
  }, []);

  const deleteVideo = (id: string) => {
    const updatedVideos = videos.filter(v => v.id !== id);
    setVideos(updatedVideos);
    localStorage.setItem('uploadedVideos', JSON.stringify(updatedVideos));
    
    // Also clean up analysis data
    localStorage.removeItem(`analysis_${id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Videos</h1>
          <p className="text-gray-600">
            Manage your uploaded videos and view analysis results
          </p>
        </div>

        {/* Videos Grid */}
        {videos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-16 text-center"
          >
            <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No videos yet
            </h3>
            <p className="text-gray-600 mb-6">
              Upload your first video to get started with AI-powered analysis
            </p>
            <Link
              href="/analyze"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Upload Video
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all group"
              >
                {/* Thumbnail */}
                <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 aspect-video flex items-center justify-center">
                  <Video className="w-16 h-16 text-white/50" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <Link
                      href={`/videos/${video.id}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Play className="w-12 h-12 text-white" />
                    </Link>
                  </div>
                </div>

                {/* Info */}
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-3 truncate" title={video.filename}>
                    {video.filename}
                  </h3>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {formatDate(video.uploadedAt)}
                    </div>
                    
                    {video.duration && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        {Math.floor(video.duration / 60)}:{String(Math.floor(video.duration % 60)).padStart(2, '0')}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      {video.analyzed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                          ✓ Analyzed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                          ⏳ Pending
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/videos/${video.id}`}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors text-center"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() => deleteVideo(video.id)}
                      className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      title="Delete video"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
