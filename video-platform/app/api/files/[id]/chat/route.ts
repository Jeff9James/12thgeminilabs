import { NextRequest } from 'next/server';
import { chatWithFile } from '@/lib/fileAnalysis';
import { getFile, getChatHistory, saveChatMessage } from '@/lib/kv';
import { getFileCategory } from '@/lib/fileTypes';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout for chat

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: fileId } = await params;
        const { message, useMetadata = true } = await request.json();

        if (!message) {
            return Response.json({ error: 'Message is required' }, { status: 400 });
        }

        // Get file metadata
        const file = await getFile(fileId);
        if (!file) {
            return Response.json({ error: 'File not found' }, { status: 404 });
        }

        // Determine file category
        const category = file.category || getFileCategory(file.mimeType);

        // Get chat history
        const history = await getChatHistory(fileId) || [];

        let responseText: string;
        let timestamps: string[] = [];
        let thoughtSignature: string | undefined;

        // If useMetadata is true AND analysis exists, use metadata-only chat (faster, cheaper)
        if (useMetadata && file.analysis) {
            // Use Gemini chat with just the metadata context (no file)
            const { GoogleGenerativeAI } = require('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
            const model = genAI.getGenerativeModel({
                model: 'gemini-3-flash-preview',
                generationConfig: {
                    temperature: 1.0,
                    thinkingConfig: {
                        thinkingLevel: 'low'
                    }
                }
            });

            // Build context from metadata
            const metadataContext = `File Information:
- Name: ${file.fileName}
- Type: ${category}
- Summary: ${file.analysis.summary || 'Not available'}
${file.analysis.keyPoints ? `\n- Key Points:\n${file.analysis.keyPoints.map((p: string) => `  • ${p}`).join('\n')}` : ''}
${file.analysis.transcription ? `\n- Transcription: ${file.analysis.transcription}` : ''}
${file.analysis.scenes ? `\n- Scenes:\n${file.analysis.scenes.map((s: any) => `  [${s.start}-${s.end}] ${s.label}: ${s.description}`).join('\n')}` : ''}
${file.analysis.objects ? `\n- Objects detected: ${file.analysis.objects.join(', ')}` : ''}
${file.analysis.textContent ? `\n- Extracted text: ${file.analysis.textContent}` : ''}

Note: You are chatting based on the file's analysis metadata. If the user needs more detailed information, suggest they enable "Detailed Mode" to access the full file.`;

            // Build conversation for context
            const contents: any[] = [];
            
            // Add history
            history.forEach((msg: any) => {
                if (msg.role === 'user') {
                    contents.push({
                        role: 'user',
                        parts: [{ text: msg.content }]
                    });
                } else {
                    contents.push({
                        role: 'model',
                        parts: [{ text: msg.content }]
                    });
                }
            });

            // Start chat
            const chat = model.startChat({
                history: contents.length > 0 ? contents : [{
                    role: 'user',
                    parts: [{ text: metadataContext }]
                }, {
                    role: 'model',
                    parts: [{ text: 'I understand. I will answer questions based on the file metadata provided.' }]
                }]
            });

            // Send message
            const result = await chat.sendMessage(
                contents.length === 0 
                    ? `${metadataContext}\n\nUser question: ${message}`
                    : message
            );

            responseText = result.response.text();
            
            // Extract timestamps if video/audio
            if (category === 'video' || category === 'audio') {
                const timestampRegex = /\[(\d{1,2}):(\d{2})\]|\[(\d{1,2}):(\d{2}):(\d{2})\]/g;
                let match;
                while ((match = timestampRegex.exec(responseText)) !== null) {
                    timestamps.push(match[0]);
                }
                timestamps = [...new Set(timestamps)];
            }
        } else {
            // Use full file chat (detailed mode)
            if (!file.geminiFileUri) {
                return Response.json({ 
                    error: 'File not uploaded to Gemini. Please upload the file first or use metadata mode.' 
                }, { status: 404 });
            }

            try {
                const response = await chatWithFile(
                    file.geminiFileUri,
                    file.mimeType,
                    category,
                    message,
                    history
                );

                responseText = response.text;
                timestamps = response.timestamps || [];
                thoughtSignature = response.thoughtSignature || undefined;
            } catch (chatError: any) {
                // If 403 error (file no longer accessible), suggest Quick Mode
                if (chatError.status === 403 || chatError.message?.includes('403') || chatError.message?.includes('Forbidden')) {
                    if (file.analysis) {
                        return Response.json({
                            error: 'This file is no longer accessible in Gemini File API. Please use Quick Mode to chat based on saved analysis metadata.',
                            suggestion: 'Switch to Quick Mode (⚡) to continue chatting with this file.'
                        }, { status: 403 });
                    } else {
                        return Response.json({
                            error: 'This file is no longer accessible and has no saved analysis. Please re-upload and analyze the file.',
                        }, { status: 404 });
                    }
                }
                throw chatError;
            }
        }

        // Save messages to history
        await saveChatMessage(fileId, {
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        });

        await saveChatMessage(fileId, {
            role: 'assistant',
            content: responseText,
            thoughtSignature,
            timestamps,
            timestamp: new Date().toISOString()
        });

        return Response.json({
            response: responseText,
            timestamps,
            category,
            usedMetadata: useMetadata && !!file.analysis
        });
    } catch (error: any) {
        console.error('Chat error:', error);
        return Response.json(
            { error: error.message || 'Failed to process chat message' },
            { status: 500 }
        );
    }
}

// Get chat history for a file
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: fileId } = await params;

        const history = await getChatHistory(fileId);

        return Response.json({ history });
    } catch (error: any) {
        console.error('Get chat history error:', error);
        return Response.json(
            { error: error.message || 'Failed to get chat history' },
            { status: 500 }
        );
    }
}
