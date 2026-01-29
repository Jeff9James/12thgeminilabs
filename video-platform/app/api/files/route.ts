import { NextRequest, NextResponse } from 'next/server';
import { saveFile } from '@/lib/kv';
import { FileCategory } from '@/lib/fileTypes';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, title, geminiFileUri, geminiFileName, mimeType, size, category, playbackUrl, sourceUrl, sourceType } = body;

        if (!geminiFileUri) {
            return NextResponse.json({ error: 'Missing geminiFileUri' }, { status: 400 });
        }

        const fileId = id || uuidv4();

        // Save metadata to KV using the new generic file storage
        await saveFile(fileId, {
            id: fileId,
            title: title || 'Untitled File',
            fileName: title || 'Untitled File',
            geminiFileUri,
            geminiFileName,
            mimeType: mimeType || 'application/octet-stream',
            category: (category as FileCategory) || 'document',
            size: size || 0,
            playbackUrl,
            uploadedAt: new Date().toISOString(),
            userId: 'demo-user',
            status: 'ready'
        });

        return NextResponse.json({
            success: true,
            fileId
        });
    } catch (error: any) {
        console.error('Save file metadata error:', error);
        return NextResponse.json({
            error: error.message
        }, { status: 500 });
    }
}
