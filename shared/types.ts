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
export type VideoStatus = 'pending' | 'uploaded' | 'processing' | 'ready' | 'error';

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
  status: 'pending' | 'uploaded' | 'processing' | 'ready' | 'error';
  uploadError?: string;
  googleDriveId?: string;
  googleDriveUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  frameRate: number;
  frameCount: number;
  mimeType: string;
  fileSize: number;
}

export interface VideoCreateInput {
  userId: string;
  title: string;
  originalFilename: string;
  filename: string;
  path: string;
  fileSize: number;
  mimeType: string;
}

export interface UploadChunk {
  videoId: string;
  chunkNumber: number;
  totalChunks: number;
  filename: string;
}

export interface UploadProgress {
  videoId: string;
  loaded: number;
  total: number;
  percentage: number;
}

export interface ChunkUploadResponse {
  videoId: string;
  chunkNumber: number;
  received: boolean;
}

export interface VideoFinalizeResponse {
  video: Video;
  message: string;
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

// Video Analysis Result - used by frontend
export interface VideoAnalysisResult {
  summary: string;
  scenes: Scene[];
  tags: string[];
  entities: string[];
  actions: string[];
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

// Gemini Analysis Types
export interface Analysis {
  id: string;
  videoId: string;
  userId: string;
  analysisType: 'summary' | 'scenes' | 'search' | 'custom';
  query?: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  result?: string; // JSON stringified result
  errorMessage?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface Scene {
  id: string;
  timestamp: number;
  duration?: number;
  title: string;
  description: string;
  thumbnailUrl?: string;
}

export interface SearchMatch {
  timestamp: number;
  duration: number;
  description: string;
  confidence: number;
}

export interface SummaryResult {
  summary: string;
  keyPoints?: string[];
  duration: number;
}

export interface Conversation {
  id: string;
  videoId: string;
  userId: string;
  messages: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  createdAt: Date;
}

export interface AnalysisJobResponse {
  jobId: string;
  status: 'pending' | 'processing';
  message: string;
}

export interface AnalysisStatusResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  result?: any;
  error?: string;
  progress?: number;
}

// Temporal Index Types
export interface TemporalSegment {
  id: string;
  videoId: string;
  userId: string;
  segmentNumber: number;
  startTime: number;
  endTime: number;
  description: string;
  entities?: string; // JSON string
  sceneType?: string;
  confidence: number;
  createdAt: Date;
}

export interface IndexingJob {
  id: string;
  videoId: string;
  userId: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
  totalSegments: number;
  processedSegments: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

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

// Google Drive Types
export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdTime: string;
  webViewLink: string;
  thumbnailLink?: string;
}

export interface GoogleDriveImportRequest {
  fileId: string;
  title?: string;
}

export interface GoogleDriveImportStatus {
  videoId: string;
  driveFileId?: string;
  status: 'pending' | 'downloading' | 'processing' | 'complete' | 'error';
  progress: number;
  message?: string;
  error?: string;
}

export interface GoogleDriveImportResponse {
  video: Video;
  message: string;
}
