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
  googleDriveId?: string;
  googleDriveUrl?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type VideoStatus = 'pending' | 'uploaded' | 'processing' | 'ready' | 'error';

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  frameRate: number;
  frameCount: number;
  mimeType: string;
  fileSize: number;
}

export interface UploadProgress {
  videoId: string;
  loaded: number;
  total: number;
  percentage: number;
}

// Analysis Types
export interface VideoAnalysis {
  id: string;
  videoId: string;
  summary?: string;
  transcript?: string;
  scenes?: Scene[];
  createdAt: Date | string;
}

export interface Scene {
  id: string;
  timestamp: number;
  duration?: number;
  title: string;
  description: string;
  thumbnailUrl?: string;
}

export interface VideoAnalysisResult {
  summary: string;
  scenes: Scene[];
  tags: string[];
  entities: string[];
  actions: string[];
}

// Chat/Conversation Types
export interface Conversation {
  id: string;
  videoId: string;
  messages: ConversationMessage[];
  createdAt: Date | string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  createdAt: Date | string;
}

export interface ChatRequest {
  videoId: string;
  message: string;
  conversationId?: string;
}

export interface ChatResponse {
  conversationId: string;
  message: ConversationMessage;
}

// Search Types
export interface SearchRequest {
  query: string;
  threshold?: number;
  timeRange?: {
    start: number;
    end: number;
  };
  entityFilters?: string[];
  sceneTypeFilters?: string[];
  searchType?: 'text' | 'semantic' | 'entity' | 'action' | 'scene_type';
}

export interface SearchMatchResult {
  segmentId: string;
  startTime: number;
  endTime: number;
  relevanceScore: number;
  description: string;
  entities?: string[];
  sceneType?: string;
  confidence: number;
}

export interface SearchResponse {
  matches: SearchMatchResult[];
  totalResults: number;
  searchTime: number;
  query: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface VideoListOptions {
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'title' | 'duration' | 'status';
  sortOrder?: 'asc' | 'desc';
  status?: VideoStatus;
  search?: string;
}

// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  googleId: string;
  picture?: string;
  quotaUsed?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Settings Types
export interface UserSettings {
  storageType: 'local' | 'firebase';
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
}

export interface GoogleOAuthStatus {
  connected: boolean;
  email?: string;
  scopes?: string[];
  expiresAt?: Date | string;
}
