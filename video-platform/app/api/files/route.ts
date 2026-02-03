import { NextRequest, NextResponse } from 'next/server';
import { saveFile, getFile, listFiles, deleteFile } from '@/lib/kv';
import { FileCategory } from '@/lib/fileTypes';
import { v4 as uuidv4 } from 'uuid';

// GET /api/files - List all files for the current user
export async function GET(request: NextRequest) {
    try {
        const files = await listFiles('demo-user');
        return NextResponse.json({
            success: true,
            files
        });
    } catch (error: any) {
        console.error('List files error:', error);
        return NextResponse.json({
            error: error.message
        }, { status: 500 });
    }
}

// POST /api/files - Save file metadata
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, title, geminiFileUri, geminiFileName, mimeType, size, category, playbackUrl, sourceUrl, sourceType, folderId } = body;

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
            status: 'ready' as const,
            folderId: folderId || null
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

// DELETE /api/files - Delete all files (admin only)
export async function DELETE(request: NextRequest) {
    try {
        const files = await listFiles('demo-user');
        await Promise.all(files.map(f => deleteFile(f.id)));

        return NextResponse.json({
            success: true,
            message: `Deleted ${files.length} files`
        });
    } catch (error: any) {
        console.error('Delete files error:', error);
        return NextResponse.json({
            error: error.message
        }, { status: 500 });
    }
}
