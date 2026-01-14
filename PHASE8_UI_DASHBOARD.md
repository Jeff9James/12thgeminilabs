# PHASE 8: Video Player & Analysis Dashboard UI

## TASK TITLE: Build Gemini-Powered Video Understanding Web App - Phase 8: Complete Frontend Interface

**PRIORITY: CRITICAL** - Professional UI/UX is essential for user adoption

---

## FULL PROMPT FOR AI CODING AGENT:

Build complete, production-grade user interface including custom video player, analysis dashboard, timeline visualization, search interface, and results export. UI must be intuitive, performant, and showcase AI insights effectively.

### ARCHITECTURAL REQUIREMENTS:

- **Custom Video Player**: Built on HTML5 video with overlay controls
- **Interactive Timeline**: Show analysis results synchronized with video time
- **Analysis Dashboard**: Tabbed interface (overview, temporal, spatial, search)
- **Responsive Design**: Mobile-first, works on tablets/desktops
- **Data Visualization**: Charts for temporal patterns (Recharts)
- **Results Export**: PDF reports, JSON data, shareable links
- **Real-time Updates**: Progress bars, loading states, notifications
- **Keyboard Shortcuts**: Space for play/pause, arrow keys for navigation
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **Performance**: Lazy loading, virtualization for long lists

### DELIVERABLES:

**File: src/components/VideoPlayer/CustomVideoPlayer.tsx**
```typescript
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { EnhancedAnalysis } from '../../services/reasoningEngine';

interface CustomVideoPlayerProps {
  src: string | Blob;
  analysis: EnhancedAnalysis;
  onTimeUpdate?: (time: number) => void;
  onLoaded?: (duration: number) => void;
  className?: string;
}

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  src,
  analysis,
  onTimeUpdate,
  onLoaded,
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [activeSegment, setActiveSegment] = useState<number | null>(null);

  // Load video source
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    
    if (typeof src === 'string') {
      video.src = src;
    } else {
      video.src = URL.createObjectURL(src);
    }

    const loadedMetadata = () => {
      setDuration(video.duration);
      onLoaded?.(video.duration);
    };

    const timeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime);
      
      // Update active segment based on current time
      if (analysis.temporalSegments) {
        const active = analysis.temporalSegments.findIndex(
          segment => video.currentTime >= segment.startTime && video.currentTime <= segment.endTime
        );
        setActiveSegment(active >= 0 ? active : null);
      }
    };

    const play = () => setIsPlaying(true);
    const pause = () => setIsPlaying(false);
    const ended = () => setIsPlaying(false);

    video.addEventListener('loadedmetadata', loadedMetadata);
    video.addEventListener('timeupdate', timeUpdate);
    video.addEventListener('play', play);
    video.addEventListener('pause', pause);
    video.addEventListener('ended', ended);

    return () => {
      video.removeEventListener('loadedmetadata', loadedMetadata);
      video.removeEventListener('timeupdate', timeUpdate);
      video.removeEventListener('play', play);
      video.removeEventListener('pause', pause);
      video.removeEventListener('ended', ended);
    };
  }, [src, analysis, onTimeUpdate, onLoaded]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoRef.current) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seek(currentTime - 5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seek(currentTime + 5);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (volume < 1) setVolume(Math.min(volume + 0.1, 1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (volume > 0) setVolume(Math.max(volume - 0.1, 0));
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, volume]);

  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  }, [isPlaying]);

  const seek = useCallback((time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(time, duration));
  }, [duration]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(videoRef.current.muted);
  }, [isMuted]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    
    seek(newTime);
  };

  return (
    <div
      ref={containerRef}
      className={`relative bg-black rounded-lg overflow-hidden group ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      role="region"
      aria-label="Video player"
    >
      <video
        ref={videoRef}
        className="w-full h-auto"
        playsInline
        preload="metadata"
      >
        Your browser does not support the video tag.
      </video>

      {/* Analysis overlay */}
      {analysis.spatialAnalysis && (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          {/* Object bounding boxes would be rendered here */}
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress bar */}
        <div
          className="w-full h-1 bg-white/30 rounded cursor-pointer mb-3"
          onClick={handleProgressClick}
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
        >
          <div
            className="h-full bg-blue-500 rounded"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
          {analysis.temporalSegments?.map((segment, index) => (
            <div
              key={index}
              className={`absolute top-0 h-full ${
                activeSegment === index ? 'bg-yellow-400' : 'bg-green-400'
              } opacity-60`}
              style={{
                left: `${(segment.startTime / duration) * 100}%`,
                width: `${((segment.endTime - segment.startTime) / duration) * 100}%`
              }}
              title={segment.description}
            />
          ))}
        </div>

        <div className="flex items-center justify-between text-white">
          {/* Left controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlayPause}
              className="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <span className="text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <button
              onClick={toggleMute}
              className="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
              )}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={volume}
              onChange={(e) => {
                const newVolume = parseFloat(e.target.value);
                setVolume(newVolume);
                if (videoRef.current) {
                  videoRef.current.volume = newVolume;
                }
              }}
              className="w-20 accent-blue-500"
              aria-label="Volume"
            />
          </div>

          {/* Center info */}
          {activeSegment !== null && analysis.temporalSegments && (
            <div className="text-xs text-white/80 max-w-xs truncate">
              {analysis.temporalSegments[activeSegment].description}
            </div>
          )}

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <select
              value={playbackRate}
              onChange={(e) => {
                const rate = parseFloat(e.target.value);
                setPlaybackRate(rate);
                if (videoRef.current) {
                  videoRef.current.playbackRate = rate;
                }
              }}
              className="bg-white/20 text-white text-xs px-2 py-1 rounded"
              aria-label="Playback speed"
            >
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>

            <button
              onClick={toggleFullscreen}
              className="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Keyboard shortcut hint */}
        <div className="text-xs text-white/60 text-center mt-2">
          Space: Play/Pause | ←→: Seek 5s | ↑↓: Volume | F: Fullscreen | M: Mute
        </div>
      </div>
    </div>
  );
};

