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
