// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  googleId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Video Types
export interface Video {
  id: string;
  userId: string;
  title: string;
  filename: string;
  path: string;
  size: number;
  duration?: number;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  createdAt: Date;
  updatedAt: Date;
}

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
