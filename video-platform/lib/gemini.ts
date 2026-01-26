import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function analyzeVideoStreaming(videoFileUri: string) {
  // Use Gemini 3 Flash as per official docs
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-3-flash-preview',
    generationConfig: {
      temperature: 1.0, // Keep at default as per Gemini 3 docs
    }
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

/**
 * Chat with a video using Gemini 3 Flash
 * Supports conversation history and thought signatures
 */
export async function chatWithVideo(
  videoFileUri: string,
  videoMimeType: string,
  message: string,
  history: Array<{ role: string; content: string; thoughtSignature?: string }> = []
) {
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-3-flash-preview',
    generationConfig: {
      temperature: 1.0, // Keep at default as per Gemini 3 docs
    }
  });

  // Build the initial context with the video
  const contents = [
    {
      role: 'user',
      parts: [
        {
          fileData: {
            mimeType: videoMimeType,
            fileUri: videoFileUri
          }
        },
        {
          text: `You are a helpful video analysis assistant. The user has uploaded a video and will ask questions about it. 

IMPORTANT INSTRUCTIONS:
1. Answer questions based ONLY on what you can see and hear in the video
2. When mentioning specific moments, events, or scenes, ALWAYS include timestamps in the format [MM:SS] or [HH:MM:SS]
3. Be specific and reference visual or audio details from the video
4. If you mention multiple events or moments, provide a timestamp for each one
5. Format timestamps as clickable references like: "At [2:30], you can see..." or "The event at [1:15] shows..."

Now, please answer the user's question about the video.`
        }
      ]
    }
  ];

  // Add conversation history with thought signatures
  history.forEach(msg => {
    if (msg.role === 'user') {
      contents.push({
        role: 'user',
        parts: [{ text: msg.content }]
      });
    } else {
      const parts: any[] = [{ text: msg.content }];
      if (msg.thoughtSignature) {
        parts[0].thoughtSignature = msg.thoughtSignature;
      }
      contents.push({
        role: 'model',
        parts
      });
    }
  });

  // Start chat and send message
  const chat = model.startChat({
    history: contents.slice(0, -1),
  });

  const result = await chat.sendMessage(message);
  const response = result.response;
  
  return {
    text: response.text(),
    thoughtSignature: extractThoughtSignature(response),
    timestamps: extractTimestamps(response.text())
  };
}

/**
 * Extract thought signature from response (for Gemini 3 continuity)
 */
function extractThoughtSignature(response: any): string | null {
  if (response.candidates && response.candidates[0]?.content?.parts) {
    const parts = response.candidates[0].content.parts;
    for (const part of parts) {
      if ((part as any).thoughtSignature) {
        return (part as any).thoughtSignature;
      }
    }
  }
  return null;
}

/**
 * Extract timestamps from text
 */
function extractTimestamps(text: string): string[] {
  const timestampRegex = /\[(\d{1,2}):(\d{2})\]|\[(\d{1,2}):(\d{2}):(\d{2})\]/g;
  const timestamps: string[] = [];
  let match;
  
  while ((match = timestampRegex.exec(text)) !== null) {
    timestamps.push(match[0]);
  }
  
  return [...new Set(timestamps)]; // Remove duplicates
}
