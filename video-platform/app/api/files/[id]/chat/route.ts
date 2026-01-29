import { NextRequest } from 'next/server';
import { chatWithFile } from '@/lib/fileAnalysis';
import { getFile, getChatHistory, saveChatMessage } from '@/lib/kv';
import { getFileCategory } from '@/lib/fileTypes';

export const runtime = 'edge';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: fileId } = await params;
        const { message } = await request.json();

        if (!message) {
            return Response.json({ error: 'Message is required' }, { status: 400 });
        }

        // Get file metadata
        const file = await getFile(fileId);
        if (!file || !file.geminiFileUri) {
            return Response.json({ error: 'File not found' }, { status: 404 });
        }

        // Determine file category
        const category = file.category || getFileCategory(file.mimeType);

        // Get chat history
        const history = await getChatHistory(fileId) || [];

        // Chat with the file using type-specific context
        const response = await chatWithFile(
            file.geminiFileUri,
            file.mimeType,
            category,
            message,
            history
        );

        // Save messages to history
        await saveChatMessage(fileId, {
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        });

        await saveChatMessage(fileId, {
            role: 'assistant',
            content: response.text,
            thoughtSignature: response.thoughtSignature || undefined,
            timestamps: response.timestamps,
            timestamp: new Date().toISOString()
        });

        return Response.json({
            response: response.text,
            timestamps: response.timestamps,
            category
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
