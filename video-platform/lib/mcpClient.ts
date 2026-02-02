/**
 * MCP Client Integration for Chat Page
 * 
 * This module provides MCP (Model Context Protocol) client functionality
 * to enable rich interactions with MCP servers from the chat interface.
 */

import { Client } from '@moinfra/mcp-client-sdk/client/index.js';
import type { 
  Tool, 
  Resource
} from '@moinfra/mcp-client-sdk/types.js';

export interface MCPClientConfig {
  serverUrl?: string;
  transport?: 'streamable-http' | 'sse' | 'websocket' | 'pseudo';
  useProxy?: boolean; // Use the API proxy to bypass CORS
  serverInfo?: {
    name: string;
    version: string;
  };
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: any;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * MCP Client wrapper for easy integration with the Chat page
 */
export class MCPClient {
  private client: Client | null = null;
  private connected: boolean = false;
  private tools: MCPTool[] = [];
  private resources: MCPResource[] = [];

  constructor(private config: MCPClientConfig = {}) {}

  /**
   * Connect to an MCP server
   */
  async connect(): Promise<void> {
    try {
      // Create client instance
      this.client = new Client({
        name: this.config.serverInfo?.name || 'video-platform-chat',
        version: this.config.serverInfo?.version || '1.0.0'
      });

      if (!this.config.serverUrl) {
        throw new Error('Server URL is required for connection');
      }

      let transport;

      if (this.config.useProxy) {
        // Use custom proxy transport
        const { MCPProxyTransport } = await import('./mcpProxyTransport');
        transport = new MCPProxyTransport(this.config.serverUrl);
        console.log('Using proxy transport for', this.config.serverUrl);
      } else {
        // Use direct StreamableHTTP transport
        const { StreamableHTTPClientTransport } = await import(
          '@moinfra/mcp-client-sdk/client/streamableHttp.js'
        );
        transport = new StreamableHTTPClientTransport(
          new URL(this.config.serverUrl)
        );
        console.log('Using direct StreamableHTTP transport for', this.config.serverUrl);
      }
        
      await this.client.connect(transport);
      this.connected = true;

      // Load available tools and resources
      await this.refreshCapabilities();
    } catch (error: any) {
      console.error('Failed to connect to MCP server:', error);
      
      // Provide better error messages for common issues
      if (error.message?.includes('Failed to fetch') || error.message?.includes('CORS')) {
        throw new Error(
          'Connection failed due to CORS restrictions. ' +
          'The MCP server must allow requests from this domain, ' +
          'or you can enable the proxy option to bypass CORS.'
        );
      }
      
      throw error;
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      try {
        await this.client.close();
        this.connected = false;
        this.client = null;
        this.tools = [];
        this.resources = [];
      } catch (error) {
        console.error('Error disconnecting from MCP server:', error);
      }
    }
  }

  /**
   * Refresh available tools and resources from the server
   */
  async refreshCapabilities(): Promise<void> {
    if (!this.client || !this.connected) {
      throw new Error('Client is not connected');
    }

    try {
      // List available tools
      const toolsList = await this.client.listTools();
      this.tools = toolsList.tools.map((tool: Tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }));

      // List available resources
      const resourcesList = await this.client.listResources();
      this.resources = resourcesList.resources.map((resource: Resource) => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType
      }));
    } catch (error) {
      console.error('Error refreshing capabilities:', error);
      throw error;
    }
  }

  /**
   * Get list of available tools
   */
  getTools(): MCPTool[] {
    return this.tools;
  }

  /**
   * Get list of available resources
   */
  getResources(): MCPResource[] {
    return this.resources;
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(name: string, args: Record<string, any> = {}): Promise<any> {
    if (!this.client || !this.connected) {
      throw new Error('Client is not connected');
    }

    try {
      const result = await this.client.callTool({
        name,
        arguments: args
      });
      return result;
    } catch (error) {
      console.error(`Error calling tool "${name}":`, error);
      throw error;
    }
  }

  /**
   * Read a resource from the MCP server
   */
  async readResource(uri: string): Promise<any> {
    if (!this.client || !this.connected) {
      throw new Error('Client is not connected');
    }

    try {
      const result = await this.client.readResource({ uri });
      return result;
    } catch (error) {
      console.error(`Error reading resource "${uri}":`, error);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get server information
   */
  getServerInfo() {
    if (!this.client) {
      return null;
    }
    return {
      name: (this.client as any).serverInfo?.name,
      version: (this.client as any).serverInfo?.version,
      capabilities: (this.client as any).serverCapabilities
    };
  }
}

/**
 * Create and initialize an MCP client instance
 */
export async function createMCPClient(config: MCPClientConfig): Promise<MCPClient> {
  const client = new MCPClient(config);
  await client.connect();
  return client;
}

/**
 * Helper function to format tool results for display
 */
export function formatToolResult(result: any): string {
  if (!result?.content || result.content.length === 0) {
    return 'No content returned';
  }

  return result.content
    .map((item: any) => {
      if (item.type === 'text') {
        return item.text;
      } else if (item.type === 'image') {
        return `[Image: ${item.data?.substring(0, 50)}...]`;
      } else if (item.type === 'resource') {
        return `[Resource: ${item.resource?.uri}]`;
      }
      return '[Unknown content type]';
    })
    .join('\n');
}
