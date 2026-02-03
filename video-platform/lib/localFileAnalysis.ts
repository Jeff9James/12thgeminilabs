// Local File Analysis with Gemini API
// Analyze local files chunk-by-chunk without uploading the entire file

import type { IndexedFile, FileAnalysisResult } from './localFileIndex';
import { updateFileAnalysis } from './localFileIndex';

const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
const MAX_CHUNKS_TO_ANALYZE = 10; // Analyze first 10MB for large files

export interface AnalysisProgress {
  fileId: string;
  fileName: string;
  stage: 'reading' | 'chunking' | 'analyzing' | 'complete' | 'error';
  progress: number; // 0-100
  currentChunk?: number;
  totalChunks?: number;
  message?: string;
  error?: string;
}

// Analyze a local file with Gemini
export async function analyzeLocalFile(
  file: IndexedFile,
  onProgress?: (progress: AnalysisProgress) => void
): Promise<FileAnalysisResult> {
  const reportProgress = (stage: AnalysisProgress['stage'], progress: number, message?: string) => {
    if (onProgress) {
      onProgress({
        fileId: file.id,
        fileName: file.name,
        stage,
        progress,
        message,
      });
    }
  };

  try {
    reportProgress('reading', 0, 'Reading file...');

    // Get the actual file from the handle
    if (!file.handle) {
      throw new Error('File handle not available');
    }

    const fileObj = await file.handle.getFile();

    // Check file type and handle accordingly
    const fileType = file.type || fileObj.type;

    let analysisResult: FileAnalysisResult;

    if (fileType.startsWith('text/') || fileType.includes('json') || fileType.includes('csv')) {
      analysisResult = await analyzeTextFile(fileObj, reportProgress);
    } else if (fileType.startsWith('image/')) {
      analysisResult = await analyzeImageFile(fileObj, reportProgress);
    } else if (fileType.startsWith('video/')) {
      analysisResult = await analyzeVideoFile(fileObj, reportProgress);
    } else if (fileType.startsWith('audio/')) {
      analysisResult = await analyzeAudioFile(fileObj, reportProgress);
    } else if (fileType === 'application/pdf') {
      analysisResult = await analyzePDFFile(fileObj, reportProgress);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    reportProgress('complete', 100, 'Analysis complete!');

    // Save analysis result to index
    await updateFileAnalysis(file.id, analysisResult);

    return analysisResult;
  } catch (error) {
    reportProgress('error', 0, (error as Error).message);
    throw error;
  }
}

// Analyze text file
async function analyzeTextFile(
  file: File,
  reportProgress: (stage: AnalysisProgress['stage'], progress: number, message?: string) => void
): Promise<FileAnalysisResult> {
  reportProgress('reading', 10, 'Reading text content...');

  const text = await file.text();
  const chunks = chunkText(text, CHUNK_SIZE);

  reportProgress('analyzing', 30, `Analyzing ${chunks.length} chunks...`);

  // For large files, only analyze first few chunks
  const chunksToAnalyze = chunks.slice(0, MAX_CHUNKS_TO_ANALYZE);

  const prompt = `Analyze this text document and provide:
1. A brief summary (2-3 sentences)
2. Key keywords/topics (up to 10)
3. Main topics covered
4. Named entities mentioned
5. Overall sentiment (positive/negative/neutral)
6. Language detected

Text content:
${chunksToAnalyze.join('\n\n')}

Respond in JSON format:
{
  "summary": "...",
  "keywords": ["..."],
  "topics": ["..."],
  "entities": ["..."],
  "sentiment": "positive|negative|neutral",
  "language": "en",
  "confidence": 0.95
}`;

  const response = await callGeminiAPI(prompt);
  reportProgress('analyzing', 90, 'Processing results...');

  return parseAnalysisResponse(response);
}

// Analyze image file
async function analyzeImageFile(
  file: File,
  reportProgress: (stage: AnalysisProgress['stage'], progress: number, message?: string) => void
): Promise<FileAnalysisResult> {
  reportProgress('reading', 10, 'Reading image...');

  const base64 = await fileToBase64(file);

  reportProgress('analyzing', 30, 'Analyzing image with AI...');

  const prompt = `Analyze this image and provide:
1. A brief description
2. Key objects/subjects identified
3. Main themes/topics
4. Dominant colors (provide a list of 3-5 main colors)
5. Any text detected (OCR)
6. Overall sentiment/mood

Respond in JSON format:
{
  "summary": "...",
  "keywords": ["..."],
  "topics": ["..."],
  "entities": ["..."],
  "colors": ["red", "blue", ...],
  "sentiment": "positive|negative|neutral",
  "confidence": 0.95
}`;

  const response = await callGeminiAPIWithImage(prompt, base64, file.type);
  reportProgress('analyzing', 90, 'Processing results...');

  return parseAnalysisResponse(response);
}

// Analyze video file (extract metadata and first frame)
async function analyzeVideoFile(
  file: File,
  reportProgress: (stage: AnalysisProgress['stage'], progress: number, message?: string) => void
): Promise<FileAnalysisResult> {
  reportProgress('analyzing', 30, 'Analyzing video metadata...');

  // For now, just return basic metadata
  // In production, you'd upload to Gemini File API or extract frames
  return {
    summary: `Video file: ${file.name}`,
    keywords: ['video', 'media'],
    topics: ['video content'],
    entities: [],
    sentiment: 'neutral',
    confidence: 0.5,
  };
}

// Analyze audio file
async function analyzeAudioFile(
  file: File,
  reportProgress: (stage: AnalysisProgress['stage'], progress: number, message?: string) => void
): Promise<FileAnalysisResult> {
  reportProgress('analyzing', 30, 'Analyzing audio metadata...');

  // For now, just return basic metadata
  // In production, you'd upload to Gemini File API for transcription
  return {
    summary: `Audio file: ${file.name}`,
    keywords: ['audio', 'media'],
    topics: ['audio content'],
    entities: [],
    sentiment: 'neutral',
    confidence: 0.5,
  };
}

// Analyze PDF file
async function analyzePDFFile(
  file: File,
  reportProgress: (stage: AnalysisProgress['stage'], progress: number, message?: string) => void
): Promise<FileAnalysisResult> {
  reportProgress('analyzing', 30, 'Analyzing PDF...');

  // For now, just return basic metadata
  // In production, you'd use PDF parsing library or upload to Gemini
  return {
    summary: `PDF document: ${file.name}`,
    keywords: ['document', 'pdf'],
    topics: ['document content'],
    entities: [],
    sentiment: 'neutral',
    confidence: 0.5,
  };
}

// Helper: Chunk text into smaller pieces
function chunkText(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    chunks.push(text.slice(start, start + chunkSize));
    start += chunkSize;
  }

  return chunks;
}

