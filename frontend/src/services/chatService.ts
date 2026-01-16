import { apiClient } from './api';
import {
  RateLimitInfo,
  Bookmark
} from '../../shared/types';

export interface SendMessageRequest {
  videoId: string;
  message: string;
  conversationId?: string;
}

export interface SendMessageResponse {
  success: boolean;
  data?: {
    conversationId: string;
    reply: string;
    referencedTimestamps?: Array<{ start: number; end: number }>;
    messageId: string;
  };
  error?: string;
}

export interface CustomAnalysisRequest {
  videoId: string;
  prompt: string;
}

export interface CustomAnalysisResponse {
  success: boolean;
  data?: {
    analysis: string;
    referencedTimestamps?: Array<{ start: number; end: number }>;
  };
  error?: string;
}

export interface CreateBookmarkRequest {
  videoId: string;
  timestamp: number;
  note?: string;
  conversationId?: string;
}

export interface GetBookmarksResponse {
  success: boolean;
  data?: {
    bookmarks: Bookmark[];
  };
  error?: string;
}

export interface CreateBookmarkResponse {
  success: boolean;
  data?: {
    bookmark: Bookmark;
  };
  error?: string;
}

export interface DeleteBookmarkResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface GetRateLimitResponse {
  success: boolean;
  data?: RateLimitInfo;
  error?: string;
}

class ChatService {
  /**
   * Send a chat message and get AI response
   */
  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    try {
      const response = await apiClient.post<{
        conversationId: string;
        reply: string;
        referencedTimestamps?: Array<{ start: number; end: number }>;
        messageId: string;
      }>(`/videos/${request.videoId}/chat`, {
        message: request.message,
        conversationId: request.conversationId,
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const message = error instanceof Error && 'response' in error
        ? ((error as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error || 
           (error as { message?: string }).message || 'Failed to send message')
        : 'Failed to send message';
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Run custom analysis on video
   */
  async runCustomAnalysis(request: CustomAnalysisRequest): Promise<CustomAnalysisResponse> {
    try {
      const response = await apiClient.post<{
        analysis: string;
        referencedTimestamps?: Array<{ start: number; end: number }>;
      }>(`/videos/${request.videoId}/analyze-custom`, {
        prompt: request.prompt,
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const message = error instanceof Error && 'response' in error
        ? ((error as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error || 
           (error as { message?: string }).message || 'Custom analysis failed')
        : 'Custom analysis failed';
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Create a bookmark
   */
  async createBookmark(request: CreateBookmarkRequest): Promise<CreateBookmarkResponse> {
    try {
      const response = await apiClient.post<{
        bookmark: Bookmark;
      }>(`/videos/${request.videoId}/bookmarks`, {
        timestamp: request.timestamp,
        note: request.note,
        conversationId: request.conversationId,
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const message = error instanceof Error && 'response' in error
        ? ((error as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error || 
           (error as { message?: string }).message || 'Failed to create bookmark')
        : 'Failed to create bookmark';
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Get bookmarks for a video
   */
  async getBookmarks(videoId: string): Promise<GetBookmarksResponse> {
    try {
      const response = await apiClient.get<{
        bookmarks: Bookmark[];
      }>(`/videos/${videoId}/bookmarks`);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const message = error instanceof Error && 'response' in error
        ? ((error as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error || 
           (error as { message?: string }).message || 'Failed to get bookmarks')
        : 'Failed to get bookmarks';
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Delete a bookmark
   */
  async deleteBookmark(videoId: string, bookmarkId: string): Promise<DeleteBookmarkResponse> {
    try {
      await apiClient.delete(`/videos/${videoId}/bookmarks/${bookmarkId}`);

      return {
        success: true,
        message: 'Bookmark deleted successfully',
      };
    } catch (error) {
      const message = error instanceof Error && 'response' in error
        ? ((error as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error || 
           (error as { message?: string }).message || 'Failed to delete bookmark')
        : 'Failed to delete bookmark';
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Get current rate limit status
   */
  async getRateLimit(videoId: string): Promise<GetRateLimitResponse> {
    try {
      const response = await apiClient.get<RateLimitInfo>(`/videos/${videoId}/rate-limit`);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const message = error instanceof Error && 'response' in error
        ? ((error as { response?: { data?: { error?: string } }; message?: string }).response?.data?.error || 
           (error as { message?: string }).message || 'Failed to get rate limit')
        : 'Failed to get rate limit';
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Parse timestamp from text (helper function)
   */
  parseTimestamp(text: string): number | null {
    // Pattern for [MM:SS] format
    const pattern = /\[(\d{1,2}):(\d{2})\]/;
    const match = text.match(pattern);
    
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      return minutes * 60 + seconds;
    }
    
    return null;
  }

  /**
   * Format seconds to MM:SS format
   */
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Parse timestamps from AI response text
   */
  parseTimestampsFromText(text: string): Array<{ start: number; end: number }> {
    const timestamps: Array<{ start: number; end: number }> = [];
    
    // Pattern for [MM:SS] or [MM:SS-MM:SS]
    const timestampPattern = /\[(\d{1,2}):(\d{2})(?:-(\d{1,2}):(\d{2}))?\]/g;
    let match;
    
    while ((match = timestampPattern.exec(text)) !== null) {
      const startMinutes = parseInt(match[1]);
      const startSeconds = parseInt(match[2]);
      const start = startMinutes * 60 + startSeconds;
      
      if (match[3] && match[4]) {
        // Range format [MM:SS-MM:SS]
        const endMinutes = parseInt(match[3]);
        const endSeconds = parseInt(match[4]);
        const end = endMinutes * 60 + endSeconds;
        timestamps.push({ start, end });
      } else {
        // Single timestamp [MM:SS]
        timestamps.push({ start, end: start + 5 }); // Default 5 second duration
      }
    }
    
    return timestamps;
  }
}

export const chatService = new ChatService();