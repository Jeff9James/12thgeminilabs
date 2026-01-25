import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { videoApi } from '../services/videoApi';
import { analysisService } from '../services/analysisService';
import { Video, VideoAnalysisResult, Scene } from '@shared/types';
import { VideoPlayerWithAdvancedSearch } from '../components/VideoPlayerWithAdvancedSearch';
import { SummaryTab } from '../components/SummaryTab';
import { ScenesTab } from '../components/ScenesTab';
import { SearchTab } from '../components/SearchTab';
import { ChatTab } from '../components/ChatTab';
import { MetadataTab } from '../components/MetadataTab';
import './VideoDetailPage.css';

type TabType = 'summary' | 'scenes' | 'search' | 'chat' | 'metadata';

function VideoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'summary';

  const [video, setVideo] = useState<Video | null>(null);
  const [analysis, setAnalysis] = useState<VideoAnalysisResult | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const videoUrl = id ? videoApi.getStreamUrl(id) : '';

  // PHASE 3: Load auto-generated analysis
  const loadAnalysis = async (videoId: string) => {
    try {
      console.log('[VideoDetailPage] Loading analysis for video:', videoId);
      const result = await analysisService.getVideoAnalysis(videoId);
      console.log('[VideoDetailPage] Analysis result:', result);
      if (result.success && result.data) {
        console.log('[VideoDetailPage] Setting analysis:', result.data);
        setAnalysis(result.data);
      } else {
        console.log('[VideoDetailPage] No analysis data:', result.error);
      }
    } catch (error) {
      console.error('[VideoDetailPage] Failed to load analysis:', error);
    }
  };

  const loadScenes = async (videoId: string) => {
    try {
      console.log('[VideoDetailPage] Loading scenes for video:', videoId);
      const result = await analysisService.getScenes(videoId);
      console.log('[VideoDetailPage] Scenes result:', result);
      if (result.success && result.data) {
        console.log('[VideoDetailPage] Setting scenes:', result.data.length, 'scenes');
        setScenes(result.data);
      } else {
        console.log('[VideoDetailPage] No scenes data:', result.error);
      }
    } catch (error) {
      console.error('[VideoDetailPage] Failed to load scenes:', error);
    }
  };

  const loadVideo = async (videoId: string) => {
    try {
      setIsLoading(true);
      const response = await videoApi.getVideo(videoId);
      if (response.success && response.data) {
        setVideo(response.data);
        // Always attempt to load analysis - it will be cached if available
        loadAnalysis(videoId);
      } else {
        setError('Failed to load video');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load video');
    } finally {
      setIsLoading(false);
    }
  };

  // PHASE 3: Auto-load analysis and poll for updates
  useEffect(() => {
    if (id) {
      loadVideo(id);
      loadScenes(id);
      
      // Poll for analysis updates every 5 seconds for the first minute
      let pollCount = 0;
      const maxPolls = 12; // 12 * 5s = 60s
      
      const pollInterval = setInterval(() => {
        pollCount++;
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          return;
        }
        loadAnalysis(id);
        loadScenes(id);
      }, 5000);
      
      return () => clearInterval(pollInterval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

  const handleAnalyze = async () => {
    if (!id) return;
    setIsAnalyzing(true);
    const result = await analysisService.analyzeVideo(id);
    if (result.success) {
      setTimeout(async () => {
        await loadAnalysis(id);
        await loadScenes(id);
        setIsAnalyzing(false);
      }, 3000);
    } else {
      setIsAnalyzing(false);
    }
  };

  const handleSceneClick = () => {
    // This will be handled by the video player ref
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="video-detail-page">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading video...</p>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="video-detail-page">
        <div className="error-state">
          <svg className="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2>Error loading video</h2>
          <p>{error || 'Video not found'}</p>
          <button onClick={() => window.history.back()} className="btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="video-detail-page">
      <div className="video-header">
        <div className="video-header-info">
          <h1 className="video-title">{video.title}</h1>
          <div className="video-meta">
            <span>{formatDuration(video.duration)}</span>
            <span>•</span>
            <span>{video.width && video.height ? `${video.width}x${video.height}` : 'Unknown resolution'}</span>
            <span>•</span>
            <span>Uploaded {new Date(video.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="video-header-actions">
          {video.status !== 'ready' && video.status !== 'error' && (
            <button
              className="btn-secondary"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Video'}
            </button>
          )}
        </div>
      </div>

      <div className="video-content">
        <div className="video-main">
          <VideoPlayerWithAdvancedSearch
            videoId={video.id}
            videoUrl={videoUrl}
            title={video.title}
          />
        </div>

        <div className="video-tabs">
          <div className="tab-header" role="tablist">
            {[
              { id: 'summary', label: 'Summary', icon: '📝' },
              { id: 'scenes', label: 'Scenes', icon: '🎬' },
              { id: 'search', label: 'Search', icon: '🔍' },
              { id: 'chat', label: 'Chat', icon: '💬' },
              { id: 'metadata', label: 'Info', icon: 'ℹ️' },
            ].map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id as TabType)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="tab-content" role="tabpanel">
            {activeTab === 'summary' && (
              <SummaryTab
                analysis={analysis}
                onRegenerate={handleAnalyze}
                isAnalyzing={isAnalyzing}
              />
            )}
            {activeTab === 'scenes' && (
              <ScenesTab
                scenes={scenes}
                onSceneClick={handleSceneClick}
              />
            )}
            {activeTab === 'search' && (
              <SearchTab videoId={video.id} />
            )}
            {activeTab === 'chat' && (
              <ChatTab 
                videoId={video.id}
                currentTime={0}
                onTimestampClick={() => {}}
                onCreateBookmark={async () => {}}
              />
            )}
            {activeTab === 'metadata' && <MetadataTab video={video} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoDetailPage;
