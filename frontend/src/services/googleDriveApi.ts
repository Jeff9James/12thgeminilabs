import { apiClient } from './api';
import {
  GoogleDriveFile,
  GoogleDriveImportRequest,
  GoogleDriveImportStatus,
} from '../../shared/types';
import { API_ENDPOINTS } from '../../shared/constants';

export const googleDriveApi = {
  /**
   * List video files from Google Drive
   */
  async listFiles(): Promise<GoogleDriveFile[]> {
    const response = await apiClient.get<GoogleDriveFile[]>(
      API_ENDPOINTS.GOOGLE_DRIVE.FILES
    );
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to list Google Drive files');
    }
    
    return response.data;
  },

  /**
   * Import a video from Google Drive
   */
  async importFile(fileId: string, title?: string): Promise<{ videoId: string; status: string }> {
    const endpoint = API_ENDPOINTS.GOOGLE_DRIVE.IMPORT.replace(':fileId', fileId);
    const payload: GoogleDriveImportRequest = { fileId, title };
    
    const response = await apiClient.post<{ videoId: string; status: string }>(
      endpoint,
      payload
    );
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to import video from Google Drive');
    }
    
    return response.data;
  },

  /**
   * Get import status
   */
  async getImportStatus(videoId: string): Promise<GoogleDriveImportStatus> {
    const endpoint = API_ENDPOINTS.GOOGLE_DRIVE.IMPORT_STATUS.replace(':fileId', videoId);
    
    const response = await apiClient.get<GoogleDriveImportStatus>(endpoint);
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get import status');
    }
    
    return response.data;
  },
};
