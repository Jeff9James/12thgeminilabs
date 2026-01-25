import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../utils/env';
import logger from '../utils/logger';
import { Scene, SearchMatch, SummaryResult, ConversationMessage } from '@gemini-video-platform/shared';

// SIMPLIFIED: Use Gemini 3 Flash (cheapest model) with File API
// Videos are uploaded to Gemini's free 48-hour storage

export class GeminiVideoService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private maxRetries: number = 3;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
    // Use Gemini 1.5 Pro - available in SDK v0.21
    // This is the model that supports video analysis with v1beta API
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });
  }

  /**
   * Upload video to Gemini File API (48-hour free storage)
   * Returns the uploaded file object for use in analysis
   */
  async uploadVideoFile(filePath: string): Promise<any> {
    try {
      logger.info(`Preparing video for Gemini File API: ${filePath}`);
      
      // Read file and convert to base64 for inline data
      // Note: For production, consider using the Files API with GoogleAIFileManager
      // which requires a newer SDK version or direct REST API calls
      
      const fileData = fs.readFileSync(filePath);
      const base64Data = fileData.toString('base64');
      
      logger.info(`Video prepared for analysis: ${filePath} (${fileData.length} bytes)`);
      
      return {
        inlineData: {
          data: base64Data,
          mimeType: this.getMimeType(filePath),
        },
      };
    } catch (error) {
      logger.error('Error preparing video for Gemini:', error);
      throw error;
    }
  }

  /**
   * Generate video summary using structured prompt
   * Returns comprehensive summary with key points
   */
  async summarizeVideo(filePath: string): Promise<SummaryResult> {
    const file = await this.uploadVideoFile(filePath);
    
    // OPTIMIZED: Structured prompt for better results
    const prompt = `
      Analyze this video and provide a comprehensive summary.
      
      Format your response as JSON with this exact structure:
      {
        "summary": "A detailed 2-3 paragraph summary of the video content, including main topics, key moments, and overall narrative",
        "keyPoints": [
          "Key point 1 with specific details",
          "Key point 2 with specific details",
          "Key point 3 with specific details"
        ],
        "themes": ["theme1", "theme2", "theme3"]
      }
      
      Be comprehensive and specific. Include important details and context.
    `;

    try {
      const result = await this.model.generateContent([
        file,
        { text: prompt },
      ]);

      const response = result.response;
      const text = response.text();
      
      // Try to parse JSON response
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            summary: parsed.summary || text,
            keyPoints: parsed.keyPoints || parsed.themes || [],
            duration: 0, // Will be filled by caller
          };
        }
      } catch (parseError) {
        logger.warn('Could not parse JSON response, using raw text');
      }

      return {
        summary: text,
        keyPoints: [],
        duration: 0,
      };
    } catch (error) {
      logger.error('Error generating summary:', error);
      throw error;
    }
  }

  /**
   * TWELVE LABS CLONE: Detect scenes with temporal reasoning
   * Uses structured prompt to get precise timestamps and spatial changes
   */
  async detectScenes(filePath: string): Promise<Scene[]> {
    const file = await this.uploadVideoFile(filePath);
    
    // OPTIMIZED: Structured prompt for temporal reasoning (Twelve Labs style)
    const prompt = `
      Analyze this video and provide a detailed temporal breakdown of all significant events and scene changes.
      
      Provide a JSON list of ALL significant events with precise timestamps. Format your response EXACTLY as:
      [
        {
          "start": "0:05",
          "end": "0:12",
          "label": "Person enters room from left",
          "description": "A person wearing a blue shirt walks into frame from the left side and approaches the center",
          "reasoning": "Detected significant spatial movement and new object (person) entering the scene",
          "confidence": 0.95
        },
        {
          "start": "0:15",
          "end": "0:23",
          "label": "Camera pans to show window",
          "description": "Camera movement reveals a window with natural lighting on the right wall",
          "reasoning": "Camera motion creates new perspective and reveals previously hidden spatial elements",
          "confidence": 0.88
        }
      ]
      
      REQUIREMENTS:
      - Include ALL scene changes, movements, and significant events
      - Provide precise start and end timestamps in M:SS or MM:SS format
      - Describe spatial changes and movements in detail
      - Explain your reasoning for each event detection
      - Include confidence score (0-1)
      - Order chronologically by timestamp
      - Minimum 5 events (unless video is very short)
    `;

    try {
      const result = await this.model.generateContent([
        file,
        { text: prompt },
      ]);

      const response = result.response;
      const text = response.text();
      
      // Try to parse JSON array
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return parsed.map((scene: any, index: number) => ({
            id: `scene-${index + 1}`,
            timestamp: this.parseTimestampToSeconds(scene.start),
            duration: this.parseTimestampToSeconds(scene.end) - this.parseTimestampToSeconds(scene.start),
            title: scene.label || 'Untitled Scene',
            description: scene.description || '',
          }));
        }
      } catch (parseError) {
        logger.warn('Could not parse JSON response for scene detection');
      }

      // Fallback: create single scene
      return [{
        id: 'scene-1',
        timestamp: 0,
        title: 'Full Video',
        description: text,
      }];
    } catch (error) {
      logger.error('Error detecting scenes:', error);
      throw error;
    }
  }

  /**
   * Parse timestamp string (M:SS or MM:SS) to seconds
   */
  private parseTimestampToSeconds(timestamp: string): number {
    try {
      const parts = timestamp.split(':');
      if (parts.length === 2) {
        const minutes = parseInt(parts[0]);
        const seconds = parseInt(parts[1]);
        return minutes * 60 + seconds;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  async searchVideo(filePath: string, query: string): Promise<SearchMatch[]> {
    const file = await this.uploadVideoFile(filePath);
    
    const prompt = `
      Search this video for all moments where the following happens: "${query}"
      
      For each relevant moment, provide:
      1. The timestamp when it occurs (in seconds)
      2. Duration of the moment (in seconds)
      3. Description of what's happening
      4. Confidence score (0-1) of how well it matches the query
      
      Format your response as JSON array:
      [
        {
          "timestamp": 0,
          "duration": 5,
          "description": "Description of what's happening",
          "confidence": 0.95
        },
        ...
      ]
      
      Only include moments with confidence > 0.5. Order by timestamp.
    `;

    try {
      const result = await this.model.generateContent([
        file,
        { text: prompt },
      ]);

      const response = result.response;
      const text = response.text();
      
      // Try to parse JSON array
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return parsed.map((match: any) => ({
            timestamp: match.timestamp || 0,
            duration: match.duration || 5,
            description: match.description || '',
            confidence: match.confidence || 0.8,
          }));
        }
      } catch (parseError) {
        logger.warn('Could not parse JSON response');
      }

      // Fallback: no matches found
      return [];
    } catch (error) {
      logger.error('Error searching video:', error);
      throw error;
    }
  }

  async chatAboutVideo(
    filePath: string,
    question: string,
    conversationHistory: ConversationMessage[]
  ): Promise<{ response: string; referencedTimestamps?: Array<{ start: number; end: number }> }> {
    const file = await this.uploadVideoFile(filePath);
    
    // Build conversation context with enhanced prompting
    let contextPrompt = '';
    
    if (conversationHistory.length > 0) {
      contextPrompt = 'Previous conversation:\n';
      for (const msg of conversationHistory) {
        contextPrompt += `${msg.role}: ${msg.content}\n`;
      }
      contextPrompt += '\n';
    }
    
    const enhancedPrompt = `${contextPrompt}You are analyzing a video. When referencing specific moments, use timestamps in the format [MM:SS] or [MM:SS-MM:SS]. Be precise with timestamps and provide context for what happens at those times.

Current question: ${question}

Please provide a detailed response that:
1. Answers the question about the video content
2. References specific timestamps when relevant (e.g., [1:30-1:45])
3. Provides context for the video content at those timestamps

Response:`;

    try {
      const result = await this.model.generateContent([
        file,
        { text: enhancedPrompt },
      ]);

      const response = result.response;
      const text = response.text();
      
      // Parse timestamps from response
      const referencedTimestamps = this.parseTimestamps(text);
      
      return {
        response: text,
        referencedTimestamps,
      };
    } catch (error) {
      logger.error('Error in chat:', error);
      throw error;
    }
  }

  private parseTimestamps(text: string): Array<{ start: number; end: number }> {
    const timestamps: Array<{ start: number; end: number }> = [];
    
    // Pattern for [MM:SS] or [MM:SS-MM:SS]
    const timestampPattern = /\[(\d{1,2}):(\d{2})(?:-(\d{1,2}):(\d{2}))?\]/g;
    let match;
    
    while ((match = timestampPattern.exec(text)) !== null) {
      const startMinutes = parseInt(match[1]);
      const startSeconds = parseInt(match[2]);
      const start = startMinutes * 60 + startSeconds;
      
      if (match[3] && match[4]) {
        // Range format [MM:SS-MM:SS]
        const endMinutes = parseInt(match[3]);
        const endSeconds = parseInt(match[4]);
        const end = endMinutes * 60 + endSeconds;
        timestamps.push({ start, end });
      } else {
        // Single timestamp [MM:SS]
        timestamps.push({ start, end: start + 5 }); // Default 5 second duration
      }
    }
    
    return timestamps;
  }

  async generateConversationTitle(
    firstMessage: string,
    videoContext?: string
  ): Promise<string> {
    const prompt = videoContext
      ? `Based on this video context: "${videoContext}" and this first message: "${firstMessage}", generate a concise, descriptive title for this conversation (max 50 characters).`
      : `Generate a concise, descriptive title for this conversation based on this first message: "${firstMessage}" (max 50 characters).`;
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      let title = response.text().trim();
      
      // Remove quotes if present
      title = title.replace(/^["']|["']$/g, '');
      
      // Truncate if too long
      if (title.length > 50) {
        title = title.substring(0, 47) + '...';
      }
      
      return title || 'Video Conversation';
    } catch (error) {
      logger.warn('Error generating conversation title:', error);
      return 'Video Conversation';
    }
  }

  async analyzeWithCustomPrompt(filePath: string, prompt: string): Promise<{ analysis: string; referencedTimestamps?: Array<{ start: number; end: number }> }> {
    // If no file path provided, return an error
    if (!filePath) {
      throw new Error('Video file path is required for analysis');
    }
    
    const enhancedPrompt = `${prompt}

When referencing specific moments in your analysis, use timestamps in the format [MM:SS] or [MM:SS-MM:SS]. Provide precise timestamps and context for what happens at those times.`;
    
    const file = await this.uploadVideoFile(filePath);
    
    try {
      const result = await this.model.generateContent([
        file,
        { text: enhancedPrompt },
      ]);

      const response = result.response;
      const text = response.text();
      
      // Parse timestamps from response
      const referencedTimestamps = this.parseTimestamps(text);
      
      return {
        analysis: text,
        referencedTimestamps,
      };
    } catch (error) {
      logger.error('Error in custom analysis:', error);
      throw error;
    }
  }

  async analyzeQueryContext(query: string, context?: string): Promise<string> {
    // For query analysis without video file
    const prompt = context 
      ? `Query: "${query}"\nContext: "${context}"\nProvide analysis based on the query and context.`
      : `Analyze this search query: "${query}"`;
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      logger.error('Error analyzing query context:', error);
      throw error;
    }
  }

  async analyzeVideoSegment(
    videoFile: string, 
    startTime: number, 
    endTime: number, 
    prompt: string
  ): Promise<string> {
    const file = await this.uploadVideoFile(videoFile);
    
    // Extend the prompt to include temporal context
    const extendedPrompt = `
      Please analyze the specific segment of this video from ${startTime} to ${endTime} seconds.
      
      ${prompt}
      
      Focus specifically on what's happening in the time range ${startTime}s to ${endTime}s.
    `;
    
    try {
      const result = await this.model.generateContent([
        file,
        { text: extendedPrompt },
      ]);

      const response = result.response;
      return response.text();
    } catch (error) {
      logger.error('Error analyzing video segment:', error);
      throw error;
    }
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.webm': 'video/webm',
    };
    return mimeTypes[ext] || 'video/mp4';
  }
}

export const geminiService = new GeminiVideoService();
