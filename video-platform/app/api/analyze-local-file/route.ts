import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, type, image, mimeType } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    let result: string;

    if (type === 'image' && image) {
      // Analyze image with vision model
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-3-flash-preview',
      });

      const imagePart = {
        inlineData: {
          data: image,
          mimeType: mimeType || 'image/jpeg',
        },
      };

      const response = await model.generateContent([prompt, imagePart]);
      result = response.response.text();
    } else {
      // Analyze text
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-3-flash-preview',
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        },
      });

      const response = await model.generateContent(prompt);
      result = response.response.text();
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('[API] Error analyzing local file:', error);
    return NextResponse.json(
      { error: 'Failed to analyze file', details: (error as Error).message },
      { status: 500 }
    );
  }
}
