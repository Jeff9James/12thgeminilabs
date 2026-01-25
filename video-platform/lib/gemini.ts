import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function analyzeVideoStreaming(videoFileUri: string) {
  // Use Gemini 3 Flash as per official docs
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-3-flash-preview'
  });
  
  const prompt = `Analyze this video and provide:
1. A comprehensive summary
2. Temporal breakdown of scenes with timestamps

Format as JSON:
{
  "summary": "...",
  "scenes": [
    {"start": "0:05", "end": "0:12", "label": "...", "description": "..."}
  ]
}`;

  // According to Gemini File API docs, use this structure
  const result = await model.generateContentStream([
    {
      fileData: {
        mimeType: 'video/mp4',
        fileUri: videoFileUri
      }
    },
    { text: prompt }
  ]);

  return result.stream;
}

// This function is only used in upload route (Node runtime, not Edge)
export async function uploadVideoToGemini(videoBuffer: Buffer, mimeType: string): Promise<string> {
  // Use dynamic import for Node.js modules (only available in Node runtime)
  const { GoogleAIFileManager } = await import('@google/generative-ai/server');
  const { writeFile, unlink } = await import('fs/promises');
  const path = await import('path');
  const os = await import('os');
  
  const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY!);
  const tempFilePath = path.join(os.tmpdir(), `upload-${Date.now()}.mp4`);
  
  try {
    // Write buffer to temporary file
    await writeFile(tempFilePath, videoBuffer);
    
    // Upload using the File API as per docs
    const uploadResult = await fileManager.uploadFile(tempFilePath, {
      mimeType,
      displayName: `video-${Date.now()}.mp4`
    });

    // Wait for processing (as per official docs pattern)
    let file = await fileManager.getFile(uploadResult.file.name);
    
    while (file.state === 'PROCESSING') {
      await new Promise(resolve => setTimeout(resolve, 2000));
      file = await fileManager.getFile(uploadResult.file.name);
    }

    if (file.state === 'FAILED') {
      throw new Error('Video processing failed');
    }

    // Clean up temp file
    await unlink(tempFilePath).catch(() => {}); // Ignore errors

    return file.uri;
  } catch (error) {
    // Clean up on error
    try {
      const { unlink: unlinkFn } = await import('fs/promises');
      await unlinkFn(tempFilePath).catch(() => {});
    } catch {}
    throw error;
  }
}
