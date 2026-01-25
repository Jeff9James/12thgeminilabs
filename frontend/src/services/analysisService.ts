import { apiClient } from './api';
import {
  VideoAnalysisResult,
  Conversation,
  ConversationMessage,
  Scene,
  SearchRequest,
  SearchResponse,
} from '../types/video';

export interface AnalysisResponse {
  success: boolean;
  data?: VideoAnalysisResult;
  error?: string;
}

export interface SceneResponse {
  success: boolean;
  data?: Scene[];
  error?: string;
}

export interface ConversationResponse {
  success: boolean;
  data?: Conversation;
  error?: string;
}

export interface ChatRequest {
  videoId: string;
  message: string;
  conversationId?: string;
}

export interface ChatResponse {
  success: boolean;
  data?: {
    conversationId: string;
    message: ConversationMessage;
  };
  error?: string;
}

export interface IndexingJob {
  id: string;
  videoId: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
  totalSegments: number;
  processedSegments: number;
  errorMessage?: string;
}

export interface TemporalSegment {
  id: string;
  videoId: string;
  segmentNumber: number;
  startTime: number;
  endTime: number;
  description: string;
  entities?: string[];
  sceneType?: string;
  confidence: number;
}

class AnalysisService {
  /**
   * Get video analysis results (summary, scenes, etc.)
   * PHASE 3: Fetches auto-generated summary from backend
   */
  async getVideoAnalysis(videoId: string): Promise<AnalysisResponse> {
    try {
      console.log('[AnalysisService] Fetching summary for video:', videoId);
      // Try to get summary analysis
      const response = await apiClient.post<any>(`/videos/${videoId}/summarize`);
      console.log('[AnalysisService] Summary response:', response);
      if (response.success && response.data) {
        const analysisData = {
          summary: response.data.summary || '',
          scenes: [],
          tags: response.data.keyPoints || [],
          entities: [],
          actions: [],
        };
        console.log('[AnalysisService] Mapped analysis data:', analysisData);
        return { 
          success: true, 
          data: analysisData
        };
      }
      console.log('[AnalysisService] No analysis data in response');
      return { success: false, error: 'No analysis data available' };
    } catch (error) {
      console.error('[AnalysisService] Error fetching summary:', error);
      const message = error instanceof Error ? error.message : 'Failed to get analysis';
      return { success: false, error: message };
    }
  }

  /**
   * Generate or regenerate video analysis
   */
  async analyzeVideo(videoId: string): Promise<{ success: boolean; jobId?: string; error?: string }> {
    try {
      const response = await apiClient.post<{ jobId: string }>(`/videos/${videoId}/analyze`);
      return { success: true, jobId: response.data?.jobId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Analysis failed';
      return { success: false, error: message };
    }
  }

  /**
   * Get scenes/chapters from video
   * PHASE 3: Fetches auto-generated scenes with temporal reasoning
   */
  async getScenes(videoId: string): Promise<SceneResponse> {
    try {
      console.log('[AnalysisService] Fetching scenes for video:', videoId);
      const response = await apiClient.post<Scene[]>(`/videos/${videoId}/scenes`);
      console.log('[AnalysisService] Scenes response:', response);
      if (response.success && response.data) {
        console.log('[AnalysisService] Scenes data:', response.data);
        return { success: true, data: response.data };
      }
      console.log('[AnalysisService] No scenes data in response');
      return { success: false, error: 'No scenes data available' };
    } catch (error) {
      console.error('[AnalysisService] Error fetching scenes:', error);
      const message = error instanceof Error ? error.message : 'Failed to get scenes';
      return { success: false, error: message };
    }
  }

  /**
   * Start video indexing for search
   */
  async startIndexing(videoId: string): Promise<IndexingJob | null> {
    try {
      const response = await apiClient.post<IndexingJob>(`/videos/${videoId}/index`);
      return response.data || null;
    } catch (error) {
      console.error('Failed to start indexing:', error);
      return null;
    }
  }

  /**
   * Get indexing status
   */
  async getIndexingStatus(videoId: string): Promise<IndexingJob | null> {
    try {
      const response = await apiClient.get<IndexingJob>(`/videos/${videoId}/index/status`);
      return response.data || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get video segments for search
   */
  async getVideoSegments(videoId: string): Promise<TemporalSegment[]> {
    try {
      const response = await apiClient.get<TemporalSegment[]>(`/videos/${videoId}/index/segments`);
      return response.data || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Search within video
   */
  async searchVideo(videoId: string, request: SearchRequest): Promise<SearchResponse | null> {
    try {
      const response = await apiClient.post<SearchResponse>(`/videos/${videoId}/search`, request);
      return response.data || null;
    } catch (error) {
      console.error('Search failed:', error);
      return null;
    }
  }

  /**
   * Get search suggestions
   */
  async getSearchSuggestions(videoId: string, query: string): Promise<string[]> {
    try {
      const response = await apiClient.get<string[]>(`/videos/${videoId}/search/suggestions`, {
        params: { q: query },
      });
      return response.data || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get conversation history
   */
  async getConversation(videoId: string, conversationId: string): Promise<ConversationResponse> {
    try {
      const response = await apiClient.get<Conversation>(
        `/videos/${videoId}/conversations/${conversationId}`
      );
      return { success: true, data: response.data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get conversation';
      return { success: false, error: message };
    }
  }

  /**
   * List all conversations for a video
   */
  async listConversations(videoId: string): Promise<Conversation[]> {
    try {
      const response = await apiClient.get<Conversation[]>(`/videos/${videoId}/conversations`);
      return response.data || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Send a chat message
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await apiClient.post<{ conversationId: string; message: ConversationMessage }>(
        `/videos/${request.videoId}/chat`,
        {
          message: request.message,
          conversationId: request.conversationId,
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Chat failed';
      return { success: false, error: message };
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(videoId: string, conversationId: string): Promise<boolean> {
    try {
      await apiClient.delete(`/videos/${videoId}/conversations/${conversationId}`);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const analysisService = new AnalysisService();
