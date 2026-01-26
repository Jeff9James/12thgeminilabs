import { NextRequest } from 'next/server';
import { saveVideo } from '@/lib/kv';
import { v4 as uuidv4 } from 'uuid';
import { put } from '@vercel/blob';

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
        const fileBuffer = await file.arrayBuffer();
        const fileData = Buffer.from(fileBuffer);
        
        // Upload to Vercel Blob for playback
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 'Saving video for playback...' })}\n\n`));
        
        const blob = await put(`videos/${videoId}-${file.name}`, fileData, {
          access: 'public',
          contentType: file.type
        });
        
        const playbackUrl = blob.url;
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 'Uploading to Gemini for analysis...' })}\n\n`));
        
        // Use Gemini REST API for resumable upload
        const apiKey = process.env.GEMINI_API_KEY!;
        
        // Step 1: Initialize resumable upload
        const initResponse = await fetch('https://generativelanguage.googleapis.com/upload/v1beta/files', {
          method: 'POST',
          headers: {
            'X-Goog-Upload-Protocol': 'resumable',
            'X-Goog-Upload-Command': 'start',
            'X-Goog-Upload-Header-Content-Length': fileData.length.toString(),
            'X-Goog-Upload-Header-Content-Type': file.type,
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify({
            file: {
              display_name: file.name
            }
          })
        });
        
        const uploadUrl = initResponse.headers.get('X-Goog-Upload-URL');
        if (!uploadUrl) {
          throw new Error('Failed to initialize upload');
        }
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: `Uploading ${Math.round(fileData.length / 1024 / 1024)}MB...` })}\n\n`));
        
        // Step 2: Upload the file
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Content-Length': fileData.length.toString(),
            'X-Goog-Upload-Offset': '0',
            'X-Goog-Upload-Command': 'upload, finalize'
          },
          body: fileData
        });
        
        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.statusText}`);
        }
        
        const uploadResult = await uploadResponse.json();
        const fileName = uploadResult.file.name;
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 'Processing video...' })}\n\n`));
        
        // Step 3: Wait for processing
        let fileInfo = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`)
          .then(r => r.json());
        
        let attempts = 0;
        while (fileInfo.state === 'PROCESSING' && attempts < 60) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          fileInfo = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`)
            .then(r => r.json());
          attempts++;
          
          if (attempts % 3 === 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: `Processing... (${attempts * 3}s)` })}\n\n`));
          }
        }
        
        if (fileInfo.state === 'FAILED') {
          throw new Error('Video processing failed');
        }
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 'Saving metadata...' })}\n\n`));
        
        // Save metadata to KV
        await saveVideo(videoId, {
          id: videoId,
          title: file.name,
          geminiFileUri: fileInfo.uri,
          geminiFileName: fileName,
          playbackUrl: playbackUrl, // Add playback URL
          createdAt: new Date().toISOString(),
          userId: 'demo-user',
          status: 'ready',
          mimeType: file.type,
          size: fileData.length
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
