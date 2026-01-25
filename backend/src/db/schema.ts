// Database schema SQL statements
export const CREATE_USERS_TABLE = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    google_id TEXT UNIQUE NOT NULL,
    picture_url TEXT,
    quota_used INTEGER DEFAULT 0,
    google_drive_access_token TEXT,
    google_drive_refresh_token TEXT,
    google_drive_token_expiry DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

export const CREATE_VIDEOS_TABLE = `
  CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    duration_seconds FLOAT,
    width INTEGER,
    height INTEGER,
    frame_count INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    upload_error TEXT,
    google_drive_id TEXT,
    google_drive_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`;

export const CREATE_VIDEO_ANALYSES_TABLE = `
  CREATE TABLE IF NOT EXISTS video_analyses (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    embeddings TEXT,
    summary TEXT,
    transcript TEXT,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`;

export const CREATE_VIDEO_TIMESTAMPS_TABLE = `
  CREATE TABLE IF NOT EXISTS video_timestamps (
    id TEXT PRIMARY KEY,
    analysis_id TEXT NOT NULL,
    time REAL NOT NULL,
    description TEXT NOT NULL,
    confidence REAL NOT NULL,
    FOREIGN KEY (analysis_id) REFERENCES video_analyses(id) ON DELETE CASCADE
  );
`;

export const CREATE_ANALYSES_TABLE = `
  CREATE TABLE IF NOT EXISTS analyses (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    analysis_type TEXT NOT NULL CHECK(analysis_type IN ('summary', 'scenes', 'search', 'custom')),
    query TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'complete', 'error')),
    result TEXT,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`;

export const CREATE_CONVERSATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT,
    messages TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`;

export const CREATE_BOOKMARKS_TABLE = `
  CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    conversation_id TEXT,
    timestamp_seconds REAL NOT NULL,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
  );
`;

export const CREATE_TEMPORAL_INDEX_TABLE = `
  CREATE TABLE IF NOT EXISTS temporal_index (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    segment_number INTEGER NOT NULL,
    start_time FLOAT NOT NULL,
    end_time FLOAT NOT NULL,
    description TEXT NOT NULL,
    entities TEXT,
    scene_type TEXT,
    confidence REAL DEFAULT 0.8,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`;

export const CREATE_INDEXING_QUEUE_TABLE = `
  CREATE TABLE IF NOT EXISTS indexing_queue (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'complete', 'error')),
    progress INTEGER DEFAULT 0,
    total_segments INTEGER DEFAULT 0,
    processed_segments INTEGER DEFAULT 0,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`;

export const CREATE_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
  CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
  CREATE INDEX IF NOT EXISTS idx_videos_google_drive_id ON videos(google_drive_id);
  CREATE INDEX IF NOT EXISTS idx_video_analyses_video_id ON video_analyses(video_id);
  CREATE INDEX IF NOT EXISTS idx_video_timestamps_analysis_id ON video_timestamps(analysis_id);
  CREATE INDEX IF NOT EXISTS idx_analyses_video_id ON analyses(video_id);
  CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
  CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);
  CREATE INDEX IF NOT EXISTS idx_conversations_video_id ON conversations(video_id);
  CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
  CREATE INDEX IF NOT EXISTS idx_temporal_index_video_id ON temporal_index(video_id);
  CREATE INDEX IF NOT EXISTS idx_temporal_index_user_id ON temporal_index(user_id);
  CREATE INDEX IF NOT EXISTS idx_temporal_index_start_time ON temporal_index(start_time);
  CREATE INDEX IF NOT EXISTS idx_indexing_queue_video_id ON indexing_queue(video_id);
  CREATE INDEX IF NOT EXISTS idx_indexing_queue_status ON indexing_queue(status);
`;

export const CREATE_RATE_LIMITS_TABLE = `
  CREATE TABLE IF NOT EXISTS rate_limits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    video_id TEXT NOT NULL,
    action TEXT NOT NULL DEFAULT 'chat',
    count INTEGER NOT NULL DEFAULT 0,
    reset_time DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
  );
`;

export const ALL_TABLES = [
  CREATE_USERS_TABLE,
  CREATE_VIDEOS_TABLE,
  CREATE_VIDEO_ANALYSES_TABLE,
  CREATE_VIDEO_TIMESTAMPS_TABLE,
  CREATE_ANALYSES_TABLE,
  CREATE_CONVERSATIONS_TABLE,
  CREATE_BOOKMARKS_TABLE,
  CREATE_TEMPORAL_INDEX_TABLE,
  CREATE_INDEXING_QUEUE_TABLE,
  CREATE_RATE_LIMITS_TABLE,
  CREATE_INDEXES,
];

export const ADD_BOOKMARKS_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_bookmarks_video_id ON bookmarks(video_id);
  CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
  CREATE INDEX IF NOT EXISTS idx_bookmarks_conversation_id ON bookmarks(conversation_id);
  CREATE INDEX IF NOT EXISTS idx_bookmarks_timestamp ON bookmarks(timestamp_seconds);
