import { NextResponse } from 'next/server';

// Simple route to provide API key securely
// The API key never appears in client-side code
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  return NextResponse.json({ apiKey });
}
