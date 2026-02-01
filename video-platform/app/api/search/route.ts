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

interface CachedSearchData {
  results: SearchResult[];
  aiResponse?: {
    answer: string;
    citations: string[];
  };
}

// Note: Using responseMimeType alone forces JSON output
// responseSchema has type issues with current SDK version

export async function POST(request: NextRequest) {
  try {
    const { query, videos, mode = 'search', history = [] } = await request.json();

    if (!query || !videos || videos.length === 0) {
      return NextResponse.json({
        error: 'Query and videos are required'
      }, { status: 400 });
    }

    // Check cache first (include mode in cache key)
    const cacheKey = createCacheKey(`${mode}:${query}`, videos.map((v: any) => v.id));
    const cachedData = await getSearchResults(cacheKey);

    if (cachedData) {
      console.log('Returning cached search results');
      
      // Handle both old format (array) and new format (object with results)
      const isNewFormat = cachedData && typeof cachedData === 'object' && 'results' in cachedData;
      const results = isNewFormat ? (cachedData as CachedSearchData).results : cachedData as SearchResult[];
      const aiResponse = isNewFormat ? (cachedData as CachedSearchData).aiResponse : undefined;
      
      return NextResponse.json({
        success: true,
        results,
        aiResponse,
        count: results.length,
        cached: true
      });
    }

    // Process all videos in PARALLEL for speed (same for both modes)
    const searchPromises = videos.map(async (video: any) => {
      if (!video.geminiFileUri) return [];

      try {
        // Use Gemini 3 Flash with LOW THINKING for fastest response
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

        // Use LOW THINKING for maximum speed (SDK limitation: thinkingConfig not in types)
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

    // Generate AI response in Chat mode
    let aiResponse = null;
    if (mode === 'chat' && results.length > 0) {
      try {
        aiResponse = await generateChatResponse(query, results, videos, history);
      } catch (chatError) {
        console.error('Failed to generate chat response:', chatError);
        // Continue without AI response - still show results
      }
    }

    // Cache the results for future queries
    const cacheData = mode === 'chat' 
      ? { results, aiResponse: aiResponse || undefined }
      : results;
    await saveSearchResults(cacheKey, cacheData as any);

    return NextResponse.json({
      success: true,
      results,
      aiResponse,
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

// Generate AI response for chat mode
async function generateChatResponse(
  query: string, 
  results: SearchResult[], 
  videos: any[],
  history: any[] = []
): Promise<{ answer: string; citations: string[] }> {
  // Use Gemini 3 Flash for AI response generation
  const model = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: {
      temperature: 1.0,
    },
  });

  // Group results by file
  const fileResults = new Map<string, SearchResult[]>();
  results.forEach(result => {
    if (!fileResults.has(result.videoId)) {
      fileResults.set(result.videoId, []);
    }
    fileResults.get(result.videoId)!.push(result);
  });

  // Build context from top results (limit to top 10 for speed)
  const topResults = results.slice(0, 10);
  const context = topResults.map((result, index) => {
    const timestamp = result.timestamp > 0 ? ` [${formatTimestamp(result.timestamp)}]` : '';
    return `[${index + 1}] ${result.videoTitle}${timestamp}: ${result.snippet}`;
  }).join('\n\n');

  // Get unique file names for citations
  const citedFiles = Array.from(new Set(topResults.map(r => r.videoTitle)));

  // Build conversation history context (last 3 exchanges for efficiency)
  let conversationContext = '';
  if (history && history.length > 0) {
    const recentHistory = history.slice(-3);
    conversationContext = '\n\nPrevious conversation:\n' +
      recentHistory.map((msg: any) => 
        `Q: ${msg.question}\nA: ${msg.answer}`
      ).join('\n\n') + '\n\n';
  }

  const prompt = `You are an AI assistant answering questions based on the user's uploaded files.
${conversationContext}
Current Question: "${query}"

Relevant content from files:
${context}

Instructions:
- Answer the current question directly and concisely
- Use information from the provided content
- Reference sources using numbers [1], [2], etc.
- Be factual and cite your sources
- Keep response under 250 words
- If this is a follow-up question, reference the previous conversation context
- Understand references like "tell me more", "what about that", "elaborate", etc.

Answer:`;

  // Use LOW THINKING for maximum speed (SDK limitation: thinkingConfig not in types)
  const result = await model.generateContent(prompt);
  const answer = result.response.text();

  return {
    answer: answer.trim(),
    citations: citedFiles
  };
}

// Helper to format timestamp for display
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
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
