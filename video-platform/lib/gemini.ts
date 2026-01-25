import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function analyzeVideoStreaming(videoFileUri: string) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  
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

export async function uploadVideoToGemini(videoBuffer: Buffer, mimeType: string) {
  const fileManager = genAI.fileManager;
  
  // Convert buffer to Blob for upload
  const blob = new Blob([videoBuffer], { type: mimeType });
  
  const uploadResult = await fileManager.uploadFile(blob as any, {
    mimeType,
    displayName: `video-${Date.now()}.mp4`
  });

  // Wait for processing
  let file = await fileManager.getFile(uploadResult.file.name);
  while (file.state === 'PROCESSING') {
    await new Promise(resolve => setTimeout(resolve, 2000));
    file = await fileManager.getFile(uploadResult.file.name);
  }

  if (file.state === 'FAILED') {
    throw new Error('Video processing failed');
  }

  return file.uri;
}
