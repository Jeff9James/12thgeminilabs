/**
 * Proxy Transport for MCP Client
 * 
 * This transport wraps requests through the local proxy API to bypass CORS.
 * It implements the Transport interface required by the MCP SDK.
 */

import type { Transport } from '@moinfra/mcp-client-sdk/shared/transport.js';
import type { JSONRPCMessage } from '@moinfra/mcp-client-sdk/types.js';

export class MCPProxyTransport implements Transport {
  private _targetUrl: string;
  private _sessionId?: string;
  
  public onclose?: () => void;
  public onerror?: (error: Error) => void;
  public onmessage?: (message: JSONRPCMessage) => void;

  constructor(targetUrl: string) {
    this._targetUrl = targetUrl;
    console.log('MCPProxyTransport: Created with targetUrl:', targetUrl);
  }

  get sessionId(): string | undefined {
    return this._sessionId;
  }

  async start(): Promise<void> {
    // Initialize connection - nothing to do for HTTP-based transport
    console.log('MCPProxyTransport: Starting connection via proxy to', this._targetUrl);
  }

  async send(message: JSONRPCMessage): Promise<void> {
    try {
      console.log('MCPProxyTransport: Sending message via proxy', message);
      console.log('MCPProxyTransport: Target URL:', this._targetUrl);

      const requestBody = {
        targetUrl: this._targetUrl,
        method: 'POST',
        payload: message,
      };
      
      console.log('MCPProxyTransport: Request body:', requestBody);

      const response = await fetch('/api/mcp/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Proxy request failed (${response.status}): ${JSON.stringify(errorData)}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        // Handle the response
        if (this.onmessage) {
          this.onmessage(result.data);
        }
        
        // Extract session ID if present
        if (result.data._meta?.sessionId) {
          this._sessionId = result.data._meta.sessionId;
        }
      } else {
        throw new Error(`Proxy returned unsuccessful result: ${JSON.stringify(result)}`);
      }
    } catch (error: any) {
      console.error('MCPProxyTransport: Send error', error);
      if (this.onerror) {
        this.onerror(error);
      }
      throw error;
    }
  }

  async close(): Promise<void> {
    console.log('MCPProxyTransport: Closing connection');
    if (this.onclose) {
      this.onclose();
    }
  }
}
