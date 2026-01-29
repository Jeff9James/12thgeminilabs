import { NextRequest } from 'next/server';
import { analyzeFileStreaming } from '@/lib/fileAnalysis';
import { getFile, saveAnalysis } from '@/lib/kv';
import { getFileCategory } from '@/lib/fileTypes';

export const runtime = 'edge'; // Enable streaming

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: fileId } = await params;

    const readable = new ReadableStream({
        async start(controller) {
            try {
                // Send initial message immediately to prevent timeout
                controller.enqueue(
                    new TextEncoder().encode('data: ' + JSON.stringify({ status: 'starting' }) + '\n\n')
                );

                // Get file metadata
                const file = await getFile(fileId);
                if (!file || !file.geminiFileUri) {
                    controller.enqueue(
                        new TextEncoder().encode('data: ' + JSON.stringify({ error: 'File not found' }) + '\n\n')
                    );
                    controller.close();
                    return;
                }

                // Determine file category
                const category = file.category || getFileCategory(file.mimeType);

                // Send processing message
                controller.enqueue(
                    new TextEncoder().encode('data: ' + JSON.stringify({ status: 'processing', category }) + '\n\n')
                );

                // Start analysis with appropriate prompt for file type
                const stream = await analyzeFileStreaming(
                    file.geminiFileUri,
                    file.mimeType,
                    category
                );

                let fullResponse = '';

                // Stream results
                for await (const chunk of stream) {
                    const text = chunk.text();
                    fullResponse += text;

                    controller.enqueue(
                        new TextEncoder().encode('data: ' + JSON.stringify({ text }) + '\n\n')
                    );
                }

                // Save complete analysis
                try {
                    const parsed = JSON.parse(fullResponse);
                    await saveAnalysis(fileId, {
                        fileId,
                        category,
                        ...parsed,
                        createdAt: new Date().toISOString()
                    });
                } catch (e) {
                    console.error('Failed to parse analysis:', e);
                    // Save raw response if JSON parsing fails
                    await saveAnalysis(fileId, {
                        fileId,
                        category,
                        summary: fullResponse,
                        keyPoints: [],
                        createdAt: new Date().toISOString()
                    });
                }

                controller.enqueue(
                    new TextEncoder().encode('data: ' + JSON.stringify({ done: true }) + '\n\n')
                );
                controller.close();
            } catch (error: any) {
                console.error('Analysis error:', error);
                controller.enqueue(
                    new TextEncoder().encode('data: ' + JSON.stringify({ error: error.message }) + '\n\n')
                );
                controller.close();
            }
        }
    });

    return new Response(readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
}
