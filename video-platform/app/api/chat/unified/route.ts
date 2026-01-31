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

    console.log('[Unified Chat] Request received:', {
      messageLength: message?.length,
      filesCount: files?.length,
      historyCount: history?.length,
    });

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('[Unified Chat] Missing GEMINI_API_KEY');
      return NextResponse.json(
        { success: false, error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Use Gemini 3 Flash as per user confirmation
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        temperature: 1.0,
      },
    });

    console.log('[Unified Chat] Model initialized: gemini-3-flash-preview');

    // Build conversation contents array with thought signatures
    const contents: any[] = [];

    // First, add the system context with all files (if any)
    if (files && files.length > 0) {
      console.log('[Unified Chat] Processing files:', files.map((f: FileData) => ({ 
        filename: f.filename, 
        mimeType: f.mimeType, 
        uri: f.uri?.substring(0, 30) + '...' 
      })));

      // Filter out unsupported MIME types
      const supportedMimeTypes = [
        // Video
        'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/x-flv',
        'video/mpg', 'video/webm', 'video/wmv', 'video/3gpp', 'video/quicktime',
        // Audio
        'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/aac', 'audio/ogg',
        'audio/flac', 'audio/webm', 'audio/x-m4a', 'audio/mp4',
        // Image
        'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic',
        'image/heif', 'image/gif',
        // Document
        'application/pdf',
        'text/plain', 'text/html', 'text/css', 'text/javascript',
        'text/x-typescript', 'text/x-python', 'application/json',
        // CSV (supported)
        'text/csv', 'application/csv',
      ];

      const supportedFiles = files.filter((file: FileData) => {
        const isSupported = supportedMimeTypes.some(mime => 
          file.mimeType.toLowerCase().includes(mime.toLowerCase())
        );
        if (!isSupported) {
          console.log(`[Unified Chat] Skipping unsupported file: ${file.filename} (${file.mimeType})`);
        }
        return isSupported;
      });

      if (supportedFiles.length === 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'No supported files selected. Excel files (.xls, .xlsx) are not supported. Please convert to CSV or select other file types.' 
          },
          { status: 400 }
        );
      }

      console.log(`[Unified Chat] Using ${supportedFiles.length}/${files.length} supported files`);

      const fileParts: any[] = [];

      // Add all supported files to the context
      supportedFiles.forEach((file: FileData, index: number) => {
        console.log(`[Unified Chat] Adding file ${index + 1}/${supportedFiles.length}: ${file.filename}`);
        fileParts.push({
          fileData: {
            mimeType: file.mimeType,
            fileUri: file.uri,
          },
        });
      });

      // Add system instruction
      fileParts.push({
        text: `You are a helpful AI assistant with access to ${supportedFiles.length} file(s) uploaded by the user:

${supportedFiles.map((f: FileData, i: number) => `${i + 1}. ${f.filename} (${f.mimeType})`).join('\n')}

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
        parts: [{ text: `I understand. I have access to ${supportedFiles.length} file(s) and I'm ready to answer your questions about them. What would you like to know?` }],
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

    console.log('[Unified Chat] Generating content with', contents.length, 'content blocks');
    console.log('[Unified Chat] Contents structure:', JSON.stringify(contents, null, 2).substring(0, 500) + '...');

    // Generate response
    let result;
    try {
      // For SDK, pass contents directly or use the correct format
      result = await model.generateContent({
        contents: contents,
        generationConfig: {
          temperature: 1.0,
        },
      });
      console.log('[Unified Chat] Response received successfully');
    } catch (genError: any) {
      console.error('[Unified Chat] Generation error:', genError);
      console.error('[Unified Chat] Generation error full:', JSON.stringify(genError, null, 2));
      throw new Error(`Gemini API error: ${genError.message || JSON.stringify(genError)}`);
    }

    const response = result.response;
    const text = response.text();

    console.log('[Unified Chat] Response text extracted, length:', text.length);

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
    console.error('[Unified Chat] Error:', error);
    console.error('[Unified Chat] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    
    // Handle specific Gemini API errors
    if (error.message?.includes('API key') || error.message?.includes('API_KEY')) {
      return NextResponse.json(
        { success: false, error: 'API key configuration error. Please check your .env.local file.' },
        { status: 500 }
      );
    }

    if (error.message?.includes('quota') || error.message?.includes('429')) {
      return NextResponse.json(
        { success: false, error: 'API quota exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    if (error.message?.includes('not found') || error.message?.includes('404')) {
      return NextResponse.json(
        { success: false, error: 'Model not found. The AI model may not be available.' },
        { status: 500 }
      );
    }

    // Return detailed error in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `${error.message}\n\nStack: ${error.stack}`
      : error.message || 'Failed to generate response';

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}
