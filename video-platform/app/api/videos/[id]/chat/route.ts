import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getVideo } from '@/lib/kv';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Parse message history and extract thought signatures
function processHistory(history: any[]) {
  return history.map(msg => {
    if (msg.role === 'user') {
      return {
        role: 'user',
        parts: [{ text: msg.content }]
      };
    } else {
      // For model responses, preserve thought signatures if they exist
      const parts = [{ text: msg.content }];
      if (msg.thoughtSignature) {
        (parts[0] as any).thoughtSignature = msg.thoughtSignature;
      }
      return {
        role: 'model',
        parts
      };
    }
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { message, history = [] } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get video metadata to retrieve the file URI
    const video = await getVideo(id);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const videoFileUri = (video as any).fileUri;
    if (!videoFileUri) {
      return NextResponse.json({ error: 'Video file URI not found' }, { status: 400 });
    }

    // Use Gemini 3 Flash model as specified
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3-flash-preview',
      generationConfig: {
        temperature: 1.0, // Keep at default as per Gemini 3 docs
      }
    });

    // Build the conversation history
    const contents = [
      {
        role: 'user',
        parts: [
          {
            fileData: {
              mimeType: (video as any).mimeType || 'video/mp4',
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

Examples of good responses:
- "At [0:45], the person enters the room wearing a blue shirt."
- "The main topic is introduced at [1:20], followed by examples at [2:15] and [3:40]."
- "You can see three key moments: [0:30] introduction, [1:45] demonstration, and [3:10] conclusion."

Now, please answer the user's question about the video.`
          }
        ]
      }
    ];

    // Add conversation history if provided
    if (history.length > 0) {
      const processedHistory = processHistory(history);
      contents.push(...processedHistory);
    }

    // Add the current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    // Start chat session and get response
    const chat = model.startChat({
      history: contents.slice(0, -1),
      generationConfig: {
        temperature: 1.0,
      }
    });

    const result = await chat.sendMessage(message);
    const response = result.response;
    const text = response.text();

    // Extract thought signature if present (for future requests)
    let thoughtSignature = null;
    if (response.candidates && response.candidates[0]?.content?.parts) {
      const parts = response.candidates[0].content.parts;
      for (const part of parts) {
        if ((part as any).thoughtSignature) {
          thoughtSignature = (part as any).thoughtSignature;
          break;
        }
      }
    }

    // Extract timestamps from the response using regex
    // Look for patterns like [0:30], [1:45], [12:30], etc.
    const timestampRegex = /\[(\d{1,2}):(\d{2})\]|\[(\d{1,2}):(\d{2}):(\d{2})\]/g;
    const timestamps: string[] = [];
    let match;
    
    while ((match = timestampRegex.exec(text)) !== null) {
      timestamps.push(match[0]);
    }

    return NextResponse.json({
      success: true,
      data: {
        response: text,
        timestamps: [...new Set(timestamps)], // Remove duplicates
        thoughtSignature
      }
    });

  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chat message' }, 
      { status: 500 }
    );
  }
}
