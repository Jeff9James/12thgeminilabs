import { NextRequest, NextResponse } from 'next/server';
import { saveVideo } from '@/lib/kv';
import { v4 as uuidv4 } from 'uuid';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// Use Node.js runtime for file operations (NOT Edge)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('video') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const videoId = uuidv4();
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Upload to Gemini File API
    const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY!);
    const tempFilePath = join(tmpdir(), `upload-${Date.now()}.mp4`);
    
    let geminiFileUri: string;
    
    try {
      // Write buffer to temporary file
      await writeFile(tempFilePath, buffer);
      
      // Upload using the File API
      const uploadResult = await fileManager.uploadFile(tempFilePath, {
        mimeType: file.type,
        displayName: `video-${Date.now()}.mp4`
      });

      // Wait for processing
      let fileInfo = await fileManager.getFile(uploadResult.file.name);
      
      while (fileInfo.state === 'PROCESSING') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        fileInfo = await fileManager.getFile(uploadResult.file.name);
      }

      if (fileInfo.state === 'FAILED') {
        throw new Error('Video processing failed');
      }

      geminiFileUri = fileInfo.uri;
      
      // Clean up temp file
      await unlink(tempFilePath).catch(() => {});
    } catch (uploadError: any) {
      // Clean up temp file on error
      await unlink(tempFilePath).catch(() => {});
      throw uploadError;
    }
    
    // Save metadata to KV
    await saveVideo(videoId, {
      id: videoId,
      title: file.name,
      geminiFileUri,
      createdAt: new Date().toISOString(),
      userId: 'demo-user', // TODO: Get from auth
      status: 'ready'
    });

    return NextResponse.json({ 
      success: true, 
      videoId,
      geminiFileUri
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
