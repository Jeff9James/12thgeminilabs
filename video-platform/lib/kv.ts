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
  folderId?: string | null;
  // Auto-saved analysis as metadata to reduce AI token costs
  analysis?: {
    summary: string;
    keyPoints?: string[];
    scenes?: Array<{ start: string; end: string; label: string; description: string }>;
    transcription?: string;
    objects?: string[];
    colors?: string[];
    textContent?: string;
    createdAt: string;
    [key: string]: any; // Allow category-specific fields
  };
}

export interface FolderMetadata {
  id: string;
  name: string;
  userId: string;
  parentId: string | null;
  createdAt: string;
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
  colors?: string[];
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
  // Also clean up related data
  await kv.del(`analysis:${fileId}`);
  await kv.del(`chat:${fileId}`);
}

// Folder operations
export async function saveFolder(folderId: string, metadata: FolderMetadata) {
  await kv.set(`folder:${folderId}`, metadata);
}

export async function getFolder(folderId: string): Promise<FolderMetadata | null> {
  return await kv.get(`folder:${folderId}`);
}

export async function listFolders(userId: string): Promise<FolderMetadata[]> {
  const keys = await kv.keys(`folder:*`);
  const folders = await Promise.all(
    keys.map(key => kv.get(key))
  );
  return folders.filter(f => f && (f as FolderMetadata).userId === userId) as FolderMetadata[];
}

export async function deleteFolder(folderId: string) {
  await kv.del(`folder:${folderId}`);

  // Note: Recursive delete or moving files to root should be handled in the API layer
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
