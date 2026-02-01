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

    // Filter out unsupported files
    const supportedMimeTypes = [
      'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/webm',
      'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/aac', 'audio/ogg',
      'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif',
      'application/pdf', 'text/plain', 'text/csv', 'application/csv',
    ];

    let relevantFiles = files || [];
    
    if (relevantFiles.length > 0) {
      relevantFiles = relevantFiles.filter((file: FileData) => {
        const fileMimeType = (file.mimeType || '').toLowerCase();
        
        // Reject Excel files
        if (fileMimeType.includes('excel') || fileMimeType.includes('spreadsheet')) {
          return false;
        }
        
        return supportedMimeTypes.some(mime => fileMimeType.includes(mime.toLowerCase()));
      });

      console.log(`[Unified Chat] Using ${relevantFiles.length}/${files.length} supported files`);
    }

    // FAST PATH: Use parallel search approach for multi-file queries
    if (relevantFiles.length > 1) {
      console.log('[Unified Chat] Using FAST parallel search mode for', relevantFiles.length, 'files');
      
      // Build conversation context for better follow-up support
      let conversationContext = '';
      if (history && Array.isArray(history) && history.length > 0) {
        conversationContext = '\n\nPrevious conversation:\n' + 
          history.slice(-4).map((msg: HistoryMessage) => 
            `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
          ).join('\n');
      }
      
      // Step 1: Query each file in PARALLEL with minimal thinking
      const fileQueryPromises = relevantFiles.map(async (file: FileData) => {
        try {
          const model = genAI.getGenerativeModel({
            model: 'gemini-3-flash-preview',
            generationConfig: {
              temperature: 1.0,
              responseMimeType: 'application/json',
            },
          });

          // Fast, focused query for this specific file (with context for follow-ups)
          const quickPrompt = `Based on this file, answer: "${message}"${conversationContext}

Return JSON:
{
  "hasRelevantInfo": true/false,
  "answer": "1-2 sentence answer if relevant, or empty string",
  "confidence": 0-100
}`;

          const result = await model.generateContent([
            {
              fileData: {
                mimeType: file.mimeType,
                fileUri: file.uri,
              }
            },
            { text: quickPrompt }
          ]);

          const response = JSON.parse(result.response.text());
          
          return {
            filename: file.filename,
            ...response
          };
        } catch (error) {
          console.error(`[Unified Chat] Error querying ${file.filename}:`, error);
          return { filename: file.filename, hasRelevantInfo: false, answer: '', confidence: 0 };
        }
      });

      // Wait for all parallel queries
      const fileResults = await Promise.all(fileQueryPromises);
      
      console.log('[Unified Chat] Parallel queries complete');

      // Filter to relevant files only
      const relevantResults = fileResults
        .filter(r => r.hasRelevantInfo && r.confidence > 30)
        .sort((a, b) => b.confidence - a.confidence);

      if (relevantResults.length === 0) {
        return NextResponse.json({
          success: true,
          response: "I couldn't find relevant information about that in your files. Could you rephrase your question or ask about something else?",
          thoughtSignature: null,
        });
      }

      // Step 2: Synthesize final answer from relevant results (with conversation history)
      const synthesisModel = genAI.getGenerativeModel({
        model: 'gemini-3-flash-preview',
        generationConfig: {
          temperature: 1.0,
        },
      });

      let synthesisPrompt = '';
      
      // Include conversation history for context
      if (history && Array.isArray(history) && history.length > 0) {
        synthesisPrompt += 'Previous conversation:\n';
        synthesisPrompt += history.slice(-4).map((msg: HistoryMessage) => 
          `${msg.role === 'user' ? 'User' : 'You'}: ${msg.content}`
        ).join('\n\n');
        synthesisPrompt += '\n\n---\n\n';
      }
      
      synthesisPrompt += `Current question: "${message}"

I found relevant information from ${relevantResults.length} file(s):

${relevantResults.map((r, i) => `${i + 1}. ${r.filename}: ${r.answer}`).join('\n\n')}

Synthesize a comprehensive answer that:
- Takes into account the conversation history above
- Combines information from all sources
- Mentions which files contain what information
- Is clear and well-organized
- Cites sources by filename
- If this is a follow-up question, reference previous context

Answer:`;

      const finalResult = await synthesisModel.generateContent(synthesisPrompt);
      const finalAnswer = finalResult.response.text();

      console.log('[Unified Chat] Fast mode complete, answer length:', finalAnswer.length);

      return NextResponse.json({
        success: true,
        response: finalAnswer,
        thoughtSignature: null,
      });
    }

    // STANDARD PATH: Single file or no files - use normal chat
    console.log('[Unified Chat] Using standard mode');

    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        temperature: 1.0,
      },
    });

    const contents: any[] = [];

    // Add file context if present
    if (relevantFiles.length > 0) {
      const fileParts: any[] = [];

      relevantFiles.forEach((file: FileData) => {
        fileParts.push({
          fileData: {
            mimeType: file.mimeType,
            fileUri: file.uri,
          },
        });
      });

      fileParts.push({
        text: `You are a helpful AI assistant. Answer the user's question about ${relevantFiles.length === 1 ? 'this file' : 'these files'}.`
      });

      contents.push({
        role: 'user',
        parts: fileParts,
      });

      contents.push({
        role: 'model',
        parts: [{ text: `I understand. I'm ready to answer your questions.` }],
      });
    }

    // Add conversation history
    if (history && Array.isArray(history) && history.length > 0) {
      history.forEach((msg: HistoryMessage) => {
        if (msg.role === 'user') {
          contents.push({
            role: 'user',
            parts: [{ text: msg.content }],
          });
        } else if (msg.role === 'assistant') {
          contents.push({
            role: 'model',
            parts: [{ text: msg.content }],
          });
        }
      });
    }

    // Add current message
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    console.log('[Unified Chat] Generating response...');

    const result = await model.generateContent({
      contents,
      generationConfig: {
        temperature: 1.0,
      },
    });

    const response = result.response;
    const text = response.text();

    console.log('[Unified Chat] Response received, length:', text.length);

    return NextResponse.json({
      success: true,
      response: text,
      thoughtSignature: null,
    });

  } catch (error: any) {
    console.error('[Unified Chat] Error:', error);
    console.error('[Unified Chat] Error details:', {
      message: error.message,
      stack: error.stack?.substring(0, 500),
    });
    
    // Handle specific errors
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

    if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'File access error: One or more files have expired (files are kept for 48 hours). Please re-upload files and try again.' 
        },
        { status: 403 }
      );
    }

    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `${error.message}\n\n${error.stack?.substring(0, 500)}`
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
