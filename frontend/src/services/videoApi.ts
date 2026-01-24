import { apiClient } from './api';
import { Video, ApiResponse } from '@shared/types';

export interface ChunkUploadResponse {
  videoId: string;
  chunkNumber: number;
  received: boolean;
}

export interface VideoFinalizeResponse {
  video: Video;
  message: string;
}

export interface VideoApi {
  // List all videos
  listVideos(): Promise<ApiResponse<Video[]>>;
  
  // Get single video
  getVideo(id: string): Promise<ApiResponse<Video>>;
  
  // Upload a chunk
  uploadChunk(
    file: File,
    videoId: string,
    chunkNumber: number,
    totalChunks: number,
    filename: string
  ): Promise<{ success: boolean; data: ChunkUploadResponse }>;
  
  // Finalize upload
  finalizeUpload(data: {
    videoId: string;
    filename: string;
    totalChunks: number;
    title: string;
    mimeType: string;
    fileSize: number;
  }): Promise<ApiResponse<VideoFinalizeResponse>>;
  
  // Delete video
  deleteVideo(id: string): Promise<ApiResponse<{ message: string }>>;
  
  // Get video stream URL
  getStreamUrl(id: string): string;
}

class VideoApiService implements VideoApi {
  private readonly uploadUrl: string;
  private readonly finalizeUrl: string;

  constructor() {
    this.uploadUrl = '/videos/upload';
    this.finalizeUrl = '/videos/finalize';
  }

  async listVideos(): Promise<ApiResponse<Video[]>> {
    return apiClient.get<Video[]>('/videos');
  }

  async getVideo(id: string): Promise<ApiResponse<Video>> {
    return apiClient.get<Video>(`/videos/${id}`);
  }

  async uploadChunk(
    file: File,
    videoId: string,
    chunkNumber: number,
    totalChunks: number,
    filename: string
  ): Promise<{ success: boolean; data: ChunkUploadResponse }> {
    const formData = new FormData();
    formData.append('chunk', file);
    formData.append('videoId', videoId);
    formData.append('chunkNumber', chunkNumber.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('filename', filename);

    const apiUrl = import.meta.env.VITE_API_URL || '/api';
    const uploadEndpoint = `${apiUrl}${this.uploadUrl}`;

    console.log('=== Video Upload Debug ===');
    console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
    console.log('Upload endpoint:', uploadEndpoint);
    console.log('Chunk:', chunkNumber, '/', totalChunks);
    console.log('=========================');

    const response = await fetch(uploadEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: formData,
    });

    console.log('Upload response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upload error response:', errorText);
      throw new Error(`Failed to upload chunk: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async finalizeUpload(data: {
    videoId: string;
    filename: string;
    totalChunks: number;
    title: string;
    mimeType: string;
    fileSize: number;
  }): Promise<ApiResponse<VideoFinalizeResponse>> {
    return apiClient.post<VideoFinalizeResponse>(this.finalizeUrl, data);
  }

  async deleteVideo(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete<{ message: string }>(`/videos/${id}`);
  }

  getStreamUrl(id: string): string {
    const token = localStorage.getItem('token');
    return `${import.meta.env.VITE_API_URL || '/api'}/videos/${id}/stream?token=${token}`;
  }
}

export const videoApi = new VideoApiService();
