import { NextRequest, NextResponse } from 'next/server';
import { getFolder, saveFolder, deleteFolder, listFiles, saveFile } from '@/lib/kv';

// GET /api/folders/[id] - Get specific folder details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const folder = await getFolder(id);

        if (!folder) {
            return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            folder
        });
    } catch (error: any) {
        console.error('Get folder error:', error);
        return NextResponse.json({
            error: error.message
        }, { status: 500 });
    }
}

// PATCH /api/folders/[id] - Rename folder
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name } = body;

        const folder = await getFolder(id);
        if (!folder) {
            return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
        }

        folder.name = name;
        await saveFolder(id, folder);

        return NextResponse.json({
            success: true,
            folder
        });
    } catch (error: any) {
        console.error('Update folder error:', error);
        return NextResponse.json({
            error: error.message
        }, { status: 500 });
    }
}

// DELETE /api/folders/[id] - Delete folder
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Before deleting, find all files in this folder and move them to root (or delete them?)
        // Let's move them to root (folderId = null) for safety
        const allFiles = await listFiles('demo-user');
        const filesInFolder = allFiles.filter(f => f.folderId === id);

        await Promise.all(
            filesInFolder.map(f => {
                f.folderId = null;
                return saveFile(f.id, f);
            })
        );

        await deleteFolder(id);

        return NextResponse.json({
            success: true,
            message: 'Folder deleted and files moved to root'
        });
    } catch (error: any) {
        console.error('Delete folder error:', error);
        return NextResponse.json({
            error: error.message
        }, { status: 500 });
    }
}
