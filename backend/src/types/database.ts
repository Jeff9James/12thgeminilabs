export interface Conversation {
  id: string;
  video_id: string;
  user_id: string;
  title: string;
  messages: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Bookmark {
  id: string;
  video_id: string;
  user_id: string;
  conversation_id: string | null;
  timestamp_seconds: number;
  note: string | null;
  created_at: string;
}

export interface Video {
  id: string;
  user_id: string;
  filename: string;
  original_name: string;
  file_size: number;
  duration_seconds: number;
  mime_type: string;
  storage_path: string;
  storage_type: string;
  google_drive_id: string | null;
  google_drive_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalysisJob {
  id: string;
  video_id: string;
  user_id: string;
  type: string;
  status: string;
  progress: number;
  total_segments: number | null;
  processed_segments: number | null;
  error_message: string | null;
  result: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemporalIndexJob {
  id: string;
  video_id: string;
  user_id: string;
  status: string;
  progress: number;
  total_segments: number | null;
  processed_segments: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}
