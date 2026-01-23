// API Endpoints (relative paths - apiClient adds /api prefix)
export const API_ENDPOINTS = {
  HEALTH: '/health',
  AUTH: {
    GOOGLE: '/auth/google',
    GOOGLE_CODE: '/auth/google-code',
    CALLBACK: '/auth/google/callback',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
  },
  VIDEOS: {
    LIST: '/videos',
    UPLOAD: '/videos/upload',
    FINALIZE: '/videos/finalize',
    GET: '/videos/:id',
    STREAM: '/videos/:id/stream',
    DELETE: '/videos/:id',
  },
  ANALYSIS: {
    CREATE: '/videos/:id/analyze',
    GET: '/analysis/:id',
    STATUS: '/videos/:id/analysis/:jobId',
    SUMMARIZE: '/videos/:id/summarize',
    SCENES: '/videos/:id/scenes',
    SEARCH: '/videos/:id/search',
    CHAT: '/videos/:id/chat',
  },
  SEARCH: {
    SEMANTIC: '/search/semantic',
  },
  GOOGLE_DRIVE: {
    AUTH_START: '/google-drive/auth/start',
    AUTH_CALLBACK: '/google-drive/auth/callback',
    FILES: '/google-drive/files',
    IMPORT: '/google-drive/import/:fileId',
    IMPORT_STATUS: '/google-drive/import/:fileId/status',
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

// Search Constants
export const SEARCH_CONSTANTS = {
  DEFAULT_SEGMENT_DURATION: 30, // 30 seconds
  DEFAULT_THRESHOLD: 0.5,
  MIN_THRESHOLD: 0.0,
  MAX_THRESHOLD: 1.0,
  POLLING_INTERVAL: 3000, // 3 seconds
  MAX_SUGGESTIONS: 10,
  MAX_POPULAR_TERMS: 10,
  MIN_QUERY_LENGTH: 2,
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  UPLOAD_COMPLETE: 'Video uploaded successfully',
  ANALYSIS_COMPLETE: 'Video analysis complete',
  DELETE_COMPLETE: 'Video deleted successfully',
  INDEXING_STARTED: 'Video indexing started successfully',
  SEARCH_COMPLETE: 'Search completed successfully',
} as const;
