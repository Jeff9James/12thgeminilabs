import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface FileData {
  uri: string;
  mimeType: string;
  filename: string;
}

interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  thoughtSignature?: string;
}

export async function POST(request: Request) {
  try {
    const { message, files, history } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    // Use Gemini 3 Flash as per official docs
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        temperature: 1.0, // Keep at default as per Gemini 3 docs
      } as any
    });

    // Build conversation contents array with thought signatures
    const contents: any[] = [];

    // First, add the system context with all files (if any)
    if (files && files.length > 0) {
      const fileParts: any[] = [];

      // Add all files to the context
      files.forEach((file: FileData) => {
        fileParts.push({
          fileData: {
            mimeType: file.mimeType,
            fileUri: file.uri,
          },
        });
      });

      // Add system instruction
      fileParts.push({
        text: `You are a helpful AI assistant with access to ${files.length} file(s) uploaded by the user:

${files.map((f: FileData, i: number) => `${i + 1}. ${f.filename} (${f.mimeType})`).join('\n')}

Your capabilities:
- Analyze and answer questions about ANY of these files
- Compare and find connections across multiple files
- Summarize content from one or all files
- Extract specific information when requested
- Provide detailed analysis of multimedia content (videos, images, audio)
- Read and interpret documents (PDFs, text files, spreadsheets)

IMPORTANT INSTRUCTIONS:
1. Always base your answers on the actual content of the files
2. When referencing specific files, mention them by name
3. For videos/audio: Include timestamps in format [MM:SS] or [HH:MM:SS] when mentioning specific moments
4. For documents: Reference specific sections or pages when available
5. Be specific and cite evidence from the files
6. If information isn't in the files, clearly state that
7. You can analyze across multiple files to find patterns or make comparisons

Now, please answer the user's questions about these files.`,
      });

      contents.push({
        role: 'user',
        parts: fileParts,
      });

      // Model acknowledges the file context
      contents.push({
        role: 'model',
        parts: [{ text: `I understand. I have access to ${files.length} file(s) and I'm ready to answer your questions about them. What would you like to know?` }],
      });
    }

    // Add conversation history with thought signatures (per Gemini 3 docs)
    if (history && Array.isArray(history) && history.length > 0) {
      history.forEach((msg: HistoryMessage) => {
        if (msg.role === 'user') {
          contents.push({
            role: 'user',
            parts: [{ text: msg.content }],
          });
        } else if (msg.role === 'assistant') {
          // Include thought signature if present (for Gemini 3 continuity)
          const parts: any[] = [{ text: msg.content }];
          if (msg.thoughtSignature) {
            parts[0].thoughtSignature = msg.thoughtSignature;
          }
          contents.push({
            role: 'model',
            parts,
          });
        }
      });
    }

    // Add the current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    // Generate response
    const result = await model.generateContent({
      contents,
    });

    const response = result.response;
    const text = response.text();

    // Extract thought signature for Gemini 3 continuity (if present)
    let thoughtSignature: string | null = null;
    if (response.candidates && response.candidates[0]?.content?.parts) {
      const parts = response.candidates[0].content.parts;
      for (const part of parts) {
        if ((part as any).thoughtSignature) {
          thoughtSignature = (part as any).thoughtSignature;
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      response: text,
      thoughtSignature,
    });

  } catch (error: any) {
    console.error('Unified chat error:', error);
    
    // Handle specific Gemini API errors
    if (error.message?.includes('API key')) {
      return NextResponse.json(
        { success: false, error: 'API key configuration error' },
        { status: 500 }
      );
    }

    if (error.message?.includes('quota')) {
      return NextResponse.json(
        { success: false, error: 'API quota exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to generate response' 
      },
      { status: 500 }
    );
  }
}
