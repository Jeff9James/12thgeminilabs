# PHASE 5: Google Gemini 3 Integration & Multimodal Analysis

## TASK TITLE: Build Gemini-Powered Video Understanding Web App - Phase 5: Gemini 3 API Integration

**PRIORITY: CRITICAL** - Core AI integration for video understanding

---

## FULL PROMPT FOR AI CODING AGENT:

Implement complete Google Gemini 3 API integration to perform multimodal video analysis. This phase leverages Gemini's temporal and spatial reasoning capabilities to replicate TwelveLabs' Marengo and Pegasus models.

### API ARCHITECTURE REQUIREMENTS:

- **Gemini 3 Models**: Use `gemini-1.5-pro` for comprehensive analysis
- **Multimodal Input**: Send video frames + audio context + text prompts
- **Temporal Reasoning**: Analyze sequences across time
- **Spatial Reasoning**: Detect objects, scenes, actions in frames
- **Batch Processing**: Send multiple frames in single API call
- **Streaming Responses**: Handle long-running analysis
- **Error Handling**: Retry logic, rate limit handling
- **Cost Optimization**: Frame sampling strategies
- **Response Parsing**: Structured JSON extraction
- **Safety Filters**: Handle inappropriate content

### DELIVERABLES:

**File: src/services/geminiApi.ts**
```typescript
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { VideoMetadata, ExtractedFrame } from './videoProcessing';
import { AnalysisResult } from '../types';

// Gemini 3 API Configuration
const GEMINI_CONFIG = {
  API_KEY: import.meta.env.VITE_GEMINI_API_KEY,
  MODEL_NAME: 'gemini-1.5-pro',
  MAX_BATCH_FRAMES: 10, // Frames per API call
  MAX_VIDEO_DURATION: 3600, // 1 hour in seconds
  RATE_LIMIT_DELAY: 1000, // ms between batches
  MAX_RETRIES: 3,
  TIMEOUT_MS: 120000, // 2 minutes
} as const;

export interface GeminiAnalysisRequest {
  frames: ExtractedFrame[];
  metadata: VideoMetadata;
  prompt: string;
  analysisType: 'summary' | 'temporal' | 'spatial' | 'search' | 'qa';
}

export interface GeminiResponse {
  summary?: {
    title: string;
    description: string;
    topics: string[];
    entities: Array<{ name: string; type: string }>;
  };
  temporalAnalysis?: {
    segments: Array<{
      startTime: number;
      endTime: number;
      description: string;
      actions: string[];
      keyFrames: number[]; // indices of key frames
    }>;
  };
  spatialAnalysis?: {
    scenes: Array<{
      timestamp: number;
      description: string;
      objects: Array<{
        name: string;
        confidence: number;
        attributes?: string[];
      }>;
      location?: string;
      lighting?: string;
      composition?: string;
    }>;
    objectTimeline: Array<{
      object: string;
      appearances: Array<{
        startTime: number;
        endTime?: number;
        position?: string;
      }>;
    }>;
  };
  audioAnalysis?: {
    speechContent: string;
    detectedLanguages: string[];
    backgroundSounds: string[];
    music: Array<{
      timestamp: number;
      genre?: string;
      mood?: string;
    }>;
  };
  searchResults?: Array<{
    timestamp: number;
    relevance: number;
    context: string;
    visualMatch: boolean;
    audioMatch: boolean;
  }>;
}

class GeminiAPIService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;

  constructor() {
    if (!GEMINI_CONFIG.API_KEY) {
      throw new Error('Gemini API key not configured');
    }
    
    this.genAI = new GoogleGenerativeAI(GEMINI_CONFIG.API_KEY);
    this.initializeModel();
  }

  private initializeModel(): void {
    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];

    this.model = this.genAI.getGenerativeModel({
      model: GEMINI_CONFIG.MODEL_NAME,
      safetySettings,
      generationConfig: {
        temperature: 0.3, // Lower temperature for more consistent analysis
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 8192,
      },
    });
  }

  // Main analysis entry point
  async analyzeVideo(request: GeminiAnalysisRequest): Promise<AnalysisResult> {
    const { frames, metadata, prompt, analysisType } = request;
    
    // Validate inputs
    if (frames.length === 0) {
      throw new Error('No frames provided for analysis');
    }

    if (metadata.duration > GEMINI_CONFIG.MAX_VIDEO_DURATION) {
      throw new Error(`Video too long. Maximum duration is 1 hour`);
    }

    try {
      let geminiResponse: GeminiResponse;

      switch (analysisType) {
        case 'summary':
          geminiResponse = await this.generateSummary(frames, metadata, prompt);
          break;
        case 'temporal':
          geminiResponse = await this.analyzeTemporalSequence(frames, metadata, prompt);
          break;
        case 'spatial':
          geminiResponse = await this.analyzeSpatialContent(frames, metadata, prompt);
          break;
        case 'search':
          geminiResponse = await this.performSearch(frames, metadata, prompt);
          break;
        case 'qa':
          geminiResponse = await this.answerQuestion(frames, metadata, prompt);
          break;
        default:
          throw new Error(`Unknown analysis type: ${analysisType}`);
      }

      // Convert Gemini format to our AnalysisResult format
      return this.convertToAnalysisResult(geminiResponse, request);
    } catch (error) {
      console.error('Gemini analysis failed:', error);
      throw this.handleError(error);
    }
  }

  // Generate comprehensive video summary
  private async generateSummary(
    frames: ExtractedFrame[],
    metadata: VideoMetadata,
    customPrompt?: string
  ): Promise<GeminiResponse> {
    const prompt = customPrompt || `
      Analyze this video and provide:
      1. A concise, descriptive title (max 80 characters)
      2. A detailed description of the main content and narrative
      3. List of 5-10 key topics discussed or shown
      4. Named entities (people, places, products) mentioned or visible
      
      Focus on both visual content and any text/dialogue visible in frames.
      Format as JSON with keys: title, description, topics (array), entities (array of {name, type}).
      Be specific and accurate. If uncertain about something, indicate low confidence.
    `;

    const result = await this.batchProcessWithRetry(async () => {
      const promptWithFrames = `
        VIDEO METADATA:
        - Duration: ${metadata.duration.toFixed(2)} seconds
        - Resolution: ${metadata.width}x${metadata.height}
        - FPS: ${metadata.fps}
        - Has Audio: ${metadata.hasAudio}
        
        ${prompt}
      `;

      const imageParts = frames.map(frame => ({
        inlineData: {
          data: frame.base64.split(',')[1], // Remove data URL prefix
          mimeType: 'image/jpeg'
        }
      }));

      const chat = this.model.startChat();
      const result = await chat.sendMessage([
        promptWithFrames,
        ...imageParts
      ]);

      return this.parseJSONResponse(result.response.text());
    });

    return { summary: result };
  }

  // Analyze temporal sequence and narrative flow
  private async analyzeTemporalSequence(
    frames: ExtractedFrame[],
    metadata: VideoMetadata,
    customPrompt?: string
  ): Promise<GeminiResponse> {
    const prompt = customPrompt || `
      Analyze the temporal sequence of this video:
      1. Divide into logical segments based on scene/activity changes
      2. For each segment: start time, end time, description, key actions
      3. Identify the key frames that best represent each segment
      4. Describe the progression and narrative flow
      
      Format as JSON with:
      {
        "segments": [
          {
            "startTime": number,
            "endTime": number,
            "description": string,
            "actions": string[],
            "keyFrames": number[]
          }
        ]
      }
      Times are in seconds. Frame indices refer to the provided frames array.
    `;

    const result = await this.batchProcessWithRetry(async () => {
      const imageParts = frames.map((frame, index) => ({
        inlineData: {
          data: frame.base64.split(',')[1],
          mimeType: 'image/jpeg'
        },
        metadata: { timestamp: frame.timestamp, index }
      }));

      const chat = this.model.startChat();
      const result = await chat.sendMessage([
        prompt,
        ...imageParts
      ]);

      return this.parseJSONResponse(result.response.text());
    });

    return { temporalAnalysis: result };
  }

  // Analyze spatial content in frames
  private async analyzeSpatialContent(
    frames: ExtractedFrame[],
    metadata: VideoMetadata,
    customPrompt?: string
  ): Promise<GeminiResponse> {
    const prompt = customPrompt || `
      Analyze the spatial content and visual elements:
      1. For each key frame: describe scene, objects, location, lighting, composition
      2. List all objects detected with confidence levels
      3. Track objects across frames (timeline of appearances)
      4. Identify scene changes and transitions
      5. Describe backgrounds, settings, and environments
      
      Format as JSON with:
      {
        "scenes": [
          {
            "timestamp": number,
            "description": string,
            "objects": [{"name": string, "confidence": number, "attributes": string[]}],
            "location": string,
            "lighting": string,
            "composition": string
          }
        ],
        "objectTimeline": [
          {
            "object": string,
            "appearances": [{"startTime": number, "endTime": number, "position": string}]
          }
        ]
      }
    `;

    const result = await this.batchProcessWithRetry(async () => {
      const selectedFrames = this.selectRepresentativeFrames(frames, 15);
      
      const imageParts = selectedFrames.map(frame => ({
        inlineData: {
          data: frame.base64.split(',')[1],
          mimeType: 'image/jpeg'
        },
        metadata: { timestamp: frame.timestamp }
      }));

      const chat = this.model.startChat();
      const result = await chat.sendMessage([
        prompt,
        ...imageParts
      ]);

      return this.parseJSONResponse(result.response.text());
    });

    return { spatialAnalysis: result };
  }

  // Semantic search across video content
  private async performSearch(
    frames: ExtractedFrame[],
    metadata: VideoMetadata,
    query: string
  ): Promise<GeminiResponse> {
    const prompt = `
      Search this video for: "${query}"
      
      Return results as JSON:
      {
        "searchResults": [
          {
            "timestamp": number,
            "relevance": number (0-1),
            "context": string,
            "visualMatch": boolean,
            "audioMatch": boolean
          }
        ]
      }
      
      Include up to 10 most relevant results. Relevance should be based on:
      - Visual content matching the query
      - Text/dialogue in frames matching the query
      - Context and semantic meaning
    `;

    const result = await this.batchProcessWithRetry(async () => {
      const imageParts = frames.map(frame => ({
        inlineData: {
          data: frame.base64.split(',')[1],
          mimeType: 'image/jpeg'
        }
      }));

      const chat = this.model.startChat();
      const result = await chat.sendMessage([
        prompt,
        ...imageParts
      ]);

      return this.parseJSONResponse(result.response.text());
    });

    return result;
  }

  // Answer specific questions about video
  private async answerQuestion(
    frames: ExtractedFrame[],
    metadata: VideoMetadata,
    question: string
  ): Promise<GeminiResponse> {
    const prompt = `
      Answer this question about the video: "${question}"
      
      If the answer is not in the video, respond with "I cannot find this information in the video."
      Be specific and cite timestamps when relevant.
      
      Provide response as JSON:
      {
        "answer": string,
        "confidence": number (0-1),
        "timestamp": number (if applicable),
        "context": string
      }
    `;

    const result = await this.batchProcessWithRetry(async () => {
      const imageParts = frames.map(frame => ({
        inlineData: {
          data: frame.base64.split(',')[1],
          mimeType: 'image/jpeg'
        }
      }));

      const chat = this.model.startChat();
      const result = await chat.sendMessage([
        prompt,
        ...imageParts
      ]);

      return this.parseJSONResponse(result.response.text());
    });

    return result;
  }

  // Batch process frames with retry logic
  private async batchProcessWithRetry<T>(
    operation: () => Promise<T>,
    retries: number = GEMINI_CONFIG.MAX_RETRIES
  ): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i < retries; i++) {
      try {
        // Rate limiting
        if (this.requestQueue.length > 0) {
          await this.processQueue();
        }
        
        // Add to queue and wait
        return await this.addToQueue(operation);
      } catch (error) {
        lastError = error as Error;
        
        // Check if it's a rate limit error
        if (error.message?.includes('429') || error.message?.includes('quota')) {
          const delay = Math.pow(2, i) * 1000; // Exponential backoff
          console.warn(`Rate limited. Retrying in ${delay}ms...`);
          await this.delay(delay);
        } else if (i < retries - 1) {
          const delay = 1000 * (i + 1);
          await this.delay(delay);
        } else {
          throw error;
        }
      }
    }
    
    throw lastError!;
  }

  // Queue management for rate limiting
  private async addToQueue<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const operation = this.requestQueue.shift()!;
      
      try {
        await operation();
        await this.delay(GEMINI_CONFIG.RATE_LIMIT_DELAY);
      } catch (error) {
        console.error('Queue operation failed:', error);
      }
    }
    
    this.isProcessingQueue = false;
  }

  // Select representative frames for analysis
  private selectRepresentativeFrames(frames: ExtractedFrame[], maxCount: number): ExtractedFrame[] {
    if (frames.length <= maxCount) return frames;
    
    const step = Math.floor(frames.length / maxCount);
    const selected: ExtractedFrame[] = [];
    
    for (let i = 0; i < maxCount; i++) {
      const index = Math.min(i * step, frames.length - 1);
      selected.push(frames[index]);
    }
    
    return selected;
  }

  // Parse JSON response from Gemini
  private parseJSONResponse(responseText: string): any {
    try {
      // Clean up common response artifacts
      let cleanedText = responseText.trim();
      
      // Remove markdown code blocks if present
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }
      
      return JSON.parse(cleanedText);
    } catch (error) {
      console.error('Failed to parse Gemini response:', responseText);
      throw new Error(`Invalid JSON response from Gemini: ${responseText.substring(0, 200)}...`);
    }
  }

  // Convert Gemini format to our AnalysisResult format
  private convertToAnalysisResult(
    geminiResponse: GeminiResponse,
    request: GeminiAnalysisRequest
  ): AnalysisResult {
    const baseResult: AnalysisResult = {
      id: crypto.randomUUID(),
      videoId: crypto.randomUUID(), // Will be overridden by caller
      videoName: '', // Will be set by caller
      status: 'completed',
      createdAt: new Date()
    };

    if (geminiResponse.summary) {
      baseResult.summary = {
        title: geminiResponse.summary.title,
        description: geminiResponse.summary.description,
        keyTopics: geminiResponse.summary.topics || []
      };
    }

    if (geminiResponse.temporalAnalysis) {
      baseResult.temporalSegments = geminiResponse.temporalAnalysis.segments.map(seg => ({
        startTime: seg.startTime,
        endTime: seg.endTime,
        description: seg.description,
        keyFrames: seg.keyFrames.map(idx => request.frames[idx].base64)
      }));
    }

    if (geminiResponse.spatialAnalysis) {
      const objectMap = new Map<string, { confidence: number; timestamp: number }[]>();
      
      geminiResponse.spatialAnalysis.scenes.forEach(scene => {
        scene.objects.forEach(obj => {
          if (!objectMap.has(obj.name)) {
            objectMap.set(obj.name, []);
          }
          objectMap.get(obj.name)!.push({
            confidence: obj.confidence,
            timestamp: scene.timestamp
          });
        });
      });

      baseResult.spatialAnalysis = {
        objectsDetected: Array.from(objectMap.entries()).map(([name, detections]) => ({
          label: name,
          confidence: Math.max(...detections.map(d => d.confidence)),
          timestamp: detections[0].timestamp
        })),
        sceneChanges: geminiResponse.spatialAnalysis.scenes.map(scene => ({
          timestamp: scene.timestamp,
          description: scene.description
        }))
      };
    }

    return baseResult;
  }

  // Error handling with user-friendly messages
  private handleError(error: any): Error {
    if (error.message?.includes('API key')) {
      return new Error('Invalid Gemini API key. Please check your configuration.');
    }
    
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      return new Error('Rate limit exceeded. Please try again in a minute.');
    }
    
    if (error.message?.includes('safety')) {
      return new Error('Content blocked by safety filters. The video may contain inappropriate content.');
    }
    
    if (error.message?.includes('timeout')) {
      return new Error('Analysis timed out. The video may be too long or complex.');
    }
    
    return error;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const geminiApi = new GeminiAPIService();

// Export for testing
export { GEMINI_CONFIG };
```