`;

export const ADD_RATE_LIMITS_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_rate_limits_user_video ON rate_limits(user_id, video_id, action);
  CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_time ON rate_limits(reset_time);
`;

// Migration: Add Google Drive token columns to users table
export const ADD_GOOGLE_DRIVE_TOKENS_TO_USERS = `
  ALTER TABLE users ADD COLUMN google_drive_access_token TEXT;
  ALTER TABLE users ADD COLUMN google_drive_refresh_token TEXT;
  ALTER TABLE users ADD COLUMN google_drive_token_expiry DATETIME;
`;

// ============================================
// PostgreSQL-specific schemas (for Railway)
// ============================================

// PostgreSQL uses TIMESTAMP instead of DATETIME, SERIAL for auto-increment
export const CREATE_USERS_TABLE_POSTGRES = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    google_id TEXT UNIQUE NOT NULL,
    picture_url TEXT,
    quota_used INTEGER DEFAULT 0,
    google_drive_access_token TEXT,
    google_drive_refresh_token TEXT,
    google_drive_token_expiry TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

export const CREATE_VIDEOS_TABLE_POSTGRES = `
  CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    duration_seconds FLOAT,
    width INTEGER,
    height INTEGER,
    frame_count INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    upload_error TEXT,
    google_drive_id TEXT,
    google_drive_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`;

export const CREATE_ANALYSES_TABLE_POSTGRES = `
  CREATE TABLE IF NOT EXISTS analyses (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    analysis_type TEXT NOT NULL CHECK(analysis_type IN ('summary', 'scenes', 'search', 'custom')),
    query TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'complete', 'error')),
    result TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`;

export const CREATE_CONVERSATIONS_TABLE_POSTGRES = `
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT,
    messages TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`;

export const CREATE_VIDEO_ANALYSES_TABLE_POSTGRES = `
  CREATE TABLE IF NOT EXISTS video_analyses (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    embeddings TEXT,
    summary TEXT,
    transcript TEXT,
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`;

export const CREATE_VIDEO_TIMESTAMPS_TABLE_POSTGRES = `
  CREATE TABLE IF NOT EXISTS video_timestamps (
    id TEXT PRIMARY KEY,
    analysis_id TEXT NOT NULL,
    time REAL NOT NULL,
    description TEXT NOT NULL,
    confidence REAL NOT NULL,
    FOREIGN KEY (analysis_id) REFERENCES video_analyses(id) ON DELETE CASCADE
  );
`;

export const CREATE_TEMPORAL_INDEX_TABLE_POSTGRES = `
  CREATE TABLE IF NOT EXISTS temporal_index (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    segment_number INTEGER NOT NULL,
    start_time FLOAT NOT NULL,
    end_time FLOAT NOT NULL,
    description TEXT NOT NULL,
    entities TEXT,
    scene_type TEXT,
    confidence REAL DEFAULT 0.8,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`;

export const CREATE_INDEXING_QUEUE_TABLE_POSTGRES = `
  CREATE TABLE IF NOT EXISTS indexing_queue (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'complete', 'error')),
    progress INTEGER DEFAULT 0,
    total_segments INTEGER DEFAULT 0,
    processed_segments INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`;

export const CREATE_BOOKMARKS_TABLE_POSTGRES = `
  CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    conversation_id TEXT,
    timestamp_seconds REAL NOT NULL,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
  );
`;

export const CREATE_RATE_LIMITS_TABLE_POSTGRES = `
  CREATE TABLE IF NOT EXISTS rate_limits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    video_id TEXT NOT NULL,
    action TEXT NOT NULL DEFAULT 'chat',
    count INTEGER NOT NULL DEFAULT 0,
    reset_time TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
  );
`;

export const ALL_TABLES_POSTGRES = [
  CREATE_USERS_TABLE_POSTGRES,
  CREATE_VIDEOS_TABLE_POSTGRES,
  CREATE_VIDEO_ANALYSES_TABLE_POSTGRES,
  CREATE_VIDEO_TIMESTAMPS_TABLE_POSTGRES,
  CREATE_ANALYSES_TABLE_POSTGRES,
  CREATE_CONVERSATIONS_TABLE_POSTGRES,
  CREATE_BOOKMARKS_TABLE_POSTGRES,
  CREATE_TEMPORAL_INDEX_TABLE_POSTGRES,
  CREATE_INDEXING_QUEUE_TABLE_POSTGRES,
  CREATE_RATE_LIMITS_TABLE_POSTGRES,
  CREATE_INDEXES,
];

export const ADD_BOOKMARKS_INDEXES_POSTGRES = ADD_BOOKMARKS_INDEXES;
export const ADD_RATE_LIMITS_INDEXES_POSTGRES = ADD_RATE_LIMITS_INDEXES;
