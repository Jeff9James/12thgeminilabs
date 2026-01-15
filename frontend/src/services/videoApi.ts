import { apiClient } from './api';
import { Video, VideoMetadata, UploadProgress } from '../../shared/types';

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
  listVideos(): Promise<{ success: boolean; data: Video[] }>;
  
  // Get single video
  getVideo(id: string): Promise<{ success: boolean; data: Video }>;
  
  // Upload a chunk
  uploadChunk(
    file: File,
    videoId: string,
    chunkNumber: number,
    totalChunks: number,
    filename: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ success: boolean; data: ChunkUploadResponse }>;
  
  // Finalize upload
  finalizeUpload(data: {
    videoId: string;
    filename: string;
    totalChunks: number;
    title: string;
    mimeType: string;
    fileSize: number;
  }): Promise<{ success: boolean; data: VideoFinalizeResponse }>;
  
  // Delete video
  deleteVideo(id: string): Promise<{ success: boolean; message: string }>;
  
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

  async listVideos(): Promise<{ success: boolean; data: Video[] }> {
    return apiClient.get<Video[]>('/videos');
  }

  async getVideo(id: string): Promise<{ success: boolean; data: Video }> {
    return apiClient.get<Video>(`/videos/${id}`);
  }

  async uploadChunk(
    file: File,
    videoId: string,
    chunkNumber: number,
    totalChunks: number,
    filename: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ success: boolean; data: ChunkUploadResponse }> {
    const formData = new FormData();
    formData.append('chunk', file);
    formData.append('videoId', videoId);
    formData.append('chunkNumber', chunkNumber.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('filename', filename);

    const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}${this.uploadUrl}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload chunk');
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
  }): Promise<{ success: boolean; data: VideoFinalizeResponse }> {
    return apiClient.post<VideoFinalizeResponse>(this.finalizeUrl, data);
  }

  async deleteVideo(id: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ message: string }>(`/videos/${id}`);
  }

  getStreamUrl(id: string): string {
    const token = localStorage.getItem('token');
    return `${import.meta.env.VITE_API_URL || '/api'}/videos/${id}/stream?token=${token}`;
  }
}

export const videoApi = new VideoApiService();
