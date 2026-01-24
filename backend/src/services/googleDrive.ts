import { google, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { GoogleDriveFile } from '@gemini-video-platform/shared';
import { config } from '../utils/env';
import logger from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

export class GoogleDriveService {
  private oauth2Client: OAuth2Client;

  constructor(accessToken: string, refreshToken?: string) {
    // Create OAuth2 client
    this.oauth2Client = new OAuth2Client(
      config.googleClientId,
      config.googleClientSecret
    );

    console.log('GoogleDriveService: Setting credentials', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken?.length,
      clientId: config.googleClientId?.substring(0, 20) + '...',
    });

    // Set credentials - include API key if available
    const credentials: any = {
      access_token: accessToken,
      refresh_token: refreshToken,
    };

    // Add API key if available (helps with "unregistered callers" error)
    if (process.env.GOOGLE_API_KEY) {
      credentials.api_key = process.env.GOOGLE_API_KEY;
      console.log('GoogleDriveService: Using API key for additional authentication');
    }

    this.oauth2Client.setCredentials(credentials);
  }

  /**
   * Get Drive API client
   */
  private getDriveClient(): drive_v3.Drive {
    // If API key is available, use it along with OAuth
    const driveConfig: any = { 
      version: 'v3', 
      auth: this.oauth2Client as any 
    };
    
    // Add API key as fallback authentication
    if (process.env.GOOGLE_API_KEY) {
      driveConfig.key = process.env.GOOGLE_API_KEY;
    }
    
    return google.drive(driveConfig);
  }

  /**
   * List video files from Google Drive
   */
  async listVideoFiles(): Promise<GoogleDriveFile[]> {
    try {
      const drive = this.getDriveClient();
      
      console.log('listVideoFiles: Making API call to Google Drive...');
      console.log('listVideoFiles: OAuth client credentials:', {
        hasAccessToken: !!this.oauth2Client.credentials.access_token,
        hasRefreshToken: !!this.oauth2Client.credentials.refresh_token,
      });
      
      // Query for video files only
      const response = await drive.files.list({
        q: "mimeType contains 'video/' and trashed = false",
        fields: 'files(id, name, mimeType, size, createdTime, webViewLink, thumbnailLink)',
        orderBy: 'createdTime desc',
        pageSize: 100,
      });

      console.log('listVideoFiles: Successfully retrieved files, count:', response.data.files?.length || 0);

      const files = response.data.files || [];
      
      return files.map((file) => ({
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        size: parseInt(file.size || '0', 10),
        createdTime: file.createdTime!,
        webViewLink: file.webViewLink!,
        thumbnailLink: file.thumbnailLink || undefined,
      }));
    } catch (error: any) {
      console.log('listVideoFiles: Error details:', {
        message: error.message,
        code: error.code,
        status: error.status,
        statusText: error.statusText,
        errors: error.errors,
        response: error.response?.data,
      });
      
      logger.error('Error listing Drive files:', error);
      
      // Handle token refresh if needed
      if (error.code === 401 || error.message?.includes('invalid_grant')) {
        throw new Error('Google Drive access token expired. Please re-authenticate.');
      }
      
      throw new Error(`Failed to list Google Drive files: ${error.message}`);
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string): Promise<GoogleDriveFile> {
    try {
      const drive = this.getDriveClient();
      
      const response = await drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size, createdTime, webViewLink, thumbnailLink',
      });

      const file = response.data;

      return {
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        size: parseInt(file.size || '0', 10),
        createdTime: file.createdTime!,
        webViewLink: file.webViewLink!,
        thumbnailLink: file.thumbnailLink || undefined,
      };
    } catch (error: any) {
      logger.error(`Error getting file metadata for ${fileId}:`, error);
      
      if (error.code === 401) {
        throw new Error('Google Drive access token expired. Please re-authenticate.');
      }
      
      if (error.code === 404) {
        throw new Error('File not found in Google Drive');
      }
      
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }

  /**
   * Download file from Google Drive and save to local path
   * Returns the local file path
   */
  async downloadFile(
    fileId: string,
    destinationPath: string,
    onProgress?: (bytesDownloaded: number, totalBytes: number) => void
  ): Promise<string> {
    try {
      const drive = this.getDriveClient();
      
      // Get file metadata first to know the size
      const metadata = await this.getFileMetadata(fileId);
      const totalBytes = metadata.size;

      // Ensure directory exists
      const dir = path.dirname(destinationPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Stream download to avoid loading entire file in memory
      const response = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      );

      return new Promise<string>((resolve, reject) => {
        const dest = fs.createWriteStream(destinationPath);
        let bytesDownloaded = 0;

        response.data
          .on('data', (chunk: Buffer) => {
            bytesDownloaded += chunk.length;
            if (onProgress) {
              onProgress(bytesDownloaded, totalBytes);
            }
          })
          .on('end', () => {
            logger.info(`Downloaded file ${fileId} to ${destinationPath}`);
            resolve(destinationPath);
          })
          .on('error', (error: Error) => {
            logger.error(`Error downloading file ${fileId}:`, error);
            // Clean up partial file
            if (fs.existsSync(destinationPath)) {
              fs.unlinkSync(destinationPath);
            }
            reject(error);
          })
          .pipe(dest);

        dest.on('error', (error: Error) => {
          logger.error(`Error writing file ${destinationPath}:`, error);
          reject(error);
        });
      });
    } catch (error: any) {
      logger.error(`Error in downloadFile for ${fileId}:`, error);
      
      if (error.code === 401) {
        throw new Error('Google Drive access token expired. Please re-authenticate.');
      }
      
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Get a readable stream for a file
   */
  async getFileStream(fileId: string): Promise<Readable> {
    try {
      const drive = this.getDriveClient();
      
      const response = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      );

      return response.data;
    } catch (error: any) {
      logger.error(`Error getting file stream for ${fileId}:`, error);
      
      if (error.code === 401) {
        throw new Error('Google Drive access token expired. Please re-authenticate.');
      }
      
      throw new Error(`Failed to get file stream: ${error.message}`);
    }
  }

  /**
   * Check if access token is valid
   */
  async verifyAccess(): Promise<boolean> {
    try {
      const drive = this.getDriveClient();
      await drive.about.get({ fields: 'user' });
      return true;
    } catch (error) {
      logger.error('Drive access verification failed:', error);
      return false;
    }
  }

  /**
   * Refresh access token if refresh token is available
   */
  async refreshAccessToken(): Promise<string> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      if (!credentials.access_token) {
        throw new Error('Failed to refresh access token');
      }

      logger.info('Successfully refreshed Google Drive access token');
      return credentials.access_token;
    } catch (error: any) {
      logger.error('Error refreshing access token:', error);
      throw new Error('Failed to refresh Google Drive access token. Please re-authenticate.');
    }
  }
}
