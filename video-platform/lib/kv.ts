import { kv } from '@vercel/kv';

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

export async function saveAnalysis(videoId: string, analysis: VideoAnalysis) {
  await kv.set(`analysis:${videoId}`, analysis, { ex: 172800 }); // 48 hours
}

export async function getAnalysis(videoId: string): Promise<VideoAnalysis | null> {
  return await kv.get(`analysis:${videoId}`);
}

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

// Chat history management (optional - for future use)
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  thoughtSignature?: string;
}

export async function saveChatHistory(videoId: string, messages: ChatMessage[]) {
  await kv.set(`chat:${videoId}`, messages, { ex: 172800 }); // 48 hours
}

export async function getChatHistory(videoId: string): Promise<ChatMessage[] | null> {
  return await kv.get(`chat:${videoId}`);
}
