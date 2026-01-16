import { apiClient } from './api';
import { User, UserSettings, GoogleOAuthStatus, PaginatedResponse, Video, VideoListOptions } from '../types/video';

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface SettingsResponse {
  success: boolean;
  data?: UserSettings;
  error?: string;
}

export interface OAuthStatusResponse {
  success: boolean;
  data?: GoogleOAuthStatus;
  error?: string;
}

class UserService {
  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await apiClient.get<User>('/auth/me');
      return response.data || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Update user settings
   */
  async updateSettings(settings: Partial<UserSettings>): Promise<SettingsResponse> {
    try {
      const response = await apiClient.post<UserSettings>('/user/settings', settings);
      return { success: true, data: response.data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update settings';
      return { success: false, error: message };
    }
  }

  /**
   * Get user settings
   */
  async getSettings(): Promise<UserSettings | null> {
    try {
      const response = await apiClient.get<UserSettings>('/user/settings');
      return response.data || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get Google OAuth status
   */
  async getGoogleOAuthStatus(): Promise<OAuthStatusResponse> {
    try {
      const response = await apiClient.get<GoogleOAuthStatus>('/user/oauth/google');
      return { success: true, data: response.data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get OAuth status';
      return { success: false, error: message };
    }
  }

  /**
   * Revoke Google OAuth access
   */
  async revokeGoogleAccess(): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.post('/user/oauth/google/revoke');
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to revoke access';
      return { success: false, error: message };
    }
  }

  /**
   * Get user videos with pagination
   */
  async getVideos(options: VideoListOptions = {}): Promise<PaginatedResponse<Video>> {
    try {
      const response = await apiClient.get<PaginatedResponse<Video>>('/videos', {
        page: options.page || 1,
        pageSize: options.pageSize || 20,
        sortBy: options.sortBy || 'createdAt',
        sortOrder: options.sortOrder || 'desc',
        status: options.status,
        search: options.search,
      });
      return response.data || { items: [], total: 0, page: 1, pageSize: 20, hasMore: false };
    } catch (error) {
      return { items: [], total: 0, page: 1, pageSize: 20, hasMore: false };
    }
  }

  /**
   * Get storage info
   */
  async getStorageInfo(): Promise<{ used: number; total: number; type: string } | null> {
    try {
      const response = await apiClient.get<{ used: number; total: number; type: string }>(
        '/user/storage'
      );
      return response.data || null;
    } catch (error) {
      return null;
    }
  }
}

export const userService = new UserService();
