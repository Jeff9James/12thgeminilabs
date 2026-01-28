'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Sparkles, Video as VideoIcon, X, Play, Pause, Clock } from 'lucide-react';

interface Scene {
  startTime: number;
  endTime: number;
  description: string;
  type: 'action' | 'dialogue' | 'transition' | 'default';
}

export default function AnalyzePage() {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile && selectedFile.type.startsWith('video/')) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setVideoUrl(url);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, []);

  const handleAnalyze = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setProgress(0);

    // Simulate analysis progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return prev;
        }
        return prev + 5;
      });
    }, 200);

    // Simulate API call
    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      
      // Mock scenes
      const mockScenes: Scene[] = [
        { startTime: 0, endTime: 45, description: 'Opening scene with establishing shots', type: 'transition' },
        { startTime: 45, endTime: 120, description: 'Character introduction and dialogue', type: 'dialogue' },
        { startTime: 120, endTime: 185, description: 'Action sequence in urban setting', type: 'action' },
        { startTime: 185, endTime: 240, description: 'Emotional conversation between characters', type: 'dialogue' },
        { startTime: 240, endTime: 300, description: 'Chase scene through city streets', type: 'action' },
      ];
      
      setScenes(mockScenes);
      setIsAnalyzing(false);
    }, 4000);
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const seekToTime = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const getSceneColor = (type: Scene['type']) => {
    switch (type) {
      case 'action': return 'bg-red-500';
      case 'dialogue': return 'bg-blue-500';
      case 'transition': return 'bg-purple-500';
      default: return 'bg-gray-500';
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
            {/* Video Player */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="relative bg-black aspect-video">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full"
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                
                {/* Play/Pause Overlay */}
                <button
                  onClick={togglePlayPause}
                  className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors group"
                >
                  {!isPlaying && (
                    <Play className="w-20 h-20 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>

                {/* Close Button */}
                <button
                  onClick={() => {
                    setVideoUrl(null);
                    setFile(null);
                    setScenes([]);
                    setIsAnalyzing(false);
                  }}
                  className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Controls */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center gap-4">
                  <button
                    onClick={togglePlayPause}
                    className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 text-white" />
                    ) : (
                      <Play className="w-5 h-5 text-white" />
                    )}
                  </button>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>

                  {!isAnalyzing && scenes.length === 0 && (
                    <button
                      onClick={handleAnalyze}
                      className="ml-auto px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Analyze Video
                    </button>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Timeline */}
            {duration > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-sm p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
                
                <div className="relative">
                  {/* Timeline Bar */}
                  <div className="h-12 bg-gray-100 rounded-lg overflow-hidden relative">
                    {/* Scene Segments */}
                    {scenes.map((scene, index) => {
                      const left = (scene.startTime / duration) * 100;
                      const width = ((scene.endTime - scene.startTime) / duration) * 100;
                      return (
                        <button
                          key={index}
                          onClick={() => seekToTime(scene.startTime)}
                          className={`absolute h-full ${getSceneColor(scene.type)} opacity-70 hover:opacity-100 transition-opacity`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={scene.description}
                        />
                      );
                    })}
                    
                    {/* Current Time Indicator */}
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                      style={{ left: `${(currentTime / duration) * 100}%` }}
                    />
                  </div>

                  {/* Legend */}
                  {scenes.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-500 rounded" />
                        <span className="text-gray-600">Action</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-500 rounded" />
                        <span className="text-gray-600">Dialogue</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-purple-500 rounded" />
                        <span className="text-gray-600">Transition</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Analysis Progress */}
            <AnimatePresence>
              {isAnalyzing && (
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
                      <h3 className="font-semibold text-gray-900">Analyzing video...</h3>
                      <p className="text-sm text-gray-600">Processing with Gemini 3</p>
                    </div>
                  </div>
                  
                  <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="absolute h-full bg-gradient-to-r from-blue-500 to-indigo-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-2">{progress}% complete</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scene Results */}
            {scenes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl shadow-sm p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Detected Scenes ({scenes.length})
                </h3>
                
                <div className="space-y-3">
                  {scenes.map((scene, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => seekToTime(scene.startTime)}
                      className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          Scene {index + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getSceneColor(scene.type)}`} />
                          <span className="text-sm text-gray-600">
                            {formatTime(scene.startTime)} - {formatTime(scene.endTime)}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm">
                        {scene.description}
                      </p>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
