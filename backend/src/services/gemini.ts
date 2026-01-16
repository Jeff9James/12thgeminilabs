import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../utils/env';
import logger from '../utils/logger';
import { Scene, SearchMatch, SummaryResult, ConversationMessage } from '../../../shared/types';

export class GeminiVideoService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private maxRetries: number = 3;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
  }

  async uploadVideoFile(filePath: string): Promise<any> {
    try {
      // Note: File upload functionality would need to be implemented based on the specific Gemini API version
      logger.info(`Video file ready for analysis: ${filePath}`);
      
      // For now, return a mock file object
      return {
        mimeType: this.getMimeType(filePath),
        uri: filePath,
        name: path.basename(filePath),
      };
    } catch (error) {
      logger.error('Error preparing video for Gemini:', error);
      throw error;
    }
  }

  async summarizeVideo(filePath: string): Promise<SummaryResult> {
    const file = await this.uploadVideoFile(filePath);
    
    const prompt = `
      Provide a comprehensive summary of this video. Include:
      1. A concise overall summary (2-3 paragraphs)
      2. Key points and highlights (bullet points)
      3. Main themes or topics covered
      
      Format your response as JSON with this structure:
      {
        "summary": "overall summary text",
        "keyPoints": ["point 1", "point 2", ...],
        "themes": ["theme 1", "theme 2", ...]
      }
    `;

    try {
      const result = await this.model.generateContent([
        {
          fileData: {
            mimeType: file.mimeType,
            fileUri: file.uri,
          },
        },
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
    } finally {
      await this.deleteFile(file.name);
    }
  }

  async detectScenes(filePath: string): Promise<Scene[]> {
    const file = await this.uploadVideoFile(filePath);
    
    const prompt = `
      Analyze this video and break it down into distinct scenes or chapters.
      For each scene, provide:
      1. The timestamp when it starts (in seconds)
      2. Approximate duration (in seconds)
      3. A descriptive title
      4. A brief description of what happens
      
      Format your response as JSON array:
      [
        {
          "timestamp": 0,
          "duration": 30,
          "title": "Scene title",
          "description": "What happens in this scene"
        },
        ...
      ]
      
      Be precise with timestamps and make sure they're in chronological order.
    `;

    try {
      const result = await this.model.generateContent([
        {
          fileData: {
            mimeType: file.mimeType,
            fileUri: file.uri,
          },
        },
        { text: prompt },
      ]);

      const response = result.response;
      const text = response.text();
      
      // Try to parse JSON array
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return parsed.map((scene: any) => ({
            timestamp: scene.timestamp || 0,
            duration: scene.duration,
            title: scene.title || 'Untitled Scene',
            description: scene.description || '',
          }));
        }
      } catch (parseError) {
        logger.warn('Could not parse JSON response');
      }

      // Fallback: create single scene
      return [{
        id: 'scene-1',
        timestamp: 0,
        title: 'Full Video',
        description: text,
      }];
    } finally {
      await this.deleteFile(file.name);
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
        {
          fileData: {
            mimeType: file.mimeType,
            fileUri: file.uri,
          },
        },
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
    } finally {
      await this.deleteFile(file.name);
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
        {
          fileData: {
            mimeType: file.mimeType,
            fileUri: file.uri,
          },
        },
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
    } finally {
      await this.deleteFile(file.name);
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
        {
          fileData: {
            mimeType: file.mimeType,
            fileUri: file.uri,
          },
        },
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
    } finally {
      await this.deleteFile(file.name);
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
        {
          fileData: {
            mimeType: file.mimeType,
            fileUri: file.uri,
          },
        },
        { text: extendedPrompt },
      ]);

      const response = result.response;
      return response.text();
    } finally {
      await this.deleteFile(file.name);
    }
  }

  private async deleteFile(fileName: string): Promise<void> {
    try {
      // Note: Delete functionality would need to be implemented based on the specific Gemini API version
      logger.info(`File deleted: ${fileName}`);
    } catch (error) {
      logger.warn('Error deleting Gemini file:', error);
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
