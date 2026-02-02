'use client';

import { useState } from 'react';

export default function MCPTestPage() {
  const [serverUrl, setServerUrl] = useState('https://mcp.deepwiki.com/mcp');
  const [useProxy, setUseProxy] = useState(true);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testProxyDirect = async () => {
    setLoading(true);
    setStatus('Testing proxy API directly...');
    
    try {
      const response = await fetch('/api/mcp/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUrl: serverUrl,
          method: 'POST',
          payload: {
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: {
                name: 'test-client',
                version: '1.0.0'
              }
            }
          }
        }),
      });

      const data = await response.json();
      console.log('Proxy response:', data);
      
      setResult(data);
      
      if (data.success) {
        setStatus('✅ Proxy test successful!');
      } else {
        setStatus('❌ Proxy returned error: ' + JSON.stringify(data));
      }
    } catch (error: any) {
      console.error('Proxy test error:', error);
      setStatus('❌ Error: ' + error.message);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testWithMCPClient = async () => {
    setLoading(true);
    setStatus('Testing with MCP Client...');
    
    try {
      const { MCPClient } = await import('@/lib/mcpClient');
      
      console.log('Creating MCP Client with:', {
        serverUrl,
        useProxy,
        transport: 'streamable-http'
      });
      
      const client = new MCPClient({
        serverUrl,
        useProxy,
        transport: 'streamable-http'
      });

      console.log('Connecting...');
      await client.connect();
      
      console.log('Connected! Getting capabilities...');
      const tools = client.getTools();
      const resources = client.getResources();
      const serverInfo = client.getServerInfo();

      setResult({
        serverInfo,
        tools,
        resources,
        connected: client.isConnected()
      });
      
      setStatus(`✅ Connected successfully! Tools: ${tools.length}, Resources: ${resources.length}`);
      
      // Clean up
      await client.disconnect();
    } catch (error: any) {
      console.error('MCP Client test error:', error);
      setStatus('❌ Error: ' + error.message);
      setResult({ error: error.message, stack: error.stack });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">MCP Connection Test Page</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                MCP Server URL
              </label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useProxy"
                checked={useProxy}
                onChange={(e) => setUseProxy(e.target.checked)}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <label htmlFor="useProxy" className="text-sm font-medium text-gray-700">
                Use Proxy to Bypass CORS
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Tests</h2>
          
          <div className="space-y-3">
            <button
              onClick={testProxyDirect}
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Testing...' : 'Test 1: Proxy API Directly'}
            </button>
            
            <button
              onClick={testWithMCPClient}
              disabled={loading || !useProxy}
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Testing...' : 'Test 2: With MCP Client (Proxy Only)'}
            </button>
            
            {!useProxy && (
              <p className="text-sm text-amber-600">
                ⚠️ Enable proxy to test MCP Client (direct connection will fail due to CORS)
              </p>
            )}
          </div>
        </div>

        {status && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Status</h2>
            <p className="text-lg font-medium">{status}</p>
          </div>
        )}

        {result && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Result</h2>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">How to Use:</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Make sure "Use Proxy to Bypass CORS" is checked</li>
            <li>Click "Test 1" to test the proxy API directly</li>
            <li>If Test 1 works, click "Test 2" to test the full MCP Client</li>
            <li>Check the browser console for detailed logs</li>
            <li>View the result JSON below</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
