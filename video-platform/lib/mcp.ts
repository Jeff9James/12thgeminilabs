'use client';

import { MCPClient } from './mcpClient';

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
    client: MCPClient; // Internal client instance
}

/**
 * Create and connect an MCP client to a remote server URL via proxy.
 */
export async function connectToMCPServer(serverUrl: string): Promise<MCPServerConnection> {
    console.log('Connecting to MCP server:', serverUrl);
    
    // Create client with proxy enabled
    const client = new MCPClient({
        serverUrl,
        useProxy: true, // Always use proxy for external servers
        transport: 'streamable-http'
    });

    // Connect
    await client.connect();

    // Get capabilities
    const tools = client.getTools();
    const resources = client.getResources();
    const serverInfo = client.getServerInfo();

    console.log('MCP connection established:', {
        serverUrl,
        tools: tools.length,
        resources: resources.length,
        serverInfo
    });

    return {
        serverUrl,
        serverInfo: serverInfo || { name: 'MCP Server' },
        tools,
        resources,
        connected: true,
        client // Store client for later use
    };
}

/**
 * Call a tool on a connected MCP server.
 */
export async function callMCPTool(
    connection: MCPServerConnection,
    toolName: string,
    args: Record<string, unknown>
): Promise<any> {
    if (!connection.connected || !connection.client) {
        throw new Error('Not connected to MCP server');
    }

    console.log('Calling MCP tool:', toolName, args);
    
    const result = await connection.client.callTool(toolName, args);
    
    console.log('MCP tool result:', result);
    
    return result;
}

/**
 * Read a resource from a connected MCP server.
 */
export async function readMCPResource(
    connection: MCPServerConnection,
    uri: string
): Promise<any> {
    if (!connection.connected || !connection.client) {
        throw new Error('Not connected to MCP server');
    }

    console.log('Reading MCP resource:', uri);
    
    const result = await connection.client.readResource(uri);
    
    console.log('MCP resource result:', result);
    
    return result;
}

/**
 * Disconnect from an MCP server.
 */
export async function disconnectFromMCPServer(
    connection: MCPServerConnection
): Promise<void> {
    console.log('Disconnecting from MCP server');
    
    if (connection.client) {
        await connection.client.disconnect();
    }
    
    connection.connected = false;
}
