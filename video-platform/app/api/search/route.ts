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

// Retry wrapper for Gemini API calls with exponential backoff
async function callGeminiWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 3
): Promise<T> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      return await operation();
    } catch (error: any) {
      // Check for 503/overloaded errors
      const isOverloaded = error.message?.includes('503') ||
        error.message?.includes('overloaded') ||
        error.message?.includes('Service Unavailable');

      // Check for RECITATION errors - return empty result for these
      const isRecitation = error.message?.includes('RECITATION') ||
        error.message?.includes('Candidate was blocked');

      if (isRecitation) {
        console.log(`${operationName} blocked due to recitation, returning empty result`);
        throw new Error('RECITATION_BLOCKED');
      }

      if (isOverloaded && retries < maxRetries - 1) {
        retries++;
        // Wait with exponential backoff: 2s, 4s, 8s
        const waitTime = Math.pow(2, retries) * 1000;
        console.log(`${operationName}: Gemini API overloaded, retrying in ${waitTime / 1000}s... (attempt ${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        // Last retry failed or non-overload error
        throw error;
      }
    }
  }

  throw new Error(`${operationName}: Max retries exceeded`);
}

// Note: Using responseMimeType alone forces JSON output
// responseSchema has type issues with current SDK version

export async function POST(request: NextRequest) {
  try {
    const { query, videos, mode = 'search', history = [], color, useMetadata = true } = await request.json();

    if (!query || !videos || videos.length === 0) {
      return NextResponse.json({
        error: 'Query and videos are required'
      }, { status: 400 });
    }

    // Check cache first (include mode in cache key)
    const cacheKey = createCacheKey(`${mode}:${query}`, videos.map((v: any) => v.id));
    const cachedData = await getSearchResults(cacheKey);

    // Skip cache for chat mode to ensure fresh results and filter support
    if (cachedData && mode !== 'chat') {
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
      try {
        // If useMetadata is true and video has analysis, search metadata only (faster, cheaper)
        if (useMetadata && video.analysis) {
          return searchInMetadata(video, query, color);
        }
        
        // Otherwise, use full file search (detailed mode)
        if (!video.geminiFileUri) return [];

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
        const colorContext = color
          ? ` and specifically find content matching the ${color.startsWith('#') ? `hex color "${color}"` : `color "${color}"`}`
          : '';

        let prompt = `Search for: "${query}"${colorContext}`;
        if (!query.trim() && color) {
          prompt = `Find any content or visual elements that match the ${color.startsWith('#') ? `hex color "${color}"` : `color "${color}"`}`;
        }

        prompt += `\n\nFormat:\n[\n  {\n    ${isVideoOrAudio ? '"timestamp": "MM:SS",' : ''}\n    "description": "1-2 sentences describing the match",\n    "relevance": 0-100\n  }\n]\n\nReturn empty array [] if no matches.`;

        // Use retry logic for API call
        const result = await callGeminiWithRetry(
          () => model.generateContent([
            {
              fileData: {
                mimeType: video.mimeType || 'video/mp4',
                fileUri: video.geminiFileUri
              }
            },
            { text: prompt }
          ]),
          `Search video ${video.id} `,
          3
        );

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
          id: `${video.id} -${match.timestamp || '0'} `,
          videoId: video.id,
          videoTitle: video.filename || video.title,
          timestamp: parseTimestamp(match.timestamp),
          snippet: match.description,
          relevance: match.relevance / 100, // Convert to 0-1 scale
          category: video.category || 'video',
        }));

      } catch (videoError: any) {
        if (videoError.message === 'RECITATION_BLOCKED') {
          // Return empty results for recitation blocks
          return [];
        }
        
        // If 403 error (file no longer accessible), try metadata search as fallback
        if (videoError.status === 403 || videoError.message?.includes('403') || videoError.message?.includes('Forbidden')) {
          console.log(`File ${video.id} not accessible (403), falling back to metadata search`);
          if (video.analysis) {
            return searchInMetadata(video, query, color);
          }
          return [];
        }
        
        console.error(`Error searching video ${video.id}: `, videoError);
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
      } catch (chatError: any) {
        if (chatError.message?.includes('overloaded') || chatError.message?.includes('503')) {
          console.error('Failed to generate chat response due to overload:', chatError);
          // Return partial results with a message
          return NextResponse.json({
            success: true,
            results,
            aiResponse: {
              answer: 'I found relevant content in your files, but the AI is currently experiencing high demand. Please try asking your question again in a moment.',
              citations: Array.from(new Set(results.slice(0, 5).map(r => r.videoTitle)))
            },
            count: results.length,
            cached: false,
            partial: true
          });
        }
        console.error('Failed to generate chat response:', chatError);
        // Continue without AI response - still show results
      }
    }

    // Cache the results for future queries (skip caching for chat mode)
    if (mode !== 'chat') {
      const cacheData = results;
      await saveSearchResults(cacheKey, cacheData as any);
    }

    return NextResponse.json({
      success: true,
      results,
      aiResponse,
      count: results.length,
      cached: false,
      usedMetadata: useMetadata
    });

  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json({
      error: error.message || 'Search failed'
    }, { status: 500 });
  }
}

// Search in metadata only (fast, cheap - no AI token cost for file processing)
async function searchInMetadata(video: any, query: string, color?: string): Promise<SearchResult[]> {
  const analysis = video.analysis;
  if (!analysis) return [];

  const category = video.category || 'video';
  const isVideoOrAudio = category === 'video' || category === 'audio';

  // Build searchable text from metadata
  let searchableText = `${analysis.summary || ''}\n`;
  if (analysis.keyPoints) {
    searchableText += analysis.keyPoints.join('\n') + '\n';
  }
  if (analysis.transcription) {
    searchableText += analysis.transcription + '\n';
  }
  if (analysis.textContent) {
    searchableText += analysis.textContent + '\n';
  }

  // Simple keyword matching for metadata search
  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(/\s+/).filter(k => k.length > 2);
  
  let relevanceScore = 0;
  let matchedContent = '';
  
  // Check summary
  if (analysis.summary && analysis.summary.toLowerCase().includes(queryLower)) {
    relevanceScore += 40;
    matchedContent = analysis.summary;
  }
  
  // Check key points
  if (analysis.keyPoints) {
    for (const point of analysis.keyPoints) {
      if (point.toLowerCase().includes(queryLower)) {
        relevanceScore += 30;
        if (!matchedContent) matchedContent = point;
      }
    }
  }
  
  // Check transcription
  if (analysis.transcription && analysis.transcription.toLowerCase().includes(queryLower)) {
    relevanceScore += 20;
    if (!matchedContent) matchedContent = analysis.transcription.substring(0, 200);
  }
  
  // Check individual keywords
  keywords.forEach(keyword => {
    const matches = (searchableText.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
    relevanceScore += matches * 5;
  });

  // Color matching for images
  if (color && analysis.colors) {
    const colorMatches = analysis.colors.some((c: string) => 
      c.toLowerCase().includes(color.toLowerCase()) || 
      color.toLowerCase().includes(c.toLowerCase())
    );
    if (colorMatches) {
      relevanceScore += 30;
      if (!matchedContent) matchedContent = `Contains color: ${color}`;
    }
  }

  // Object matching for images
  if (analysis.objects) {
    keywords.forEach(keyword => {
      const objectMatch = analysis.objects.some((obj: string) => 
        obj.toLowerCase().includes(keyword)
      );
      if (objectMatch) {
        relevanceScore += 20;
      }
    });
  }

  // Scene matching for videos
  let bestScene: any = null;
  if (analysis.scenes && isVideoOrAudio) {
    for (const scene of analysis.scenes) {
      const sceneText = `${scene.label} ${scene.description}`.toLowerCase();
      if (sceneText.includes(queryLower)) {
        relevanceScore += 25;
        bestScene = scene;
        break;
      }
    }
  }

  // Return result only if relevant
  if (relevanceScore < 10) return [];

  // Cap at 100
  relevanceScore = Math.min(100, relevanceScore);

  return [{
    id: `${video.id}-metadata-${Date.now()}`,
    videoId: video.id,
    videoTitle: video.filename || video.title,
    timestamp: bestScene ? parseTimestamp(bestScene.start) : 0,
    snippet: matchedContent || analysis.summary || 'Match found in file metadata',
    relevance: relevanceScore / 100,
    category: video.category || 'video',
  }];
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
    return `[${index + 1}] ${result.videoTitle}${timestamp}: ${result.snippet} `;
  }).join('\n\n');

  // Get unique file names for citations
  const citedFiles = Array.from(new Set(topResults.map(r => r.videoTitle)));

  // Build conversation history context (last 3 exchanges for efficiency)
  let conversationContext = '';
  if (history && history.length > 0) {
    const recentHistory = history.slice(-3);
    conversationContext = '\n\nPrevious conversation:\n' +
      recentHistory.map((msg: any) =>
        `Q: ${msg.question} \nA: ${msg.answer} `
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
        - If this is a follow - up question, reference the previous conversation context
          - Understand references like "tell me more", "what about that", "elaborate", etc.

            Answer: `;

  // Use retry logic for API call
  const result = await callGeminiWithRetry(
    () => model.generateContent(prompt),
    'Generate chat response',
    3
  );

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
  return `${mins}:${String(secs).padStart(2, '0')} `;
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