// Helper: Convert file to base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Call Gemini API for text analysis
async function callGeminiAPI(prompt: string): Promise<string> {
  try {
    const response = await fetch('/api/analyze-local-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, type: 'text' }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error('[LocalFileAnalysis] Gemini API error:', error);
    throw error;
  }
}

// Call Gemini API with image
async function callGeminiAPIWithImage(
  prompt: string,
  base64Image: string,
  mimeType: string
): Promise<string> {
  try {
    const response = await fetch('/api/analyze-local-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        type: 'image',
        image: base64Image,
        mimeType,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error('[LocalFileAnalysis] Gemini API error:', error);
    throw error;
  }
}

// Parse Gemini response
function parseAnalysisResponse(response: string): FileAnalysisResult {
  try {
    // Try to parse as JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const json = JSON.parse(jsonMatch[0]);
      return {
        summary: json.summary || '',
        keywords: json.keywords || [],
        topics: json.topics || [],
        entities: json.entities || [],
        colors: json.colors || [],
        sentiment: json.sentiment || 'neutral',
        language: json.language || 'en',
        confidence: json.confidence || 0.8,
      };
    }

    // Fallback: extract information from plain text
    return {
      summary: response.slice(0, 200),
      keywords: [],
      topics: [],
      entities: [],
      sentiment: 'neutral',
      confidence: 0.5,
    };
  } catch (error) {
    console.error('[LocalFileAnalysis] Error parsing response:', error);
    return {
      summary: 'Analysis failed',
      keywords: [],
      topics: [],
      entities: [],
      sentiment: 'neutral',
      confidence: 0,
    };
  }
}

// Batch analyze multiple files
export async function batchAnalyzeFiles(
  files: IndexedFile[],
  onProgress?: (fileProgress: AnalysisProgress) => void,
  onComplete?: (fileId: string, result: FileAnalysisResult) => void
): Promise<Map<string, FileAnalysisResult>> {
  const results = new Map<string, FileAnalysisResult>();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    try {
      const result = await analyzeLocalFile(file, onProgress);
      results.set(file.id, result);

      if (onComplete) {
        onComplete(file.id, result);
      }
    } catch (error) {
      console.error(`[LocalFileAnalysis] Error analyzing ${file.name}:`, error);
      if (onProgress) {
        onProgress({
          fileId: file.id,
          fileName: file.name,
          stage: 'error',
          progress: 0,
          error: (error as Error).message,
        });
      }
    }

    // Small delay between files to avoid rate limiting
    if (i < files.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

// Check if file needs re-analysis (file modified since last analysis)
export async function needsReanalysis(file: IndexedFile): Promise<boolean> {
  if (!file.analyzed || !file.analyzedAt) {
    return true; // Never analyzed
  }

  if (!file.handle) {
    return false; // Can't check
  }

  try {
    const fileObj = await file.handle.getFile();
    return fileObj.lastModified > file.analyzedAt;
  } catch (error) {
    console.error('[LocalFileAnalysis] Error checking file modification:', error);
    return false;
  }
}

// Smart analysis: Only analyze if needed
export async function smartAnalyzeFile(
  file: IndexedFile,
  forceReanalyze: boolean = false,
  onProgress?: (progress: AnalysisProgress) => void
): Promise<FileAnalysisResult> {
  // Check if file needs analysis
  if (!forceReanalyze && file.analyzed && file.analysisResult) {
    const needs = await needsReanalysis(file);
    if (!needs) {
      console.log('[LocalFileAnalysis] Using cached analysis for:', file.name);
      return file.analysisResult;
    }
  }

  // Perform fresh analysis
  return await analyzeLocalFile(file, onProgress);
}
