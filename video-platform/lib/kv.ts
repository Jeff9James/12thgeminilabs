import { kv } from '@vercel/kv';
import { FileCategory } from './fileTypes';

// Generic file metadata interface (replaces video-specific)
export interface FileMetadata {
  id: string;
  userId: string;
  title: string;
  fileName: string;
  mimeType: string;
  category: FileCategory;
  size: number;
  geminiFileUri?: string;
  geminiFileName?: string;
  playbackUrl?: string; // For video/audio files stored in blob storage
  uploadedAt: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
}

// Analysis interface updated to support all file types
export interface FileAnalysis {
  fileId: string;
  category: FileCategory;
  summary: string;
  // Video-specific fields (optional)
  scenes?: Array<{
    start: string;
    end: string;
    label: string;
    description: string;
  }>;
  // Image-specific fields (optional)
  objects?: string[];
  textContent?: string; // OCR results for images/PDFs
  // Audio-specific fields (optional)
  transcription?: string;
  // Document-specific fields (optional)
  keyPoints?: string[];
  entities?: string[];
  createdAt: string;
}

// Legacy VideoAnalysis for backward compatibility
export interface VideoAnalysis {
  videoId: string;
  summary: string;
  scenes: Array<{
    start: string;
    end: string;
    label: string;
    description: string;
  }>;
  createdAt: string;
}

// Generic file operations
export async function saveFile(fileId: string, metadata: FileMetadata) {
  await kv.set(`file:${fileId}`, metadata);
}

export async function getFile(fileId: string): Promise<FileMetadata | null> {
  return await kv.get(`file:${fileId}`);
}

export async function listFiles(userId: string): Promise<FileMetadata[]> {
  const keys = await kv.keys(`file:*`);
  const files = await Promise.all(
    keys.map(key => kv.get(key))
  );
  return files.filter(f => f && (f as FileMetadata).userId === userId) as FileMetadata[];
}

export async function deleteFile(fileId: string) {
  await kv.del(`file:${fileId}`);
}

// Analysis operations (generic)
export async function saveAnalysis(fileId: string, analysis: FileAnalysis | VideoAnalysis) {
  await kv.set(`analysis:${fileId}`, analysis, { ex: 172800 }); // 48 hours
}

export async function getAnalysis(fileId: string): Promise<FileAnalysis | VideoAnalysis | null> {
  return await kv.get(`analysis:${fileId}`);
}

// Legacy video operations (for backward compatibility during migration)
export async function saveVideo(videoId: string, metadata: any) {
  await kv.set(`video:${videoId}`, metadata);
}

export async function getVideo(videoId: string) {
  return await kv.get(`video:${videoId}`);
}

export async function listVideos(userId: string) {
  const keys = await kv.keys(`video:*`);
  const videos = await Promise.all(
    keys.map(key => kv.get(key))
  );
  return videos.filter(v => v && (v as any).userId === userId);
}

// Chat history management (updated for generic files)
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  thoughtSignature?: string;
  timestamps?: string[]; // For video/audio files
}

export async function saveChatHistory(fileId: string, messages: ChatMessage[]) {
  await kv.set(`chat:${fileId}`, messages, { ex: 172800 }); // 48 hours
}

export async function getChatHistory(fileId: string): Promise<ChatMessage[] | null> {
  return await kv.get(`chat:${fileId}`);
}

// Append a single chat message to history
export async function saveChatMessage(fileId: string, message: ChatMessage) {
  const history = await getChatHistory(fileId) || [];
  history.push(message);
  await saveChatHistory(fileId, history);
}

// Search cache management
export interface SearchCache {
  query: string;
  results: any[];
  timestamp: string;
}

export async function saveSearchResults(cacheKey: string, results: any[]) {
  await kv.set(`search:${cacheKey}`, {
    results,
    timestamp: new Date().toISOString()
  }, { ex: 3600 }); // Cache for 1 hour
}

export async function getSearchResults(cacheKey: string): Promise<any[] | null> {
  const cached = await kv.get<SearchCache>(`search:${cacheKey}`);
  return cached ? cached.results : null;
}
