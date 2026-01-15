import { GoogleGenerativeAI, FileState } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../utils/env';
import logger from '../utils/logger';
import { Scene, SearchMatch, SummaryResult } from '../../../shared/types';

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
      const fileManager = this.genAI.fileManager;
      
      logger.info(`Uploading video file to Gemini: ${filePath}`);
      
      const uploadResult = await fileManager.uploadFile(filePath, {
        mimeType: this.getMimeType(filePath),
        displayName: path.basename(filePath),
      });

      logger.info(`Video uploaded successfully: ${uploadResult.file.uri}`);
      
      // Wait for file to be processed
      let file = await fileManager.getFile(uploadResult.file.name);
      while (file.state === FileState.PROCESSING) {
        logger.info('Waiting for video processing...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        file = await fileManager.getFile(uploadResult.file.name);
      }

      if (file.state === FileState.FAILED) {
        throw new Error('Video processing failed');
      }

      logger.info('Video ready for analysis');
      return file;
    } catch (error) {
      logger.error('Error uploading video to Gemini:', error);
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
    conversationHistory: Array<{ role: string; content: string }>
  ): Promise<string> {
    const file = await this.uploadVideoFile(filePath);
    
    // Build conversation context
    let contextPrompt = 'Previous conversation:\n';
    for (const msg of conversationHistory) {
      contextPrompt += `${msg.role}: ${msg.content}\n`;
    }
    contextPrompt += `\nuser: ${question}\n\nassistant:`;

    const prompt = conversationHistory.length === 0 
      ? question 
      : contextPrompt;

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
      return response.text();
    } finally {
      await this.deleteFile(file.name);
    }
  }

  async analyzeWithCustomPrompt(filePath: string, prompt: string): Promise<string> {
    // If no file path provided, return an error
    if (!filePath) {
      throw new Error('Video file path is required for analysis');
    }
    
    const file = await this.uploadVideoFile(filePath);
    
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
      return response.text();
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
      const fileManager = this.genAI.fileManager;
      await fileManager.deleteFile(fileName);
      logger.info(`Deleted Gemini file: ${fileName}`);
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