export default CustomVideoPlayer;
```

**File: src/components/Dashboard/AnalysisPanel.tsx**
```typescript
import React, { useState } from 'react';
import { EnhancedAnalysis } from '../../services/reasoningEngine';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';

interface AnalysisPanelProps {
  analysis: EnhancedAnalysis;
  videoUrl: string;
  className?: string;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  analysis,
  videoUrl,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const calculateTotalObjects = () => {
    return analysis.spatialAnalysis?.objectsDetected?.length || 0;
  };

  const calculateTotalScenes = () => {
    return analysis.spatialAnalysis?.sceneChanges?.length || 0;
  };

  const getTopObjects = () => {
    return analysis.spatialAnalysis?.objectsDetected?.slice(0, 10) || [];
  };

  const getTopKeywords = () => {
    if (!analysis.summary?.keyTopics) return [];
    return analysis.summary.keyTopics.slice(0, 8);
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1">
          <TabsTrigger value="overview" className="py-2">Overview</TabsTrigger>
          <TabsTrigger value="temporal" className="py-2">Temporal</TabsTrigger>
          <TabsTrigger value="spatial" className="py-2">Spatial</TabsTrigger>
          <TabsTrigger value="search" className="py-2">Search</TabsTrigger>
        </TabsList>

        <div className="p-6 max-h-screen overflow-y-auto">
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Video Title and Description */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">
                {analysis.summary?.title || analysis.videoName}
              </h2>
              {analysis.summary?.description && (
                <p className="text-gray-600 leading-relaxed">
                  {analysis.summary.description}
                </p>
              )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {analysis.temporalSegments?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Segments</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {calculateTotalObjects()}
                </div>
                <div className="text-sm text-gray-600">Objects Found</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {calculateTotalScenes()}
                </div>
                <div className="text-sm text-gray-600">Scene Changes</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {(analysis.reasoning?.quality?.confidence || 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Confidence</div>
              </div>
            </div>

            {/* Key Topics / Keywords */}
            {analysis.summary?.keyTopics && analysis.summary.keyTopics.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Key Topics</h3>
                <div className="flex flex-wrap gap-2">
                  {getTopKeywords().map((topic, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Narrative Arc */}
            {analysis.reasoning?.context?.narrativeArc && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Narrative Structure</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="w-32 text-sm font-medium text-gray-700">Exposition</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{width: '25%'}}></div>
                    </div>
                    <div className="ml-3 text-sm text-gray-600">
                      {Math.round(analysis.reasoning.context.narrativeArc.exposition.end)}s
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-32 text-sm font-medium text-gray-700">Rising Action</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{width: '50%'}}></div>
                    </div>
                    <div className="ml-3 text-sm text-gray-600">
                      {Math.round(analysis.reasoning.context.narrativeArc.climax.timestamp)}s
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-32 text-sm font-medium text-gray-700">Resolution</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{width: '25%'}}></div>
                    </div>
                    <div className="ml-3 text-sm text-gray-600">End</div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Temporal Tab */}
          <TabsContent value="temporal" className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Temporal Analysis</h3>
            
            {analysis.reasoning?.temporal && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Continuity Score:</span>
                  <span className="font-medium">
                    {(analysis.reasoning.temporal.continuityScore * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            {analysis.temporalSegments && analysis.temporalSegments.length > 0 ? (
              <div className="space-y-3">
                {analysis.temporalSegments.map((segment, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-medium text-gray-900">
                        Segment {index + 1}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mb-2">{segment.description}</p>
                    
                    {segment.actions && segment.actions.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {segment.actions.map((action, actionIndex) => (
                          <span
                            key={actionIndex}
                            className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                          >
                            {action}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                No temporal segments analyzed
              </div>
            )}
          </TabsContent>

          {/* Spatial Tab */}
          <TabsContent value="spatial" className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Objects & Scenes</h3>

            {/* Top Objects */}
            {getTopObjects().length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Detected Objects</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {getTopObjects().map((obj, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 p-3 rounded-lg"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{obj.label}</span>
                        <span className="text-xs text-gray-500">
                          {(obj.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="mt-1 bg-gray-200 rounded-full h-1">
                        <div
                          className="bg-blue-500 h-1 rounded-full"
                          style={{ width: `${obj.confidence * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scene Changes */}
            {analysis.spatialAnalysis?.sceneChanges && analysis.spatialAnalysis.sceneChanges.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Scene Changes</h4>
                <div className="space-y-2">
                  {analysis.spatialAnalysis.sceneChanges.slice(0, 10).map((scene, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm"
                    >
                      <span className="truncate">{scene.description}</span>
                      <span className="ml-2 text-gray-500">
                        {formatTime(scene.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Location Analysis */}
            {analysis.reasoning?.context?.locations && analysis.reasoning.context.locations.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Locations</h4>
                <div className="space-y-2">
                  {analysis.reasoning.context.locations.map((location, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-2 bg-blue-50 rounded text-sm"
                    >
                      <span>{location.name}</span>
                      <span className="text-blue-600">
                        {(location.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Search Tab */}
          <TabsContent value="search" className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Smart Search</h3>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Search within this video..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={async (e) => {
                  if (e.key === 'Enter') {
                    // TODO: Implement search functionality
                    console.log('Search:', e.currentTarget.value);
                  }
                }}
              />
              <button className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>

            {/* Mock search results */}
            <div className="space-y-3">
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="font-medium text-sm">Search functionality will integrate here</div>
                <p className="text-xs text-gray-600 mt-1">
                  Type a query and press Enter to search across all analyzed content
                </p>
              </div>
              <div className="text-xs text-gray-400">
                Search will check: transcript, visual content, objects, locations, and temporal segments
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Export Options */}
      <div className="px-6 pb-6 border-t border-gray-200">
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={() => {
              // TODO: Export as JSON
              console.log('Export JSON', analysis);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Export JSON
          </button>
          <button
            onClick={() => {
              // TODO: Export as PDF
              console.log('Export PDF', analysis);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            Export PDF
          </button>
          <button
            onClick={() => {
              // TODO: Share link
              console.log('Share analysis', analysis.id);
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
          >
            Share Link
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisPanel;
```

**File: src/components/Dashboard/MainDashboard.tsx**
```typescript
import React, { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthContext';
import { useVideoUpload } from '../../hooks/useVideoUpload';
import { useVideoAnalysis } from '../../hooks/useVideoAnalysis';
import { useIndexedDB } from '../../hooks/useIndexedDB';
import { UploadZone } from '../VideoUpload/UploadZone';
import { GoogleDriveSelector } from '../VideoUpload/GoogleDriveSelector';
import { CustomVideoPlayer } from './CustomVideoPlayer';
import { AnalysisPanel } from './AnalysisPanel';
import { RecentAnalyses } from './RecentAnalyses';
import { GoogleOAuthButton } from '../Auth/GoogleOAuthButton';
import { EnhancedAnalysis } from '../../services/reasoningEngine';
import { Toaster, toast } from '../ui/toaster';

const MainDashboard: React.FC = () => {
  const { authState, isAuthenticated } = useAuth();
  const {
    uploadLocalFile,
    uploadFromDrive,
    isProcessing: isUploading,
    progress: uploadProgress
  } = useVideoUpload();
  const {
    analyzeVideo,
    isAnalyzing,
    analysisResult,
    error: analysisError
  } = useVideoAnalysis();
  const {
    saveAnalysis,
    loadRecentAnalyses,
    saveVideoFile
  } = useIndexedDB();

  const [showDriveSelector, setShowDriveSelector] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [analysis, setAnalysis] = useState<EnhancedAnalysis | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'upload' | 'analyze' | 'history'>('upload');

  // Load recent analyses on mount
  useEffect(() => {
    const loadRecent = async () => {
      const analyses = await loadRecentAnalyses();
      setRecentAnalyses(analyses);
    };
    loadRecent();
  }, []);

  // Handle video upload from local file
  const handleLocalUpload = async (videoFile: any) => {
    try {
      setSelectedVideo(videoFile);
      setActiveTab('analyze');
      toast.success('Video uploaded successfully!');
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error('Failed to upload video');
    }
  };

  // Handle Google Drive selection
  const handleDriveSelect = async (file: { id: string; name: string; blob?: Blob; streamUrl?: string }) => {
    try {
      const videoFile = {
        ...file,
        id: file.id,
        file: file.blob,
        duration: 0, // Will be extracted
        thumbnailUrl: '',
        uploadDate: new Date()
      };
      
      await handleLocalUpload(videoFile);
      setShowDriveSelector(false);
    } catch (err) {
      console.error('Drive selection failed:', err);
      toast.error('Failed to load from Google Drive');
    }
  };

  // Analyze video
  const handleAnalyze = async () => {
    if (!selectedVideo) {
      toast.error('Please select a video first');
      return;
    }

    try {
      // Save video file first
      const videoId = await saveVideoFile(selectedVideo);
      
      // Analyze
      const result = await analyzeVideo(selectedVideo);
      
      // Enhance analysis (run reasoning engine)
      const { reasoningEngine } = await import('../../services/reasoningEngine');
      const enhanced = await reasoningEngine.enhanceAnalysis(
        result,
        [], // TODO: Pass actual frames
        { duration: 0, width: 0, height: 0, fps: 30, codec: '', hasAudio: false, size: 0 }
      );
      
      setAnalysis(enhanced);
      
      // Save analysis result
      await saveAnalysis(videoId, selectedVideo.name, enhanced);
      
      // Refresh recent analyses
      const analyses = await loadRecentAnalyses();
      setRecentAnalyses(analyses);
      
      toast.success('Analysis completed!');
    } catch (err) {
      console.error('Analysis failed:', err);
      toast.error('Analysis failed: ' + (err as Error).message);
    }
  };

  // Handle analysis selection from history
  const handleSelectAnalysis = (analysis: any) => {
    setAnalysis(analysis);
    setActiveTab('analyze');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Video Analysis AI</h1>
            <p className="text-gray-600">Sign in with Google to get started</p>
          </div>
          <GoogleOAuthButton variant="signin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Video Analysis AI</h1>
              <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Gemini 3 Powered
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab('history')}
                className="text-gray-600 hover:text-gray-900"
              >
                History ({recentAnalyses.length})
              </button>
              <GoogleOAuthButton variant="signout" />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('upload')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'upload'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Upload & Analyze
            </button>
            <button
              onClick={() => setActiveTab('analyze')}
              disabled={!selectedVideo && !analysis}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analyze'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              } ${!selectedVideo && !analysis ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Analysis Results
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              History
            </button>
          </nav>
        </div>

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg font-semibold mb-4">Upload Video</h2>
              <UploadZone
                onUploadComplete={handleLocalUpload}
                onGoogleDriveSelect={() => setShowDriveSelector(true)}
              />
            </div>
            
            <div>
              {showDriveSelector ? (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Select from Google Drive</h2>
                    <button
                      onClick={() => setShowDriveSelector(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>
                  <GoogleDriveSelector onFileSelect={handleDriveSelect} />
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="font-medium mb-3">Recent Analyses</h3>
                  <RecentAnalyses
                    analyses={recentAnalyses}
                    onSelectAnalysis={handleSelectAnalysis}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analysis Results Tab */}
        {activeTab === 'analyze' && (
          <div className="space-y-6">
            {selectedVideo && !analysis && (
              <div className="bg-white p-6 rounded-lg shadow text-center">
                <h3 className="text-lg font-medium mb-4">Ready to Analyze</h3>
                <p className="text-gray-600 mb-6">
                  Video: {selectedVideo.name}
                </p>
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Start AI Analysis'}
                </button>
              </div>
            )}

            {isAnalyzing && (
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-center py-8">
                  <div className="mr-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                  <div>
                    <p className="font-medium">Analyzing video with Gemini 3...</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {isUploading ? uploadProgress?.message : 'Processing...'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {analysis && (
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <CustomVideoPlayer
                    src={selectedVideo.file || selectedVideo.streamUrl}
                    analysis={analysis}
                  />
                </div>
                <div>
                  <AnalysisPanel analysis={analysis} videoUrl="" />
                </div>
              </div>
            )}

            {analysisError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {analysisError}
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Analysis History</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentAnalyses.map((analysis) => (
                <div
                  key={analysis.id}
                  onClick={() => handleSelectAnalysis(analysis)}
                  className="bg-white p-4 rounded-lg shadow hover:shadow-lg cursor-pointer transition-shadow"
                >
                  <h3 className="font-medium mb-2">
                    {analysis.summary?.title || analysis.videoName}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {analysis.summary?.description?.substring(0, 100)}...
                  </p>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{analysis.temporalSegments?.length || 0} segments</span>
                    <span>{new Date(analysis.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainDashboard;
```

### ACCEPTANCE CRITERIA FOR PHASE 8:

1. ✅ Custom video player with play/pause, seek, volume, speed controls
2. ✅ Keyboard shortcuts (space, arrows, f, m) work correctly
3. ✅ Timeline shows colored segments for temporal analysis
4. ✅ Active segment highlighted as video plays
5. ✅ Analysis panel with 4 tabs (overview, temporal, spatial, search)
6. ✅ Dashboard integrates all previous phases seamlessly
7. ✅ Upload zone works with drag-drop and file selection
8. ✅ Google Drive selector opens and files load
9. ✅ Real-time progress indicators during upload/analysis
10. ✅ Analysis results display with charts and visualizations
11. ✅ Responsive design works on mobile/tablet/desktop
12. ✅ Export buttons (JSON/PDF/Share) are clickable
13. ✅ Navigation between upload/analyze/history tabs works
14. ✅ History shows recent analyses with thumbnails
15. ✅ Error messages display clearly
16. ✅ Loading states prevent duplicate submissions
17. ✅ Accessibility features (ARIA labels, keyboard nav)
18. ✅ TypeScript types for all props and state
19. ✅ Component composition is modular and reusable
20. ✅ Performance: renders < 500ms, smooth 60fps animations

### TESTING CHECKLIST:

```bash
# Manual tests:
# 1. Upload video via drag-drop - visual feedback
# 2. Upload via file browser - works correctly
# 3. Select Google Drive file - authentication flow
# 4. Video player controls - all buttons functional
# 5. Keyboard shortcuts - space/arrow keys work
# 6. Timeline segments - color-coded correctly
# 7. Analysis tabs - switch without errors
# 8. Overview shows stats correctly
# 9. Temporal shows segments in order
# 10. Spatial shows objects and confidence
# 11. Search box accepts input
# 12. Export buttons trigger console.log (for now)
# 13. History tab shows recent analyses
# 14. Select analysis from history - loads correctly
# 15. Mobile responsive design - works on small screens
# 16. Error states show user-friendly messages
# 17. Loading spinners appear during async ops
# 18. Form validation prevents empty submissions
# 19. State management (Zustand) - no prop drilling
# 20. Component hot reload - updates without full refresh
```

### PERFORMANCE REQUIREMENTS:

- Initial page load: < 2 seconds
- Video upload progress: updates every 100ms
- Analysis progress: stage updates every 500ms
- UI renders: < 16ms (60fps)
- Tab switching: < 100ms
- Video player seek: < 50ms
- Memory usage: < 200MB total
- No memory leaks over 30 minutes
- Smooth animations (CSS transforms only)

### ACCESSIBILITY REQUIREMENTS:

- All buttons have aria-labels
- Keyboard navigation works (tab order logical)
- Screen reader announces state changes
- Color contrast minimum 4.5:1
- Focus indicators visible
- Semantic HTML (buttons, not divs with click handlers)
- Video player accessible via keyboard
- Error messages associated with form fields

### UI/UX POLISH:

- Loading skeletons for async content
- Smooth transitions between states
- Consistent spacing (8px grid system)
- Consistent color palette (blue primary)
- Clear hierarchy with typography
- Hover states on all interactive elements
- Disabled states for invalid actions
- Success/error toasts for feedback
- Progress indicators for long operations