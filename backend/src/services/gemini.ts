import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { config } from '../utils/env';
import logger from '../utils/logger';
import { Scene, SearchMatch, SummaryResult, ConversationMessage } from '@gemini-video-platform/shared';

/**
 * Gemini 3 Flash Video Analysis Service
 * Uses REST API for Gemini 3 Flash with File API
 * Following official Gemini 3 documentation
 */
export class GeminiVideoService {
  private apiKey: string;
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta';
  private uploadUrl: string = 'https://generativelanguage.googleapis.com/upload/v1beta/files';

  constructor() {
    this.apiKey = config.geminiApiKey;
  }

  /**
   * Upload video file to Gemini File API
   * Files are stored for 48 hours (free)
   * Returns file URI for use in prompts
   */
  async uploadVideoFile(filePath: string): Promise<{ uri: string; mimeType: string }> {
    try {
      console.log('========================================');
      console.log('📤 STARTING FILE UPLOAD TO GEMINI');
      console.log('File path:', filePath);
      console.log('========================================');
      
      logger.info(`Uploading video to Gemini File API: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
      }

      const fileStats = fs.statSync(filePath);
      const fileSize = fileStats.size;
      const mimeType = this.getMimeType(filePath);
      const displayName = path.basename(filePath);

      console.log(`File size: ${fileSize} bytes (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
      console.log(`MIME type: ${mimeType}`);
      console.log(`Display name: ${displayName}`);

      // Step 1: Initial resumable request
      console.log('Step 1: Requesting upload URL...');
      const initResponse = await axios.post(
        this.uploadUrl,
        {
          file: {
            display_name: displayName,
          },
        },
        {
          headers: {
            'X-Goog-Upload-Protocol': 'resumable',
            'X-Goog-Upload-Command': 'start',
            'X-Goog-Upload-Header-Content-Length': fileSize.toString(),
            'X-Goog-Upload-Header-Content-Type': mimeType,
            'x-goog-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      const uploadUrl = initResponse.headers['x-goog-upload-url'];
      console.log('Upload URL received:', uploadUrl ? 'YES' : 'NO');
      
      if (!uploadUrl) {
        console.error('Init response headers:', initResponse.headers);
        throw new Error('No upload URL returned from Gemini File API');
      }

      logger.info(`Got upload URL, uploading ${fileSize} bytes...`);

      // Step 2: Upload the actual file bytes
      console.log('Step 2: Reading file and uploading bytes...');
      const fileData = fs.readFileSync(filePath);
      console.log(`Read ${fileData.length} bytes from file`);
      
      const uploadResponse = await axios.post(uploadUrl, fileData, {
        headers: {
          'Content-Length': fileSize.toString(),
          'X-Goog-Upload-Offset': '0',
          'X-Goog-Upload-Command': 'upload, finalize',
        },
      });

      logger.info(`Upload response:`, JSON.stringify(uploadResponse.data, null, 2));
      
      const fileInfo = uploadResponse.data.file;
      logger.info(`✅ Video uploaded to Gemini: ${fileInfo.uri}`);
      logger.info(`File name: ${fileInfo.name}, state: ${fileInfo.state}`);

      // Wait for file to become ACTIVE
      await this.waitForFileActive(fileInfo.name);

      return {
        uri: fileInfo.uri,
        mimeType: fileInfo.mimeType,
      };
    } catch (error: any) {
      logger.error('❌ Error uploading video to Gemini File API');
      logger.error('Error message:', error.message);
      logger.error('Error response:', error.response?.data);
      logger.error('Error status:', error.response?.status);
      logger.error('Full error:', JSON.stringify(error, null, 2));
      throw new Error(`Gemini File Upload Failed: ${error.message}`);
    }
  }

  /**
   * Wait for uploaded file to become ACTIVE
   * Files must be in ACTIVE state before they can be used
   */
  async waitForFileActive(fileName: string, maxAttempts: number = 30): Promise<void> {
    logger.info(`Waiting for file to become ACTIVE: ${fileName}`);
    logger.info(`File check URL: ${this.baseUrl}/files/${fileName}`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await axios.get(
          `${this.baseUrl}/files/${fileName}`,
          {
            headers: {
              'x-goog-api-key': this.apiKey,
            },
          }
        );

        logger.info(`File state check ${attempt}/${maxAttempts}:`, JSON.stringify(response.data, null, 2));
        
        const state = response.data.state;

        if (state === 'ACTIVE') {
          logger.info(`✅ File is now ACTIVE and ready to use`);
          return;
        }

        if (state === 'FAILED') {
          logger.error(`File processing FAILED:`, response.data);
          throw new Error('File processing failed on Gemini servers');
        }

        // Wait 2 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error: any) {
        logger.error(`❌ Error checking file status (attempt ${attempt}/${maxAttempts})`);
        logger.error(`Error message:`, error.message);
        logger.error(`Error response:`, error.response?.data);
        logger.error(`Error status:`, error.response?.status);
        
        if (attempt === maxAttempts) {
          throw new Error(`File did not become ACTIVE after ${maxAttempts} attempts`);
        }
        
        // Wait before retry even on error
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    throw new Error('File did not become ACTIVE within timeout period');
  }

  /**
   * Generate content using Gemini 3 Flash with uploaded file
   */
  async generateContent(fileUri: string, mimeType: string, prompt: string, config?: any): Promise<string> {
    try {
      const requestBody: any = {
        contents: [
          {
            parts: [
              {
                file_data: {
                  mime_type: mimeType,
                  file_uri: fileUri,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
      };

      // Add generation config if provided
      if (config) {
        requestBody.generationConfig = config;
      }

      const response = await axios.post(
        `${this.baseUrl}/models/gemini-3-flash-preview:generateContent`,
        requestBody,
        {
          headers: {
            'x-goog-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('No text response from Gemini');
      }

      return text;
    } catch (error: any) {
      logger.error('❌ Error generating content');
      logger.error('Error message:', error.message);
      logger.error('Error response:', error.response?.data);
      logger.error('Error status:', error.response?.status);
      logger.error('Request URL:', `${this.baseUrl}/models/gemini-3-flash-preview:generateContent`);
      throw new Error(`Gemini API Failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Summarize video using Gemini 3 Flash
   */
  async summarizeVideo(filePath: string): Promise<SummaryResult> {
    try {
      // Upload video to Gemini File API
      const { uri, mimeType } = await this.uploadVideoFile(filePath);

      // Structured prompt for summary with JSON output
      const prompt = `Analyze this video and provide a comprehensive summary.

Format your response as JSON with this exact structure:
{
  "summary": "A detailed 2-3 paragraph summary of the video content",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "themes": ["theme1", "theme2"]
}`;

      const response = await this.generateContent(uri, mimeType, prompt, {
        response_mime_type: 'application/json',
        thinkingConfig: {
          thinkingLevel: 'low', // Fast analysis for summary
        },
      });

      // Parse JSON response
      const parsed = JSON.parse(response);
      return {
        summary: parsed.summary || response,
        keyPoints: parsed.keyPoints || [],
        duration: 0,
      };
    } catch (error) {
      logger.error('Error summarizing video:', error);
      throw error;
    }
  }

  /**
   * Detect scenes using Gemini 3 Flash with temporal reasoning
   * Uses Twelve Labs style structured prompts
   */
  async detectScenes(filePath: string): Promise<Scene[]> {
    try {
      // Upload video to Gemini File API
      const { uri, mimeType } = await this.uploadVideoFile(filePath);

      // Twelve Labs style prompt for temporal reasoning
      const prompt = `Analyze this video and provide a detailed temporal breakdown of all significant events and scene changes.

Provide a JSON list of ALL significant events with precise timestamps. Format your response EXACTLY as:
[
  {
    "start": "0:05",
    "end": "0:12",
    "label": "Descriptive label of what happens",
    "description": "Detailed description of the scene including actions and spatial changes"
  }
]

REQUIREMENTS:
- Include ALL scene changes, movements, and significant events
- Provide precise start and end timestamps in M:SS or MM:SS format
- Describe spatial changes and movements in detail
- Order chronologically by timestamp
- Minimum 3-5 events (unless video is very short)`;

      const response = await this.generateContent(uri, mimeType, prompt, {
        response_mime_type: 'application/json',
        thinkingConfig: {
          thinkingLevel: 'medium', // Balanced thinking for scene detection
        },
      });

      // Parse JSON response
      const parsed = JSON.parse(response);
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid response format from Gemini');
      }

      return parsed.map((scene: any, index: number) => ({
        id: `scene-${index + 1}`,
        timestamp: this.parseTimestampToSeconds(scene.start),
        duration: this.parseTimestampToSeconds(scene.end) - this.parseTimestampToSeconds(scene.start),
        title: scene.label || 'Untitled Scene',
        description: scene.description || '',
      }));
    } catch (error) {
      logger.error('Error detecting scenes:', error);
      throw error;
    }
  }

  /**
   * Search for specific moments in video
   */
  async searchVideo(filePath: string, query: string): Promise<SearchMatch[]> {
    try {
      // Upload video to Gemini File API
      const { uri, mimeType } = await this.uploadVideoFile(filePath);

      const prompt = `Search this video for all moments where the following happens: "${query}"

Provide a JSON array of matching moments:
[
  {
    "timestamp": 0,
    "duration": 5,
    "description": "What's happening",
    "confidence": 0.95
  }
]

Only include moments with high relevance. Order by timestamp.`;

      const response = await this.generateContent(uri, mimeType, prompt, {
        response_mime_type: 'application/json',
        thinkingConfig: {
          thinkingLevel: 'low',
        },
      });

      const parsed = JSON.parse(response);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.map((match: any) => ({
        timestamp: match.timestamp || 0,
        duration: match.duration || 5,
        description: match.description || '',
        confidence: match.confidence || 0.8,
      }));
    } catch (error) {
      logger.error('Error searching video:', error);
      return [];
    }
  }

  /**
   * Chat about video
   */
  async chatAboutVideo(
    filePath: string,
    question: string,
    conversationHistory: ConversationMessage[]
  ): Promise<{ response: string; referencedTimestamps?: Array<{ start: number; end: number }> }> {
    try {
      // Upload video to Gemini File API
      const { uri, mimeType } = await this.uploadVideoFile(filePath);

      let prompt = '';
      if (conversationHistory.length > 0) {
        prompt = 'Previous conversation:\n';
        for (const msg of conversationHistory) {
          prompt += `${msg.role}: ${msg.content}\n`;
        }
        prompt += '\n';
      }

      prompt += `You are analyzing a video. When referencing specific moments, use timestamps in the format [MM:SS].

Current question: ${question}

Provide a detailed response that references specific timestamps when relevant.`;

      const response = await this.generateContent(uri, mimeType, prompt, {
        thinkingConfig: {
          thinkingLevel: 'medium',
        },
      });

      const timestamps = this.parseTimestamps(response);

      return {
        response,
        referencedTimestamps: timestamps,
      };
    } catch (error) {
      logger.error('Error in chat:', error);
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

  /**
   * Parse timestamps from text response
   */
  private parseTimestamps(text: string): Array<{ start: number; end: number }> {
    const timestamps: Array<{ start: number; end: number }> = [];
    const timestampPattern = /\[(\d{1,2}):(\d{2})(?:-(\d{1,2}):(\d{2}))?\]/g;
    let match;

    while ((match = timestampPattern.exec(text)) !== null) {
      const startMinutes = parseInt(match[1]);
      const startSeconds = parseInt(match[2]);
      const start = startMinutes * 60 + startSeconds;

      if (match[3] && match[4]) {
        const endMinutes = parseInt(match[3]);
        const endSeconds = parseInt(match[4]);
        const end = endMinutes * 60 + endSeconds;
        timestamps.push({ start, end });
      } else {
        timestamps.push({ start, end: start + 5 });
      }
    }

    return timestamps;
  }

  /**
   * Generate conversation title based on first message
   */
  async generateConversationTitle(firstMessage: string, videoContext?: string): Promise<string> {
    try {
      const prompt = videoContext
        ? `Based on this video context: "${videoContext}" and this first message: "${firstMessage}", generate a concise, descriptive title for this conversation (max 50 characters).`
        : `Generate a concise, descriptive title for this conversation based on this first message: "${firstMessage}" (max 50 characters).`;

      const response = await axios.post(
        `${this.baseUrl}/models/gemini-3-flash-preview:generateContent`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            thinkingConfig: { thinkingLevel: 'minimal' },
          },
        },
        {
          headers: {
            'x-goog-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      let title = response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Video Conversation';
      title = title.replace(/^["']|["']$/g, '');
      if (title.length > 50) {
        title = title.substring(0, 47) + '...';
      }
      return title;
    } catch (error) {
      logger.warn('Error generating conversation title:', error);
      return 'Video Conversation';
    }
  }

  /**
   * Analyze with custom prompt
   */
  async analyzeWithCustomPrompt(
    filePath: string,
    prompt: string
  ): Promise<{ analysis: string; referencedTimestamps?: Array<{ start: number; end: number }> }> {
    try {
      const { uri, mimeType } = await this.uploadVideoFile(filePath);

      const enhancedPrompt = `${prompt}

When referencing specific moments in your analysis, use timestamps in the format [MM:SS] or [MM:SS-MM:SS].`;

      const response = await this.generateContent(uri, mimeType, enhancedPrompt, {
        thinkingConfig: { thinkingLevel: 'medium' },
      });

      const timestamps = this.parseTimestamps(response);

      return {
        analysis: response,
        referencedTimestamps: timestamps,
      };
    } catch (error) {
      logger.error('Error in custom analysis:', error);
      throw error;
    }
  }

  /**
   * Analyze query context (text only, no video)
   */
  async analyzeQueryContext(query: string, context?: string): Promise<string> {
    try {
      const prompt = context
        ? `Query: "${query}"\nContext: "${context}"\nProvide analysis based on the query and context.`
        : `Analyze this search query: "${query}"`;

      const response = await axios.post(
        `${this.baseUrl}/models/gemini-3-flash-preview:generateContent`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            thinkingConfig: { thinkingLevel: 'minimal' },
          },
        },
        {
          headers: {
            'x-goog-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (error) {
      logger.error('Error analyzing query context:', error);
      throw error;
    }
  }

  /**
   * Analyze specific video segment
   */
  async analyzeVideoSegment(
    videoFile: string,
    startTime: number,
    endTime: number,
    prompt: string
  ): Promise<string> {
    try {
      const { uri, mimeType } = await this.uploadVideoFile(videoFile);

      const extendedPrompt = `Please analyze the specific segment of this video from ${startTime} to ${endTime} seconds.

${prompt}

Focus specifically on what's happening in the time range ${startTime}s to ${endTime}s.`;

      const response = await this.generateContent(uri, mimeType, extendedPrompt, {
        thinkingConfig: { thinkingLevel: 'medium' },
      });

      return response;
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
