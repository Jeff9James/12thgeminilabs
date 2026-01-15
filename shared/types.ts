// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  googleId: string;
  picture?: string;
  quotaUsed?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// Video Types
export interface Video {
  id: string;
  userId: string;
  title: string;
  filename: string;
  originalFilename: string;
  path: string;
  fileSize: number;
  mimeType: string;
  duration?: number;
  width?: number;
  height?: number;
  frameCount?: number;
  status: VideoStatus;
  uploadError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type VideoStatus = 
  | 'uploading'
  | 'pending'
  | 'uploaded'
  | 'processing'
  | 'ready'
  | 'error';

// Video Analysis Types
export interface VideoAnalysis {
  id: string;
  videoId: string;
  userId: string;
  embeddings?: number[];
  summary?: string;
  transcript?: string;
  tags?: string[];
  timestamps: VideoTimestamp[];
  createdAt: Date;
  updatedAt: Date;
}

export interface VideoTimestamp {
  time: number;
  description: string;
  confidence: number;
}

// Search Types
export interface SearchResult {
  videoId: string;
  videoTitle: string;
  timestamp: number;
  confidence: number;
  snippet: string;
}

export interface SearchQuery {
  query: string;
  videoId?: string;
  threshold?: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Upload Types
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResponse {
  videoId: string;
  status: string;
}

export interface ChunkUploadResponse {
  success: boolean;
  chunkNumber: number;
  totalChunks: number;
  videoId: string;
  message?: string;
}

export interface FinalizeUploadResponse {
  success: boolean;
  video: Video;
  message?: string;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  frameRate: number;
  frameCount: number;
  format: string;
  codec: string;
  bitrate?: number;
}

// Queue Types
export interface VideoProcessingQueueItem {
  id: string;
  videoId: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  createdAt: string;
  updatedAt: string;
}
