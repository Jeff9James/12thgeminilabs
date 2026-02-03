import { NextRequest, NextResponse } from 'next/server';
import { saveFolder, listFolders } from '@/lib/kv';
import { v4 as uuidv4 } from 'uuid';

// GET /api/folders - List all folders for the current user
export async function GET(request: NextRequest) {
    try {
        const folders = await listFolders('demo-user');
        return NextResponse.json({
            success: true,
            folders
        });
    } catch (error: any) {
        console.error('List folders error:', error);
        return NextResponse.json({
            error: error.message
        }, { status: 500 });
    }
}

// POST /api/folders - Create a new folder
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, parentId } = body;

        if (!name) {
            return NextResponse.json({ error: 'Missing folder name' }, { status: 400 });
        }

        const folderId = uuidv4();

        const folderMetadata = {
            id: folderId,
            name,
            userId: 'demo-user',
            parentId: parentId || null,
            createdAt: new Date().toISOString()
        };

        await saveFolder(folderId, folderMetadata);

        return NextResponse.json({
            success: true,
            folder: folderMetadata
        });
    } catch (error: any) {
        console.error('Create folder error:', error);
        return NextResponse.json({
            error: error.message
        }, { status: 500 });
    }
}
