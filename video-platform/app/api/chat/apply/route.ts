import { NextRequest, NextResponse } from 'next/server';
import {
    saveFile, getFile, deleteFile,
    saveFolder, getFolder, deleteFolder,
    listFolders, listFiles
} from '@/lib/kv';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    try {
        const { actions } = await request.json();

        if (!actions || !Array.isArray(actions)) {
            return NextResponse.json({ error: 'Actions array is required' }, { status: 400 });
        }

        const userId = 'demo-user';
        const results = [];
        const virtualIdMap: Record<string, string> = {};

        // Pass 1: Handle folder creations to map virtual IDs
        for (const action of actions) {
            if (action.toolName === 'create_folder') {
                try {
                    const folderId = uuidv4();
                    const folder = {
                        id: folderId,
                        name: action.args.name,
                        userId,
                        parentId: action.args.parentId || null,
                        createdAt: new Date().toISOString()
                    };
                    await saveFolder(folderId, folder);
                    virtualIdMap[`virtual-folder:${action.args.name}`] = folderId;
                    results.push({ action, success: true, id: folderId });
                } catch (err: any) {
                    results.push({ action, success: false, error: err.message });
                }
            }
        }

        // Pass 2: Handle other actions
        for (const action of actions) {
            const { toolName, args } = action;
            if (toolName === 'create_folder') continue; // Already handled

            try {
                switch (toolName) {
                    case 'rename_item': {
                        let targetId = args.id;
                        if (targetId.startsWith('virtual-folder:')) {
                            targetId = virtualIdMap[targetId] || targetId;
                        }

                        if (args.type === 'folder') {
                            const folder = await getFolder(targetId);
                            if (folder) {
                                folder.name = args.newName;
                                await saveFolder(targetId, folder);
                            }
                        } else {
                            const file = await getFile(targetId);
                            if (file) {
                                file.title = args.newName;
                                file.fileName = args.newName;
                                await saveFile(targetId, file);
                            }
                        }
                        results.push({ action, success: true });
                        break;
                    }

                    case 'move_item': {
                        let targetFolderId = args.folderId;
                        if (targetFolderId && targetFolderId.startsWith('virtual-folder:')) {
                            targetFolderId = virtualIdMap[targetFolderId] || targetFolderId;
                        }

                        const file = await getFile(args.fileId);
                        if (file) {
                            file.folderId = targetFolderId || null;
                            await saveFile(args.fileId, file);
                        }
                        results.push({ action, success: true });
                        break;
                    }

                    case 'delete_item': {
                        if (args.type === 'folder') {
                            // Move files to root before deleting folder
                            const files = await listFiles(userId);
                            const folderFiles = files.filter(f => f.folderId === args.id);
                            await Promise.all(folderFiles.map(async f => {
                                f.folderId = null;
                                return saveFile(f.id, f);
                            }));
                            await deleteFolder(args.id);
                        } else {
                            await deleteFile(args.id);
                        }
                        results.push({ action, success: true });
                        break;
                    }

                    case 'update_metadata': {
                        const file = await getFile(args.fileId);
                        if (file) {
                            // In a real app we'd merge tags/description, but for now we'll just update what we can
                            if (args.metadata.title) file.title = args.metadata.title;
                            // Add other fields if kv.ts is expanded
                            await saveFile(args.fileId, file);
                        }
                        results.push({ action, success: true });
                        break;
                    }

                    default:
                        results.push({ action, success: false, error: 'Unknown tool' });
                }
            } catch (err: any) {
                console.error(`Error applying action ${toolName}:`, err);
                results.push({ action, success: false, error: err.message });
            }
        }

        return NextResponse.json({
            success: true,
            results
        });

    } catch (error: any) {
        console.error('Apply actions API error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to apply actions'
        }, { status: 500 });
    }
}