**File: src/hooks/useVideoAnalysis.ts**
```typescript
import { useState, useCallback } from 'react';
import { geminiApi, GeminiAnalysisRequest } from '../services/geminiApi';
import { videoProcessor } from '../services/videoProcessing';
import { AnalysisResult, VideoFile } from '../types';

interface UseVideoAnalysisOptions {
  onProgress?: (progress: { stage: string; progress: number }) => void;
}

export const useVideoAnalysis = (options: UseVideoAnalysisOptions = {}) => {
  const { onProgress } = options;
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<string>('');

  // Full video analysis
  const analyzeVideo = useCallback(async (
    videoFile: VideoFile
  ): Promise<AnalysisResult> => {
    try {
      setIsAnalyzing(true);
      setError(null);
      setCurrentStage('Extracting frames...');
      onProgress?.({ stage: 'Extracting frames...', progress: 10 });

      // Get file blob
      let blob: Blob;
      if (videoFile.file) {
        blob = videoFile.file;
      } else if (videoFile.driveFileId) {
        // Load from IndexedDB or re-download
        throw new Error('Drive file loading not implemented yet');
      } else {
        throw new Error('No video file available');
      }

      // Extract frames
      const frames = await videoProcessor.extractKeyframes(blob, {
        maxFrames: 30,
        onProgress: (p) => {
          setCurrentStage(p.message);
          onProgress?.({ stage: p.message, progress: 10 + (p.progress * 0.3) });
        }
      });

      // Get metadata
      const metadata = await videoProcessor.extractMetadata(blob);
      
      setCurrentStage('Generating summary...');
      onProgress?.({ stage: 'Generating summary...', progress: 40 });

      // Generate summary
      const summaryResult = await geminiApi.analyzeVideo({
        frames,
        metadata,
        prompt: '',
        analysisType: 'summary'
      });

      setCurrentStage('Analyzing temporal sequence...');
      onProgress?.({ stage: 'Analyzing temporal sequence...', progress: 55 });

      // Analyze temporal sequence
      const temporalResult = await geminiApi.analyzeVideo({
        frames,
        metadata,
        prompt: '',
        analysisType: 'temporal'
      });

      setCurrentStage('Analyzing spatial content...');
      onProgress?.({ stage: 'Analyzing spatial content...', progress: 70 });

      // Analyze spatial content
      const spatialResult = await geminiApi.analyzeVideo({
        frames,
        metadata,
        prompt: '',
        analysisType: 'spatial'
      });

      // Combine all results
      const combinedResult: AnalysisResult = {
        id: crypto.randomUUID(),
        videoId: videoFile.id,
        videoName: videoFile.name,
        status: 'completed',
        createdAt: new Date(),
        summary: summaryResult.summary,
        temporalSegments: temporalResult.temporalSegments,
        spatialAnalysis: spatialResult.spatialAnalysis
      };

      setCurrentStage('Complete');  
      onProgress?.({ stage: 'Complete', progress: 100 });

      setAnalysisResult(combinedResult);
      return combinedResult;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setError(message);
      throw err;
    } finally {
      setIsAnalyzing(false);
      setCurrentStage('');
    }
  }, [onProgress]);

  // Semantic search
  const searchVideo = useCallback(async (
    videoFile: VideoFile,
    query: string
  ): Promise<AnalysisResult> => {
    try {
      setIsAnalyzing(true);
      setError(null);
      setCurrentStage('Searching content...');

      // Reuse cached frames if available, otherwise extract
      let frames = videoProcessor.getFrames();
      if (frames.length === 0) {
        let blob: Blob;
        if (videoFile.file) {
          blob = videoFile.file;
        } else {
          throw new Error('No video file available');
        }
        frames = await videoProcessor.extractKeyframes(blob, { maxFrames: 30 });
      }

      const metadata = videoProcessor.getMetadata() || 
        await videoProcessor.extractMetadata(videoFile.file!);

      const searchResult = await geminiApi.analyzeVideo({
        frames,
        metadata,
        prompt: query,
        analysisType: 'search'
      });

      const result: AnalysisResult = {
        id: crypto.randomUUID(),
        videoId: videoFile.id,
        videoName: videoFile.name,
        status: 'completed',
        createdAt: new Date(),
        // Search-specific fields would be added here
      };

      setAnalysisResult(result);
      return result;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      setError(message);
      throw err;
    } finally {
      setIsAnalyzing(false);
      setCurrentStage('');
    }
  }, []);

  // Q&A about video
  const askQuestion = useCallback(async (
    videoFile: VideoFile,
    question: string
  ): Promise<string> => {
    try {
      setIsAnalyzing(true);
      setError(null);
      setCurrentStage('Thinking...');

      // Similar to search but with Q&A prompt
      const frames = videoProcessor.getFrames();
      const metadata = videoProcessor.getMetadata() || 
        await videoProcessor.extractMetadata(videoFile.file!);

      const qaResult = await geminiApi.analyzeVideo({
        frames,
        metadata,
        prompt: question,
        analysisType: 'qa'
      });

      return qaResult.summary?.description || 'No answer found';

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get answer';
      setError(message);
      throw err;
    } finally {
      setIsAnalyzing(false);
      setCurrentStage('');
    }
  }, []);

  return {
    analyzeVideo,
    searchVideo,
    askQuestion,
    isAnalyzing,
    analysisResult,
    error,
    currentStage
  };
};
```

