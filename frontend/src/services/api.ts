import axios, { AxiosInstance, AxiosError } from 'axios';
import { ApiResponse } from '@shared/types';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || '/api',
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Include cookies for OAuth tokens
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
      async (error: AxiosError<ApiResponse<unknown>>) => {
        const requestUrl = error.config?.url || '';
        
        if (error.response?.status === 401) {
          // Don't redirect for Google Drive endpoints - let the component handle it
          if (requestUrl.includes('/google-drive/')) {
            return Promise.reject(error);
          }
          
          // Try to refresh token for other 401 errors
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            try {
              const response = await this.post<{ token: string }>('/auth/refresh', { 
                refreshToken 
              });
              
              if (response.success && response.data) {
                localStorage.setItem('token', response.data.token);
                // Retry original request
                const originalRequest = error.config;
                if (originalRequest) {
                  originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
                  return this.client(originalRequest);
                }
              }
            } catch (refreshError) {
              // Refresh failed, only redirect to login if not already there
              this.clearAuth();
              if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
              }
            }
          } else {
            // No refresh token, only redirect to login if not already there
            this.clearAuth();
            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
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

  async get<T>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url);
    return response.data;
  }
}

export const apiClient = new ApiClient();
