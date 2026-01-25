import { NextRequest, NextResponse } from 'next/server';
import { uploadVideoToGemini } from '@/lib/gemini';
import { saveVideo } from '@/lib/kv';
import { v4 as uuidv4 } from 'uuid';

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
    const geminiFileUri = await uploadVideoToGemini(buffer, file.type);
    
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
