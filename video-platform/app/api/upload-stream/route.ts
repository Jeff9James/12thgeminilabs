import { NextRequest } from 'next/server';
import { saveFile } from '@/lib/kv';
import { validateFile, formatFileSize, FileCategory, needsConversionForGemini } from '@/lib/fileTypes';
import { convertSpreadsheetBufferToCSV } from '@/lib/spreadsheetConverter';
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
        const file = formData.get('file') as File;

        if (!file) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'No file provided' })}\n\n`));
          controller.close();
          return;
        }

        // Validate file type and size
        const validation = validateFile(file);
        if (!validation.valid) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: validation.error })}\n\n`));
          controller.close();
          return;
        }

        const fileId = uuidv4();
        const category = validation.category!;
        const fileBuffer = await file.arrayBuffer();
        const fileData = Buffer.from(fileBuffer);

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: `Processing ${category} file (${formatFileSize(fileData.length)})...` })}\n\n`));

        // Upload to Vercel Blob for video, audio, and image files (for playback/preview)
        let playbackUrl: string | undefined;
        if (category === 'video' || category === 'audio' || category === 'image') {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 'Saving to cloud storage for preview...' })}\n\n`));

          const blob = await put(`files/${fileId}-${file.name}`, fileData, {
            access: 'public',
            contentType: file.type
          });

          playbackUrl = blob.url;
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 'Uploading to Gemini for analysis...' })}\n\n`));

        // Check if file needs conversion for Gemini (spreadsheets)
        let geminiFileData = fileData;
        let geminiMimeType = file.type;
        let geminiFileName = file.name;

        if (needsConversionForGemini(file.type)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 'Converting spreadsheet to CSV for Gemini...' })}\n\n`));
          
          try {
            const converted = convertSpreadsheetBufferToCSV(fileBuffer, file.name);
            geminiFileData = Buffer.from(converted.csvData);
            geminiMimeType = 'text/csv';
            geminiFileName = converted.filename;
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 'Converted to CSV successfully' })}\n\n`));
          } catch (conversionError: any) {
            console.error('Conversion error:', conversionError);
            throw new Error(`Failed to convert spreadsheet: ${conversionError.message}`);
          }
        }

        // Use Gemini REST API for resumable upload
        const apiKey = process.env.GEMINI_API_KEY!;

        // Step 1: Initialize resumable upload
        const initResponse = await fetch('https://generativelanguage.googleapis.com/upload/v1beta/files', {
          method: 'POST',
          headers: {
            'X-Goog-Upload-Protocol': 'resumable',
            'X-Goog-Upload-Command': 'start',
            'X-Goog-Upload-Header-Content-Length': geminiFileData.length.toString(),
            'X-Goog-Upload-Header-Content-Type': geminiMimeType,
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify({
            file: {
              display_name: geminiFileName
            }
          })
        });

        const uploadUrl = initResponse.headers.get('X-Goog-Upload-URL');
        if (!uploadUrl) {
          throw new Error('Failed to initialize upload');
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: `Uploading ${formatFileSize(geminiFileData.length)}...` })}\n\n`));

        // Step 2: Upload the file
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Content-Length': geminiFileData.length.toString(),
            'X-Goog-Upload-Offset': '0',
            'X-Goog-Upload-Command': 'upload, finalize'
          },
          body: geminiFileData
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.statusText}`);
        }

        const uploadResult = await uploadResponse.json();
        const geminiFileUri = uploadResult.file.name; // This is the file URI from Gemini

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 'Processing with Gemini...' })}\n\n`));

        // Step 3: Wait for processing
        let fileInfo = await fetch(`https://generativelanguage.googleapis.com/v1beta/${geminiFileUri}?key=${apiKey}`)
          .then(r => r.json());

        let attempts = 0;
        while (fileInfo.state === 'PROCESSING' && attempts < 60) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          fileInfo = await fetch(`https://generativelanguage.googleapis.com/v1beta/${geminiFileUri}?key=${apiKey}`)
            .then(r => r.json());
          attempts++;

          if (attempts % 3 === 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: `Processing... (${attempts * 3}s)` })}\n\n`));
          }
        }

        if (fileInfo.state === 'FAILED') {
          throw new Error('File processing failed');
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ progress: 'Saving metadata...' })}\n\n`));

        // Save metadata to KV using new generic file structure
        await saveFile(fileId, {
          id: fileId,
          userId: 'demo-user',
          title: file.name,
          fileName: file.name,
          mimeType: file.type,
          category: category,
          size: fileData.length,
          geminiFileUri: fileInfo.uri,
          geminiFileName: geminiFileUri,
          playbackUrl: playbackUrl,
          uploadedAt: new Date().toISOString(),
          status: 'ready'
        });

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          success: true, 
          fileId, 
          category,
          metadata: {
            id: fileId,
            title: file.name,
            category: category,
            mimeType: file.type,
            size: fileData.length,
            geminiFileUri: fileInfo.uri,
            geminiFileName: geminiFileUri,
            createdAt: new Date().toISOString(),
            sourceType: 'file-upload'
          }
        })}\n\n`));
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
