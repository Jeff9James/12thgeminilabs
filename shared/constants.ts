// API Endpoints
export const API_ENDPOINTS = {
  HEALTH: '/api/health',
  AUTH: {
    GOOGLE: '/api/auth/google',
    CALLBACK: '/api/auth/google/callback',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
  },
  VIDEOS: {
    LIST: '/api/videos',
    UPLOAD: '/api/videos/upload',
    FINALIZE: '/api/videos/finalize',
    GET: '/api/videos/:id',
    STREAM: '/api/videos/:id/stream',
    DELETE: '/api/videos/:id',
  },
  ANALYSIS: {
    CREATE: '/api/videos/:id/analyze',
    GET: '/api/analysis/:id',
    STATUS: '/api/videos/:id/analysis/:jobId',
    SUMMARIZE: '/api/videos/:id/summarize',
    SCENES: '/api/videos/:id/scenes',
    SEARCH: '/api/videos/:id/search',
    CHAT: '/api/videos/:id/chat',
  },
  SEARCH: {
    SEMANTIC: '/api/search/semantic',
  },
} as const;

// Video Status
export const VIDEO_STATUS = {
  PENDING: 'pending',
  UPLOADED: 'uploaded',
  PROCESSING: 'processing',
  READY: 'ready',
  ERROR: 'error',
} as const;

// Storage Types
export const STORAGE_TYPES = {
  LOCAL: 'local',
  FIREBASE: 'firebase',
} as const;

// Video Upload Constants
export const UPLOAD_CONSTANTS = {
  CHUNK_SIZE: 5 * 1024 * 1024, // 5MB chunks
  MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024, // 2GB max
  SUPPORTED_FORMATS: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
  SUPPORTED_EXTENSIONS: ['.mp4', '.mov', '.avi', '.webm'],
  TEMP_UPLOAD_DIR: './temp_uploads',
} as const;

// Queue Constants
export const QUEUE_CONSTANTS = {
  QUEUE_DIR: './data/queue',
} as const;

// Environment Variables
export const ENV_VARS = {
  GEMINI_API_KEY: 'GEMINI_API_KEY',
  GOOGLE_CLIENT_ID: 'GOOGLE_CLIENT_ID',
  GOOGLE_CLIENT_SECRET: 'GOOGLE_CLIENT_SECRET',
  DATABASE_PATH: 'DATABASE_PATH',
  FRONTEND_URL: 'FRONTEND_URL',
  VIDEO_STORAGE_TYPE: 'VIDEO_STORAGE_TYPE',
  VIDEO_STORAGE_PATH: 'VIDEO_STORAGE_PATH',
  JWT_SECRET: 'JWT_SECRET',
  JWT_REFRESH_SECRET: 'JWT_REFRESH_SECRET',
  PORT: 'PORT',
  NODE_ENV: 'NODE_ENV',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized access',
  INVALID_TOKEN: 'Invalid or expired token',
  VIDEO_NOT_FOUND: 'Video not found',
  UPLOAD_FAILED: 'Failed to upload video',
  UPLOAD_CHUNK_FAILED: 'Failed to upload chunk',
  FINALIZE_FAILED: 'Failed to finalize video upload',
  INVALID_FILE_TYPE: 'Invalid file type. Supported types: mp4, mov, avi, webm',
  FILE_TOO_LARGE: 'File too large. Maximum size is 2GB',
  CHUNK_MISMATCH: 'Chunk number mismatch',
  MISSING_CHUNK: 'Missing chunk data',
  ANALYSIS_FAILED: 'Failed to analyze video',
  INTERNAL_ERROR: 'Internal server error',
} as const;

// Analysis Constants
export const ANALYSIS_CONSTANTS = {
  SYNC_SIZE_THRESHOLD: 50 * 1024 * 1024, // 50MB - process synchronously if smaller
  MAX_PROCESSING_TIME: 10 * 60 * 1000, // 10 minutes
  MAX_RETRIES: 3,
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  UPLOAD_COMPLETE: 'Video uploaded successfully',
  ANALYSIS_COMPLETE: 'Video analysis complete',
  DELETE_COMPLETE: 'Video deleted successfully',
} as const;
