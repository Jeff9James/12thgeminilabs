import { NextRequest, NextResponse } from 'next/server';
import { saveVideo } from '@/lib/kv';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, geminiFileUri, geminiFileName, mimeType, size } = body;
    
    if (!geminiFileUri) {
      return NextResponse.json({ error: 'Missing geminiFileUri' }, { status: 400 });
    }

    const videoId = id || uuidv4();
    
    // Save metadata to KV
    await saveVideo(videoId, {
      id: videoId,
      title,
      geminiFileUri,
      fileUri: geminiFileUri, // For backward compatibility
      geminiFileName,
      mimeType,
      size,
      createdAt: new Date().toISOString(),
      userId: 'demo-user',
      status: 'ready'
    });

    return NextResponse.json({ 
      success: true, 
      videoId
    });
  } catch (error: any) {
    console.error('Save video metadata error:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
