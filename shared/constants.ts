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
  },
  SEARCH: {
    SEMANTIC: '/api/search/semantic',
  },
} as const;

// Video Status
export const VIDEO_STATUS = {
  UPLOADING: 'uploading',
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

// Environment Variables
export const ENV_VARS = {
  GEMINI_API_KEY: 'GEMINI_API_KEY',
  GOOGLE_CLIENT_ID: 'GOOGLE_CLIENT_ID',
  GOOGLE_CLIENT_SECRET: 'GOOGLE_CLIENT_SECRET',
  DATABASE_PATH: 'DATABASE_PATH',
  FRONTEND_URL: 'FRONTEND_URL',
  VIDEO_STORAGE_TYPE: 'VIDEO_STORAGE_TYPE',
  VIDEO_STORAGE_PATH: 'VIDEO_STORAGE_PATH',
  TEMP_UPLOAD_PATH: 'TEMP_UPLOAD_PATH',
  QUEUE_PATH: 'QUEUE_PATH',
  FIREBASE_PROJECT_ID: 'FIREBASE_PROJECT_ID',
  FIREBASE_PRIVATE_KEY: 'FIREBASE_PRIVATE_KEY',
  FIREBASE_CLIENT_EMAIL: 'FIREBASE_CLIENT_EMAIL',
  FIREBASE_BUCKET: 'FIREBASE_BUCKET',
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
  UPLOAD_INCOMPLETE: 'Upload incomplete, missing chunks',
  FINALIZE_FAILED: 'Failed to finalize video',
  METADATA_EXTRACTION_FAILED: 'Failed to extract video metadata',
  STORAGE_FAILED: 'Failed to store video',
  ANALYSIS_FAILED: 'Failed to analyze video',
  INTERNAL_ERROR: 'Internal server error',
  FILE_TOO_LARGE: 'File exceeds maximum size limit',
  INVALID_FILE_TYPE: 'Invalid file type',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  UPLOAD_COMPLETE: 'Video uploaded successfully',
  FINALIZE_COMPLETE: 'Video processing started',
  ANALYSIS_COMPLETE: 'Video analysis complete',
  DELETE_COMPLETE: 'Video deleted successfully',
} as const;

// Supported Video Formats
export const SUPPORTED_VIDEO_FORMATS = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
];

// Video Upload Constants
export const VIDEO_UPLOAD = {
  CHUNK_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024, // 2GB
  TEMP_DIR: './data/uploads',
};
