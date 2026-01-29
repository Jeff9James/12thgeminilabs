import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { saveSearchResults, getSearchResults } from '@/lib/kv';
import crypto from 'crypto';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Create a cache key from query and video IDs
function createCacheKey(query: string, videoIds: string[]): string {
  const content = `${query}:${videoIds.sort().join(',')}`;
  return crypto.createHash('md5').update(content).digest('hex');
}

interface SearchResult {
  id: string;
  videoId: string;
  videoTitle: string;
  timestamp: number;
  snippet: string;
  relevance: number;
  category?: string;
}

// Note: Using responseMimeType alone forces JSON output
// responseSchema has type issues with current SDK version

export async function POST(request: NextRequest) {
  try {
    const { query, videos } = await request.json();

    if (!query || !videos || videos.length === 0) {
      return NextResponse.json({
        error: 'Query and videos are required'
      }, { status: 400 });
    }

    // Check cache first
    const cacheKey = createCacheKey(query, videos.map((v: any) => v.id));
    const cachedResults = await getSearchResults(cacheKey);

    if (cachedResults) {
      console.log('Returning cached search results');
      return NextResponse.json({
        success: true,
        results: cachedResults,
        count: cachedResults.length,
        cached: true
      });
    }

    // Process all videos in PARALLEL for speed
    const searchPromises = videos.map(async (video: any) => {
      if (!video.geminiFileUri) return [];

      try {
        // Use Gemini 3 Flash for fastest response
        const model = genAI.getGenerativeModel({
          model: 'gemini-3-flash-preview',
          generationConfig: {
            temperature: 1.0,
            responseMimeType: 'application/json',
          },
        });

        // Determine file category for appropriate search prompt
        const category = video.category || 'video';
        const isVideoOrAudio = category === 'video' || category === 'audio';

        // Shortened, optimized prompt with explicit JSON format
        const prompt = `Search for: "${query}"

Find matching content and return as JSON array.

Format:
[
  {
    ${isVideoOrAudio ? '"timestamp": "MM:SS",' : ''}
    "description": "1-2 sentences describing the match",
    "relevance": 0-100
  }
]

Return empty array [] if no matches.`;

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

        // Parse JSON response (guaranteed by responseSchema)
        let matches = [];
        try {
          matches = JSON.parse(response);
        } catch (parseError) {
          console.error('Failed to parse response:', parseError);
          return [];
        }

        // Add video info to each match
        return matches.map((match: any) => ({
          id: `${video.id}-${match.timestamp || '0'}`,
          videoId: video.id,
          videoTitle: video.filename || video.title,
          timestamp: parseTimestamp(match.timestamp),
          snippet: match.description,
          relevance: match.relevance / 100, // Convert to 0-1 scale
          category: video.category || 'video',
        }));

      } catch (videoError) {
        console.error(`Error searching video ${video.id}:`, videoError);
        return [];
      }
    });

    // Wait for ALL searches to complete in parallel
    const allResults = await Promise.all(searchPromises);

    // Flatten results and sort by relevance
    const results = allResults
      .flat()
      .sort((a, b) => b.relevance - a.relevance);

    // Cache the results for future queries
    await saveSearchResults(cacheKey, results);

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
      cached: false
    });

  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json({
      error: error.message || 'Search failed'
    }, { status: 500 });
  }
}

// Helper function to convert timestamp string to seconds
function parseTimestamp(timestamp: string | undefined): number {
  if (!timestamp) return 0;

  const parts = timestamp.replace(/[\[\]]/g, '').split(':');

  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  } else if (parts.length === 3) {
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  }

  return 0;
}
