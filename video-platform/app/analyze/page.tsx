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
      // Get API key from our server (secure)
      const keyResponse = await fetch('/api/get-upload-url');
      const { apiKey } = await keyResponse.json();
      
      setUploadProgress(5);

      // Step 1: Initialize resumable upload DIRECTLY to Gemini
      console.log('Initializing upload to Gemini...');
      const initResponse = await fetch('https://generativelanguage.googleapis.com/upload/v1beta/files', {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': file.size.toString(),
          'X-Goog-Upload-Header-Content-Type': file.type,
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          file: {
            display_name: file.name
          }
        })
      });

      if (!initResponse.ok) {
        const error = await initResponse.text();
        throw new Error(`Failed to initialize upload: ${error}`);
      }

      const uploadUrl = initResponse.headers.get('X-Goog-Upload-URL');
      if (!uploadUrl) {
        throw new Error('No upload URL received from Gemini');
      }

      setUploadProgress(15);

      // Step 2: Upload file bytes DIRECTLY to Gemini (bypassing our server!)
      console.log(`Uploading ${Math.round(file.size / 1024 / 1024)}MB to Gemini...`);
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Length': file.size.toString(),
          'X-Goog-Upload-Offset': '0',
          'X-Goog-Upload-Command': 'upload, finalize',
        },
        body: file // Send file directly!
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.text();
        throw new Error(`Failed to upload file: ${error}`);
      }

      const uploadResult = await uploadResponse.json();
      const fileName = uploadResult.file.name;
      
      setUploadProgress(60);

      // Step 3: Wait for Gemini processing
      console.log('Waiting for Gemini to process video...');
      let fileInfo = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${fileName}`,
        {
          headers: {
            'x-goog-api-key': apiKey,
          }
        }
      ).then(r => r.json());

      let attempts = 0;
      const maxAttempts = 60; // 3 minutes max

      while (fileInfo.state === 'PROCESSING' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        fileInfo = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${fileName}`,
          {
            headers: {
              'x-goog-api-key': apiKey,
            }
          }
        ).then(r => r.json());
        
        attempts++;
        setUploadProgress(60 + (attempts / maxAttempts) * 30);
      }

      if (fileInfo.state === 'FAILED') {
        throw new Error('Video processing failed on Gemini servers');
      }

      if (fileInfo.state === 'PROCESSING') {
        throw new Error('Video processing timeout. The video may still complete - check "My Videos" later.');
      }

      setUploadProgress(95);

      // Step 4: Save metadata to our database
      const videoId = Date.now().toString();
      console.log('Saving metadata...');
      
      try {
        await fetch('/api/videos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: videoId,
            title: file.name,
            geminiFileUri: fileInfo.uri,
            geminiFileName: fileName,
            mimeType: file.type,
            size: file.size,
          })
        });
      } catch (err) {
        console.warn('Failed to save to database, using localStorage only:', err);
      }

      // Update localStorage
      const existingVideos = JSON.parse(localStorage.getItem('uploadedVideos') || '[]');
      const videoIndex = existingVideos.findIndex((v: any) => v.filename === file.name);
      
      const videoData = {
        id: videoId,
        filename: file.name,
        uploadedAt: new Date().toISOString(),
        analyzed: false,
        localUrl: videoUrl,
        geminiFileUri: fileInfo.uri,
        geminiFileName: fileName,
      };

      if (videoIndex !== -1) {
        existingVideos[videoIndex] = videoData;
      } else {
        existingVideos.push(videoData);
      }
      
      localStorage.setItem('uploadedVideos', JSON.stringify(existingVideos));
      setUploadProgress(100);

      // Redirect to video detail page
      router.push(`/videos/${videoId}`);
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${(error as Error).message}\n\nPlease try again or use a smaller video file.`);
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
