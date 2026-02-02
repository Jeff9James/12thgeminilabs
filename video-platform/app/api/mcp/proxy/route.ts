import { NextRequest, NextResponse } from 'next/server';

/**
 * MCP Proxy API Route
 * 
 * This route proxies requests to external MCP servers to bypass CORS restrictions.
 * The browser cannot directly connect to MCP servers that don't have CORS headers,
 * so we forward requests through our Next.js backend.
 */

export async function POST(request: NextRequest) {
    try {
        const { serverUrl, method, body } = await request.json();

        if (!serverUrl) {
            return NextResponse.json({ error: 'serverUrl is required' }, { status: 400 });
        }

        // Forward the request to the MCP server
        const response = await fetch(serverUrl, {
            method: method || 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/event-stream',
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        // Check if it's an SSE response
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('text/event-stream')) {
            // For SSE, we need to stream the response
            const reader = response.body?.getReader();
            if (!reader) {
                return NextResponse.json({ error: 'No response body' }, { status: 500 });
            }

            // Collect all SSE events and return as JSON
            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                fullText += decoder.decode(value, { stream: true });
            }

            // Parse SSE events
            const events = fullText.split('\n\n').filter(e => e.trim());
            const parsedEvents = events.map(event => {
                const lines = event.split('\n');
                const dataLine = lines.find(l => l.startsWith('data:'));
                if (dataLine) {
                    try {
                        return JSON.parse(dataLine.slice(5).trim());
                    } catch {
                        return dataLine.slice(5).trim();
                    }
                }
                return null;
            }).filter(Boolean);

            return NextResponse.json({
                events: parsedEvents,
                raw: fullText
            });
        }

        // For regular JSON responses
        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('MCP Proxy error:', error);
        return NextResponse.json(
            { error: error.message || 'Proxy request failed' },
            { status: 500 }
        );
    }
}import { NextRequest, NextResponse } from 'next/server';

/**
 * MCP Proxy API Route
 * 
 * This route proxies requests to external MCP servers to bypass CORS restrictions.
 * The browser cannot directly connect to MCP servers that don't have CORS headers,
 * so we forward requests through our Next.js backend.
 */

export async function POST(request: NextRequest) {
    try {
        const { serverUrl, method, body } = await request.json();

        if (!serverUrl) {
            return NextResponse.json({ error: 'serverUrl is required' }, { status: 400 });
        }

        // Forward the request to the MCP server
        const response = await fetch(serverUrl, {
            method: method || 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/event-stream',
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        // Check if it's an SSE response
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('text/event-stream')) {
            // For SSE, we need to stream the response
            const reader = response.body?.getReader();
            if (!reader) {
                return NextResponse.json({ error: 'No response body' }, { status: 500 });
            }

            // Collect all SSE events and return as JSON
            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                fullText += decoder.decode(value, { stream: true });
            }

            // Parse SSE events
            const events = fullText.split('\n\n').filter(e => e.trim());
            const parsedEvents = events.map(event => {
                const lines = event.split('\n');
                const dataLine = lines.find(l => l.startsWith('data:'));
                if (dataLine) {
                    try {
                        return JSON.parse(dataLine.slice(5).trim());
                    } catch {
                        return dataLine.slice(5).trim();
                    }
                }
                return null;
            }).filter(Boolean);

            return NextResponse.json({
                events: parsedEvents,
                raw: fullText
            });
        }

        // For regular JSON responses
        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('MCP Proxy error:', error);
        return NextResponse.json(
            { error: error.message || 'Proxy request failed' },
            { status: 500 }
        );
    }
}