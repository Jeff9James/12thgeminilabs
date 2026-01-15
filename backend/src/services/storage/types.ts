import { VideoMetadata } from '../../../shared/types';

export interface StorageProvider {
  name: 'local' | 'firebase';
  
  // Upload operations
  uploadFile(
    sourcePath: string,
    destinationPath: string,
    metadata?: { contentType?: string }
  ): Promise<string>;
  
  uploadBuffer(
    buffer: Buffer,
    destinationPath: string,
    metadata?: { contentType?: string }
  ): Promise<string>;
  
  // Download operations
  downloadFile(sourcePath: string, destinationPath: string): Promise<void>;
  
  getFileBuffer(sourcePath: string): Promise<Buffer>;
  
  // Delete operations
  deleteFile(filePath: string): Promise<void>;
  
  // Stream operations
  createReadStream(filePath: string): NodeJS.ReadableStream;
  createWriteStream(filePath: string): NodeJS.WritableStream;
  
  // File info
  fileExists(filePath: string): Promise<boolean>;
  getFileSize(filePath: string): Promise<number>;
  getSignedUrl?(filePath: string, expiresIn?: number): Promise<string>;
  
  // Health check
  healthCheck(): Promise<boolean>;
}

export interface UploadOptions {
  chunkNumber: number;
  totalChunks: number;
  videoId: string;
  filename: string;
}
