import { NextRequest } from 'next/server';
import { analyzeVideoStreaming } from '@/lib/gemini';
import { getVideo, saveAnalysis } from '@/lib/kv';

export const runtime = 'edge'; // Enable streaming

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: videoId } = await params;
  
  try {
    const video = await getVideo(videoId);
    if (!video || !(video as any).geminiFileUri) {
      return new Response('Video not found', { status: 404 });
    }

    const stream = await analyzeVideoStreaming((video as any).geminiFileUri);
    
    let fullResponse = '';
    
    const readable = new ReadableStream({
      async start(controller) {
        try {
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
  } catch (error: any) {
    return new Response(error.message, { status: 500 });
  }
}
