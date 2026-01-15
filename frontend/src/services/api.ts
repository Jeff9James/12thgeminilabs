import axios, { AxiosInstance, AxiosError } from 'axios';
import { ApiResponse } from '../../shared/types';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || '/api',
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiResponse>) => {
        if (error.response?.status === 401) {
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            try {
              const response = await this.post<{ token: string }>('/auth/refresh', { 
                refreshToken 
              });
              
              if (response.success && response.data) {
                localStorage.setItem('token', response.data.token);
                const originalRequest = error.config;
                if (originalRequest) {
                  originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
                  return this.client(originalRequest);
                }
              }
            } catch (refreshError) {
              this.clearAuth();
              window.location.href = '/login';
            }
          } else {
            this.clearAuth();
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  async get<T>(url: string, params?: any): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url);
    return response.data;
  }

  // Upload file with progress tracking
  async uploadFile<T>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
    params?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const response = await this.client.post<ApiResponse<T>>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  }

  // Upload chunk for chunked upload
  async uploadChunk(
    url: string,
    chunk: Blob,
    chunkNumber: number,
    totalChunks: number,
    videoId: string,
    filename: string,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<{ chunkNumber: number; totalChunks: number; videoId: string }>> {
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkNumber', chunkNumber.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('videoId', videoId);
    formData.append('filename', filename);

    const response = await this.client.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  }

  // Finalize chunked upload
  async finalizeUpload<T>(url: string, data: {
    videoId: string;
    filename: string;
    totalChunks: number;
    mimeType: string;
  }): Promise<ApiResponse<T>> {
    const response = await this.client.post(url, data);
    return response.data;
  }

  // Get video stream URL
  getVideoStreamUrl(videoId: string): string {
    const token = localStorage.getItem('token');
    return `${this.client.defaults.baseURL}/videos/${videoId}/stream?token=${token}`;
  }
}

export const apiClient = new ApiClient();
