import { VideoMetadata } from '../../../shared/types';

export interface StorageAdapter {
  upload(filePath: string, destination: string): Promise<string>;
  download(videoPath: string): Promise<Buffer>;
  delete(videoPath: string): Promise<void>;
  exists(videoPath: string): Promise<boolean>;
  getStream(videoPath: string): NodeJS.ReadableStream;
  getSignedUrl(videoPath: string, expiresIn?: number): Promise<string>;
}

export interface VideoMetadataResult {
  duration: number;
  width: number;
  height: number;
  frameRate: number;
  frameCount: number;
  mimeType: string;
  fileSize: number;
}

export interface QueueItem {
  id: string;
  videoId: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  error?: string;
}
