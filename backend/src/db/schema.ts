// Database schema SQL statements
export const CREATE_USERS_TABLE = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    google_id TEXT UNIQUE NOT NULL,
    picture_url TEXT,
    quota_used INTEGER DEFAULT 0,
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
    path TEXT NOT NULL,
    size INTEGER NOT NULL,
    duration INTEGER,
    status TEXT NOT NULL DEFAULT 'uploading',
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

export const CREATE_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
  CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
  CREATE INDEX IF NOT EXISTS idx_video_analyses_video_id ON video_analyses(video_id);
  CREATE INDEX IF NOT EXISTS idx_video_timestamps_analysis_id ON video_timestamps(analysis_id);
`;

export const ALL_TABLES = [
  CREATE_USERS_TABLE,
  CREATE_VIDEOS_TABLE,
  CREATE_VIDEO_ANALYSES_TABLE,
  CREATE_VIDEO_TIMESTAMPS_TABLE,
  CREATE_INDEXES,
];
