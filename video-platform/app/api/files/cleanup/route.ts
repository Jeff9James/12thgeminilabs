import { NextRequest, NextResponse } from 'next/server';
import { listFiles } from '@/lib/kv';

/**
 * Cleanup endpoint to synchronize file storage
 * - Lists all files in Gemini Files API
 * - Compares with KV storage
 * - Optionally deletes orphaned Gemini files
 */
export async function POST(request: NextRequest) {
    try {
        const { action = 'check' } = await request.json();
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'GEMINI_API_KEY not configured' },
                { status: 500 }
            );
        }

        // Get all files from KV
        const kvFiles = await listFiles('demo-user');
        const kvFileNames = new Set(kvFiles.map(f => (f as any).geminiFileName).filter(Boolean));

        console.log(`Found ${kvFiles.length} files in KV storage`);

        // List all files in Gemini
        const listResponse = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/files',
            {
                headers: {
                    'x-goog-api-key': apiKey,
                }
            }
        );

        if (!listResponse.ok) {
            throw new Error(`Failed to list Gemini files: ${listResponse.statusText}`);
        }

        const geminiData = await listResponse.json();
        const geminiFiles = geminiData.files || [];

        console.log(`Found ${geminiFiles.length} files in Gemini`);

        // Find orphaned files (in Gemini but not in KV)
        const orphanedFiles = geminiFiles.filter((file: any) => !kvFileNames.has(file.name));

        console.log(`Found ${orphanedFiles.length} orphaned files in Gemini`);

        // If action is 'delete', remove orphaned files
        if (action === 'delete' && orphanedFiles.length > 0) {
            const deleteResults = await Promise.allSettled(
                orphanedFiles.map((file: any) =>
                    fetch(
                        `https://generativelanguage.googleapis.com/v1beta/${file.name}`,
                        {
                            method: 'DELETE',
                            headers: {
                                'x-goog-api-key': apiKey,
                            }
                        }
                    ).then(res => ({ name: file.name, success: res.ok }))
                )
            );

            const deleted = deleteResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
            const failed = deleteResults.length - deleted;

            return NextResponse.json({
                success: true,
                message: `Cleanup completed: ${deleted} deleted, ${failed} failed`,
                orphanedFiles: orphanedFiles.map((f: any) => ({
                    name: f.name,
                    displayName: f.displayName,
                    createTime: f.createTime
                })),
                deleted,
                failed
            });
        }

        // Just return the list of orphaned files
        return NextResponse.json({
            success: true,
            kvFileCount: kvFiles.length,
            geminiFileCount: geminiFiles.length,
            orphanedCount: orphanedFiles.length,
            orphanedFiles: orphanedFiles.map((f: any) => ({
                name: f.name,
                displayName: f.displayName,
                createTime: f.createTime,
                uri: f.uri
            })),
            message: orphanedFiles.length > 0 
                ? `Found ${orphanedFiles.length} orphaned files. Call with action: 'delete' to remove them.`
                : 'All files in sync!'
        });

    } catch (error: any) {
        console.error('Cleanup error:', error);
        return NextResponse.json(
            { error: error.message || 'Cleanup failed' },
            { status: 500 }
        );
    }
}

// GET endpoint to check without modifying
export async function GET(request: NextRequest) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'GEMINI_API_KEY not configured' },
                { status: 500 }
            );
        }

        // Get all files from KV
        const kvFiles = await listFiles('demo-user');
        const kvFileNames = new Set(kvFiles.map(f => (f as any).geminiFileName).filter(Boolean));

        // List all files in Gemini
        const listResponse = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/files',
            {
                headers: {
                    'x-goog-api-key': apiKey,
                }
            }
        );

        if (!listResponse.ok) {
            throw new Error(`Failed to list Gemini files: ${listResponse.statusText}`);
        }

        const geminiData = await listResponse.json();
        const geminiFiles = geminiData.files || [];

        // Find orphaned files
        const orphanedFiles = geminiFiles.filter((file: any) => !kvFileNames.has(file.name));

        return NextResponse.json({
            success: true,
            kvFileCount: kvFiles.length,
            geminiFileCount: geminiFiles.length,
            orphanedCount: orphanedFiles.length,
            kvFiles: kvFiles.map(f => ({
                id: f.id,
                title: f.fileName,
                geminiFileName: (f as any).geminiFileName
            })),
            geminiFiles: geminiFiles.map((f: any) => ({
                name: f.name,
                displayName: f.displayName,
                createTime: f.createTime
            })),
            orphanedFiles: orphanedFiles.map((f: any) => ({
                name: f.name,
                displayName: f.displayName,
                createTime: f.createTime
            }))
        });

    } catch (error: any) {
        console.error('Cleanup check error:', error);
        return NextResponse.json(
            { error: error.message || 'Cleanup check failed' },
            { status: 500 }
        );
    }
}
