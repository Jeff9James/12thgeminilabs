import { NextRequest, NextResponse } from 'next/server';
import { getFile, deleteFile, getAnalysis } from '@/lib/kv';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Get file metadata from KV
        const fileMetadata = await getFile(id);
        if (!fileMetadata) {
            return NextResponse.json(
                { success: false, error: 'File not found' },
                { status: 404 }
            );
        }

        // Get analysis if exists
        const analysis = await getAnalysis(id);

        return NextResponse.json({
            success: true,
            data: {
                file: fileMetadata,
                analysis: analysis || null
            }
        });
    } catch (error: any) {
        console.error('Error fetching file:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch file' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Get file metadata first
        const fileMetadata = await getFile(id);
        if (!fileMetadata) {
            return NextResponse.json(
                { success: false, error: 'File not found' },
                { status: 404 }
            );
        }

        console.log(`Deleting file ${id}: ${fileMetadata.fileName}`);

        // 1. Delete from Gemini Files API if we have the file name
        if ((fileMetadata as any).geminiFileName) {
            try {
                const apiKey = process.env.GEMINI_API_KEY;
                if (apiKey) {
                    const geminiResponse = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/${(fileMetadata as any).geminiFileName}`,
                        {
                            method: 'DELETE',
                            headers: {
                                'x-goog-api-key': apiKey,
                            }
                        }
                    );
                    if (geminiResponse.ok) {
                        console.log(`✓ Deleted from Gemini: ${(fileMetadata as any).geminiFileName}`);
                    } else {
                        console.warn(`⚠ Failed to delete from Gemini (status ${geminiResponse.status})`);
                    }
                }
            } catch (err) {
                console.warn('Failed to delete from Gemini:', err);
            }
        }

        // 2. Delete from Vercel Blob if we have a playback URL
        if ((fileMetadata as any).playbackUrl) {
            try {
                const { del } = await import('@vercel/blob');
                await del((fileMetadata as any).playbackUrl);
                console.log(`✓ Deleted from Vercel Blob: ${(fileMetadata as any).playbackUrl}`);
            } catch (err) {
                console.warn('Failed to delete from Vercel Blob:', err);
            }
        }

        // 3. Delete analysis data from KV
        try {
            const { kv } = await import('@vercel/kv');
            await kv.del(`analysis:${id}`);
            console.log(`✓ Deleted analysis: analysis:${id}`);
        } catch (err) {
            console.warn('Failed to delete analysis:', err);
        }

        // 4. Delete chat history from KV
        try {
            const { kv } = await import('@vercel/kv');
            await kv.del(`chat:${id}`);
            console.log(`✓ Deleted chat history: chat:${id}`);
        } catch (err) {
            console.warn('Failed to delete chat history:', err);
        }

        // 5. Delete from KV (file metadata)
        await deleteFile(id);
        console.log(`✓ Deleted file metadata: file:${id}`);

        return NextResponse.json({
            success: true,
            message: 'File and all related data deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting file:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to delete file' },
            { status: 500 }
        );
    }
}
