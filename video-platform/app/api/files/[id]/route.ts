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

        // Delete from Gemini if we have the file name
        if ((fileMetadata as any).geminiFileName) {
            try {
                const apiKey = process.env.GEMINI_API_KEY;
                if (apiKey) {
                    await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/${(fileMetadata as any).geminiFileName}`,
                        {
                            method: 'DELETE',
                            headers: {
                                'x-goog-api-key': apiKey,
                            }
                        }
                    );
                }
            } catch (err) {
                console.warn('Failed to delete from Gemini:', err);
            }
        }

        // Delete from KV
        await deleteFile(id);

        return NextResponse.json({
            success: true,
            message: 'File deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting file:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to delete file' },
            { status: 500 }
        );
    }
}
