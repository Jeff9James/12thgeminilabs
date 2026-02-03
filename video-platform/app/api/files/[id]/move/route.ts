import { NextRequest, NextResponse } from 'next/server';
import { getFile, saveFile } from '@/lib/kv';

// POST /api/files/[id]/move - Move a file to a folder
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { folderId } = body; // folderId can be null to move to root

        const fileMetadata = await getFile(id);
        if (!fileMetadata) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        fileMetadata.folderId = folderId || null;
        await saveFile(id, fileMetadata);

        return NextResponse.json({
            success: true,
            file: fileMetadata
        });
    } catch (error: any) {
        console.error('Move file error:', error);
        return NextResponse.json({
            error: error.message
        }, { status: 500 });
    }
}
