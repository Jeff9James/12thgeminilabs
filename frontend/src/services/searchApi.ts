import { apiClient } from './api';
import { SearchRequest, SearchResponse, IndexingJob, TemporalSegment } from '@shared/types';

export class SearchApiService {
  // Start indexing a video
  async startIndexing(videoId: string): Promise<IndexingJob> {
    const response = await apiClient.post(`/videos/${videoId}/index`);
    return response.data.data;
  }

  // Get indexing status by video
  async getIndexingStatus(videoId: string): Promise<IndexingJob | null> {
    try {
      const response = await apiClient.get(`/videos/${videoId}/index/status`);
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  // Get specific indexing job status
  async getIndexingJobStatus(videoId: string, jobId: string): Promise<IndexingJob> {
    const response = await apiClient.get(`/videos/${videoId}/index/status/${jobId}`);
    return response.data.data;
  }

  // Get video segments
  async getVideoSegments(videoId: string): Promise<TemporalSegment[]> {
    const response = await apiClient.get(`/videos/${videoId}/index/segments`);
    return response.data.data;
  }

  // Search within a video
  async searchVideo(videoId: string, searchRequest: SearchRequest): Promise<SearchResponse> {
    const response = await apiClient.post(`/videos/${videoId}/search`, searchRequest);
    return response.data.data;
  }

  // Get search suggestions
  async getSearchSuggestions(videoId: string, partialQuery: string): Promise<string[]> {
    const response = await apiClient.get(`/videos/${videoId}/search/suggestions`, {
      params: { q: partialQuery }
    });
    return response.data.data;
  }

  // Get popular search terms
  async getPopularSearchTerms(videoId: string): Promise<string[]> {
    const response = await apiClient.get(`/videos/${videoId}/search/popular`);
    return response.data.data;
  }

  // Re-index a video
  async reindexVideo(videoId: string): Promise<IndexingJob> {
    const response = await apiClient.post(`/videos/${videoId}/index/reindex`);
    return response.data.data;
  }

  // Delete temporal index
  async deleteIndex(videoId: string): Promise<void> {
    await apiClient.delete(`/videos/${videoId}/index`);
  }
}

export const searchApiService = new SearchApiService();