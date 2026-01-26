import { NextRequest } from 'next/server';
import { saveVideo } from '@/lib/kv';
import { v4 as uuidv4 } from 'uuid';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// Use Node.js runtime for file operations
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send immediate response to prevent timeout
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 'Starting upload...' })}\n\n`));
        
        const formData = await request.formData();
        const file = formData.get('video') as File;
        
        if (!file) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'No file provided' })}\n\n`));
          controller.close();
          return;
        }

        const videoId = uuidv4();
        const buffer = Buffer.from(await file.arrayBuffer());
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 'Uploading to Gemini...' })}\n\n`));
        
        // Upload to Gemini
        const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY!);
        const tempFilePath = join(tmpdir(), `upload-${Date.now()}.mp4`);
        
        let geminiFileUri: string;
        
        try {
          await writeFile(tempFilePath, buffer);
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 'Processing...' })}\n\n`));
          
          const uploadResult = await fileManager.uploadFile(tempFilePath, {
            mimeType: file.type,
            displayName: file.name
          });

          // Wait for processing
          let fileInfo = await fileManager.getFile(uploadResult.file.name);
          
          let attempts = 0;
          while (fileInfo.state === 'PROCESSING' && attempts < 60) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            fileInfo = await fileManager.getFile(uploadResult.file.name);
            attempts++;
            
            if (attempts % 5 === 0) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: `Processing video... (${attempts * 2}s)` })}\n\n`));
            }
          }

          if (fileInfo.state === 'FAILED') {
            throw new Error('Video processing failed');
          }

          geminiFileUri = fileInfo.uri;
          await unlink(tempFilePath).catch(() => {});
        } catch (uploadError: any) {
          await unlink(tempFilePath).catch(() => {});
          throw uploadError;
        }
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 'Saving...' })}\n\n`));
        
        // Save metadata to KV
        await saveVideo(videoId, {
          id: videoId,
          title: file.name,
          geminiFileUri,
          createdAt: new Date().toISOString(),
          userId: 'demo-user',
          status: 'ready',
          mimeType: file.type,
          size: file.size
        });

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ success: true, videoId })}\n\n`));
        controller.close();
      } catch (error: any) {
        console.error('Upload error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
