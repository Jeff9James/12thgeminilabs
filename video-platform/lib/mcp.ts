'use client';

export interface MCPTool {
    name: string;
    description?: string;
    inputSchema?: object;
}

export interface MCPResource {
    uri: string;
    name?: string;
    description?: string;
    mimeType?: string;
}

export interface MCPServerConnection {
    serverUrl: string;
    serverInfo?: {
        name?: string;
        version?: string;
    };
    tools: MCPTool[];
    resources: MCPResource[];
    connected: boolean;
}

/**
 * Send a JSON-RPC request through our proxy API
 */
async function sendViaProxy(serverUrl: string, method: string, params?: object): Promise<any> {
    const response = await fetch('/api/mcp/proxy', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            serverUrl,
            method: 'POST',
            body: {
                jsonrpc: '2.0',
                id: Date.now(),
                method,
                params: params || {},
            },
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Request failed');
    }

    const data = await response.json();

    // Handle SSE event responses
    if (data.events && Array.isArray(data.events)) {
        // Return the last event which should be the result
        const resultEvent = data.events.find((e: any) => e.result !== undefined);
        if (resultEvent) {
            return resultEvent.result;
        }
        return data.events[data.events.length - 1];
    }

    // Handle direct JSON-RPC response
    if (data.result !== undefined) {
        return data.result;
    }

    if (data.error) {
        throw new Error(data.error.message || 'JSON-RPC error');
    }

    return data;
}

/**
 * Create and connect an MCP client to a remote server URL via our proxy.
 */
export async function connectToMCPServer(serverUrl: string): Promise<MCPServerConnection> {
    // Initialize connection
    const initResult = await sendViaProxy(serverUrl, 'initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
            name: 'video-platform-chat',
            version: '1.0.0',
        },
    });

    // Send initialized notification (fire and forget)
    try {
        await sendViaProxy(serverUrl, 'notifications/initialized', {});
    } catch (e) {
        // Notifications may not return a response
    }

    // Fetch tools
    const tools: MCPTool[] = [];
    try {
        const toolsResult = await sendViaProxy(serverUrl, 'tools/list', {});
        if (toolsResult?.tools) {
            tools.push(
                ...toolsResult.tools.map((t: any) => ({
                    name: t.name,
                    description: t.description,
                    inputSchema: t.inputSchema,
                }))
            );
        }
    } catch (e) {
        console.warn('Failed to list tools:', e);
    }

    // Fetch resources
    const resources: MCPResource[] = [];
    try {
        const resourcesResult = await sendViaProxy(serverUrl, 'resources/list', {});
        if (resourcesResult?.resources) {
            resources.push(
                ...resourcesResult.resources.map((r: any) => ({
                    uri: r.uri,
                    name: r.name,
                    description: r.description,
                    mimeType: r.mimeType,
                }))
            );
        }
    } catch (e) {
        console.warn('Failed to list resources:', e);
    }

    return {
        serverUrl,
        serverInfo: initResult?.serverInfo || { name: 'MCP Server' },
        tools,
        resources,
        connected: true,
    };
}

/**
 * Call a tool on a connected MCP server.
 */
export async function callMCPTool(
    connection: MCPServerConnection,
    toolName: string,
    args: Record<string, unknown>
): Promise<unknown> {
    if (!connection.connected) {
        throw new Error('Not connected to MCP server');
    }

    const result = await sendViaProxy(connection.serverUrl, 'tools/call', {
        name: toolName,
        arguments: args,
    });

    return result;
}

/**
 * Read a resource from a connected MCP server.
 */
export async function readMCPResource(
    connection: MCPServerConnection,
    uri: string
): Promise<unknown> {
    if (!connection.connected) {
        throw new Error('Not connected to MCP server');
    }

    const result = await sendViaProxy(connection.serverUrl, 'resources/read', { uri });
    return result;
}

/**
 * Disconnect from an MCP server.
 */
export async function disconnectFromMCPServer(
    connection: MCPServerConnection
): Promise<void> {
    // With proxy-based approach, we just mark as disconnected
    connection.connected = false;
}