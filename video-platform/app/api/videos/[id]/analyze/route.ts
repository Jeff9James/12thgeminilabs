import { NextRequest } from 'next/server';
import { analyzeVideoStreaming } from '@/lib/gemini';
import { getVideo, saveAnalysis } from '@/lib/kv';

export const runtime = 'edge'; // Enable streaming

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: videoId } = await params;
  
  const readable = new ReadableStream({
    async start(controller) {
      try {
        // Send initial message immediately to prevent timeout
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify({ status: 'starting' })}\n\n`)
        );
        
        // Get video metadata
        const video = await getVideo(videoId);
        if (!video || !(video as any).geminiFileUri) {
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ error: 'Video not found' })}\n\n`)
          );
          controller.close();
          return;
        }
        
        // Send processing message
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify({ status: 'processing' })}\n\n`)
        );
        
        // Start analysis
        const stream = await analyzeVideoStreaming((video as any).geminiFileUri);
        let fullResponse = '';
        
        // Stream results
        for await (const chunk of stream) {
          const text = chunk.text();
          fullResponse += text;
          
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`)
          );
        }
        
        // Save complete analysis
        try {
          const parsed = JSON.parse(fullResponse);
          await saveAnalysis(videoId, {
            videoId,
            ...parsed,
            createdAt: new Date().toISOString()
          });
        } catch (e) {
          console.error('Failed to parse analysis:', e);
        }
        
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify({ done: true })}\n\n`)
        );
        controller.close();
      } catch (error: any) {
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify({ error: error.message })}\n\n`)
        );
        controller.close();
      }
    }
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
