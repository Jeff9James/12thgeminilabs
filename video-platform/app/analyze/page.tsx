'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Sparkles, Video as VideoIcon, X } from 'lucide-react';

export default function AnalyzePage() {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileSelect = async (selectedFile: File) => {
    if (selectedFile && selectedFile.type.startsWith('video/')) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setVideoUrl(url);
      
      // Save to localStorage immediately
      const videoId = Date.now().toString();
      const videoMetadata = {
        id: videoId,
        filename: selectedFile.name,
        uploadedAt: new Date().toISOString(),
        analyzed: false,
        localUrl: url,
      };
      
      const existingVideos = JSON.parse(localStorage.getItem('uploadedVideos') || '[]');
      existingVideos.push(videoMetadata);
      localStorage.setItem('uploadedVideos', JSON.stringify(existingVideos));
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, []);

  const handleUploadAndAnalyze = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', file);

      // Use streaming upload endpoint
      const response = await fetch('/api/upload-stream', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok || !response.body) {
        throw new Error('Upload failed');
      }

      // Read the event stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let videoId = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.error) {
              throw new Error(data.error);
            }
            
            if (data.progress) {
              // Update progress text (you can add a state for this if needed)
              console.log(data.progress);
              
              // Estimate progress
              if (data.progress.includes('Starting')) setUploadProgress(5);
              else if (data.progress.includes('Saving video')) setUploadProgress(15);
              else if (data.progress.includes('Uploading to Gemini')) setUploadProgress(30);
              else if (data.progress.includes('Uploading')) setUploadProgress(50);
              else if (data.progress.includes('Processing')) setUploadProgress(70);
              else if (data.progress.includes('Saving metadata')) setUploadProgress(90);
            }
            
            if (data.success && data.videoId) {
              videoId = data.videoId;
              setUploadProgress(100);
            }
          }
        }
      }

      if (!videoId) {
        throw new Error('Upload completed but no video ID received');
      }

      // Update localStorage
      const existingVideos = JSON.parse(localStorage.getItem('uploadedVideos') || '[]');
      const videoIndex = existingVideos.findIndex((v: any) => v.filename === file.name);
      
      if (videoIndex !== -1) {
        existingVideos[videoIndex] = {
          ...existingVideos[videoIndex],
          id: videoId,
          analyzed: false,
        };
      } else {
        existingVideos.push({
          id: videoId,
          filename: file.name,
          uploadedAt: new Date().toISOString(),
          analyzed: false,
          localUrl: videoUrl,
        });
      }
      localStorage.setItem('uploadedVideos', JSON.stringify(existingVideos));

      // Redirect to video detail page
      router.push(`/videos/${videoId}`);
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${(error as Error).message}. Please try again.`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Video Analysis</h1>
          <p className="text-gray-600">Upload and analyze videos with AI-powered scene detection</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Upload Area */}
        {!videoUrl ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-gray-300 p-12 text-center hover:border-blue-400 transition-colors"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Upload className="w-10 h-10 text-white" />
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Upload your video
            </h3>
            <p className="text-gray-600 mb-6">
              Drag and drop or click to select a video file (up to 2GB)
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Select Video
            </button>

            <p className="text-sm text-gray-500 mt-4">
              Supported formats: MP4, MOV, AVI, WebM
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Video Player - Native Controls */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="relative">
                {/* Close Button */}
                <button
                  onClick={() => {
                    setVideoUrl(null);
                    setFile(null);
                  }}
                  className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>

                {/* Native Video Player */}
                <video
                  src={videoUrl}
                  controls
                  className="w-full"
                  preload="metadata"
                >
                  Your browser does not support the video tag.
                </video>
              </div>

              {/* Action Button */}
              <div className="p-6 border-t border-gray-200">
                <button
                  onClick={handleUploadAndAnalyze}
                  disabled={isUploading}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-5 h-5" />
                  {isUploading ? 'Uploading...' : 'Upload & Analyze with Gemini 3 Flash'}
                </button>
                <p className="text-sm text-gray-500 text-center mt-3">
                  Video will be saved to "My Videos" and analyzed with AI
                </p>
              </div>
            </motion.div>

            {/* Upload Progress */}
            <AnimatePresence>
              {isUploading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-2xl shadow-sm p-6"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Uploading video...</h3>
                      <p className="text-sm text-gray-600">Processing with Gemini 3 Flash</p>
                    </div>
                  </div>
                  
                  <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="absolute h-full bg-gradient-to-r from-blue-500 to-indigo-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-2">{uploadProgress}% complete</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