### ACCEPTANCE CRITERIA FOR PHASE 5:

1. ✅ Gemini API initializes with correct API key
2. ✅ All 5 analysis types work (summary, temporal, spatial, search, qa)
3. ✅ Frames converted to proper format for Gemini
4. ✅ Batching implemented (10 frames per request)
5. ✅ Rate limiting enforced (1 second between requests)
6. ✅ Retry logic with exponential backoff
7. ✅ JSON response parsing robust to formatting variations
8. ✅ Safety filters configured and working
9. ✅ Error messages user-friendly and actionable
10. ✅ Analysis combines multiple Gemini calls correctly
11. ✅ Progress updates during multi-stage analysis
12. ✅ TypeScript types match Gemini API specification
13. ✅ Memory efficient frame processing
14. ✅ Timeout handling for long videos
15. ✅ Cost optimization strategies implemented

### TESTING CHECKLIST:

```bash
# Manual tests:
# 1. Full video analysis with 30 frames
# 2. Summary generation - verify JSON format
# 3. Temporal analysis - verify segment detection
# 4. Spatial analysis - verify object detection
# 5. Semantic search - verify relevance scoring
# 6. Q&A - verify accurate answers
# 7. Rate limiting - verify 1s delay between calls
# 8. Retry logic - test with network failures
# 9. Invalid API key - verify error message
# 10. Long video timeout - verify error handling
# 11. Safety filter - test with inappropriate content
# 12. Progress tracking - verify stage updates
```

### PERFORMANCE REQUIREMENTS:

- Gemini API response: <30 seconds per batch
- Frame preparation: <2 seconds total
- JSON parsing: <100ms
- Retry delay: exponential (1s, 2s, 4s)
- Memory: <100MB during analysis
- Queue processing: sequential (no parallel)

### COST OPTIMIZATION:

- Max 30 frames per video (configurable)
- 10 frames per API call (batching)
- Lower temperature (0.3) for consistency
- Skip audio analysis to save tokens
- Cache frames for repeated queries
- Use smaller frame dimensions (resize before sending)

### ERROR RECOVERY:

- Rate limit: wait and retry
- Timeout: reduce batch size on retry
- Invalid response: retry with simpler prompt
- Network error: retry with exponential backoff
- Safety block: show user-friendly message
- API quota: queue requests and throttle