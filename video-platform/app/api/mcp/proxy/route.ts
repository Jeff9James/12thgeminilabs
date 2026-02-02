/**
 * MCP Proxy API Route
 * 
 * This API route acts as a proxy to bypass CORS restrictions
 * when connecting to MCP servers that don't have proper CORS headers.
 * 
 * Usage: The MCPProxyTransport sends requests here with the target URL and payload.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetUrl, method = 'POST', payload } = body;

    console.log('MCP Proxy POST request:', { targetUrl, method, hasPayload: !!payload });

    if (!targetUrl) {
      return NextResponse.json(
        { error: 'targetUrl is required', received: body },
        { status: 400 }
      );
    }

    // Validate URL
    let url: URL;
    try {
      url = new URL(targetUrl);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid targetUrl', targetUrl },
        { status: 400 }
      );
    }

    // Make request to the actual MCP server
    const response = await fetch(url.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });

    console.log('MCP Server response:', {
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    // Get response data
    const data = await response.text();
    let jsonData;
    
    try {
      jsonData = JSON.parse(data);
    } catch {
      jsonData = data;
    }

    // Return with CORS headers
    return NextResponse.json(
      {
        success: response.ok,
        status: response.status,
        data: jsonData,
      },
      {
        status: 200, // Always return 200 for successful proxy requests
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  } catch (error: any) {
    console.error('MCP Proxy error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Proxy request failed',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const targetUrl = request.nextUrl.searchParams.get('targetUrl');

  if (!targetUrl) {
    return NextResponse.json(
      { error: 'targetUrl query parameter is required' },
      { status: 400 }
    );
  }

  try {
    // Validate URL
    const url = new URL(targetUrl);

    // Make request to the actual MCP server
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/event-stream',
      },
    });

    // For SSE streams, we need to handle differently
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      // Stream the response
      return new NextResponse(response.body, {
        status: response.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Regular JSON response
    const data = await response.json();
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('MCP Proxy GET error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Proxy request failed',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
