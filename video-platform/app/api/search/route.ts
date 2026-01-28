import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface SearchResult {
  id: string;
  videoId: string;
  videoTitle: string;
  timestamp: number;
  snippet: string;
  relevance: number;
}

export async function POST(request: NextRequest) {
  try {
    const { query, videos } = await request.json();
    
    if (!query || !videos || videos.length === 0) {
      return NextResponse.json({ 
        error: 'Query and videos are required' 
      }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3-flash-preview',
      generationConfig: {
        temperature: 1.0,
      }
    });

    const results: SearchResult[] = [];

    // Search through each video
    for (const video of videos) {
      if (!video.geminiFileUri) continue;

      try {
        // Ask Gemini to search within this specific video
        const prompt = `You are a video search assistant. The user is searching for: "${query}"

Analyze this video and find ALL moments that match the search query. For each matching moment:
1. Provide the exact timestamp in [MM:SS] format
2. Describe what happens at that moment (1-2 sentences)
3. Rate how relevant it is (0-100%)

Format your response as JSON array:
[
  {
    "timestamp": "1:23",
    "description": "Brief description of what happens",
    "relevance": 95
  }
]

If no matches found, return empty array: []

IMPORTANT: Only include moments that actually match the query. Be precise with timestamps.`;

        const result = await model.generateContent([
          {
            fileData: {
              mimeType: video.mimeType || 'video/mp4',
              fileUri: video.geminiFileUri
            }
          },
          { text: prompt }
        ]);

        const response = result.response.text();
        
        // Parse JSON response
        let matches = [];
        try {
          // Extract JSON from response (might be wrapped in markdown)
          const jsonMatch = response.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            matches = JSON.parse(jsonMatch[0]);
          }
        } catch (parseError) {
          console.error('Failed to parse Gemini response:', parseError);
        }

        // Add video info to each match
        matches.forEach((match: any) => {
          results.push({
            id: `${video.id}-${match.timestamp}`,
            videoId: video.id,
            videoTitle: video.filename || video.title,
            timestamp: parseTimestamp(match.timestamp),
            snippet: match.description,
            relevance: match.relevance / 100, // Convert to 0-1 scale
          });
        });

      } catch (videoError) {
        console.error(`Error searching video ${video.id}:`, videoError);
        // Continue with next video
      }
    }

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    return NextResponse.json({
      success: true,
      results,
      count: results.length
    });

  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json({ 
      error: error.message || 'Search failed' 
    }, { status: 500 });
  }
}

// Helper function to convert timestamp string to seconds
function parseTimestamp(timestamp: string): number {
  const parts = timestamp.replace(/[\[\]]/g, '').split(':');
  
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  } else if (parts.length === 3) {
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  }
  
  return 0;
}
