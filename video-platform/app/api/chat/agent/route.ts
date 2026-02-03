import { NextRequest, NextResponse } from 'next/server';
import { runAgentCycle } from '@/lib/chatAgent';
import { listFiles, listFolders } from '@/lib/kv';

export async function POST(request: NextRequest) {
    try {
        const { query, history = [] } = await request.json();

        if (!query) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        // Fetch current state for context
        const userId = 'demo-user';
        const [files, folders] = await Promise.all([
            listFiles(userId),
            listFolders(userId)
        ]);

        const agentResponse = await runAgentCycle(query, history, files, folders);

        return NextResponse.json({
            success: true,
            ...agentResponse
        });

    } catch (error: any) {
        console.error('Agent API error:', error);
        return NextResponse.json({
            error: error.message || 'Agent request failed'
        }, { status: 500 });
    }
}
