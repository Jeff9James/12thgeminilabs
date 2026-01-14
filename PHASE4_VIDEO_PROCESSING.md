# PHASE 4: Video Upload & Local Processing Engine

## TASK TITLE: Build Gemini-Powered Video Understanding Web App - Phase 4: Video Upload & WebCodecs Processing

**PRIORITY: HIGH** - Client-side video processing without backend is critical

---

## FULL PROMPT FOR AI CODING AGENT:

Implement complete video upload and processing system using browser WebCodecs API for frame extraction, metadata analysis, and video preparation. This enables client-side temporal and spatial analysis without server-side processing.

### ARCHITECTURAL REQUIREMENTS:

- **Upload Methods**: 
  1. Local file drag-and-drop
  2. File browser selection
  3. Direct upload from Google Drive (Phase 3 integration)
  4. Video URL/paste link (optional)

- **WebCodecs API Integration**:
  - Decode video frames client-side
  - Extract keyframes at regular intervals
  - Generate thumbnails for UI
  - Analyze video metadata (duration, resolution, FPS)
  - Calculate temporal segments
  - Extract audio waveform (optional)

- **File Handling**:
  - Support MP4, WebM, MOV formats
  - Validate file types and sizes
  - Progress indicators for large files
  - Cancelable uploads/processing
  - Error handling for corrupted files
  - Memory management for large videos

- **Performance Optimizations**:
  - Web Workers for heavy processing
  - OffscreenCanvas for frame extraction
  - Stream processing instead of loading entire file
  - FPS reduction for long videos
  - Adaptive quality based on file size

### DELIVERABLES:

**File: src/services/videoProcessing.ts**
```typescript
export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  audioCodec?: string;
  hasAudio: boolean;
  size: number;
}

export interface ExtractedFrame {
  timestamp: number;
  blob: Blob;
  base64: string;
  isKeyframe: boolean;
}

export interface ProcessingProgress {
  stage: 'uploading' | 'decoding' | 'extracting' | 'complete' | 'error';
  progress: number;
  message: string;
  error?: string;
}

export class VideoProcessor {
  private abortController: AbortController | null = null;
  private metadata: VideoMetadata | null = null;
  private frames: ExtractedFrame[] = [];
  private worker: Worker | null = null;

  // Initialize Web Worker for heavy processing
  private initializeWorker(): void {
    if (this.worker) return;
    
    const workerCode = `
      let videoDecoder = null;
      let frameCount = 0;
      let extractedFrames = [];
      
      self.onmessage = async (e) => {
        const { type, data } = e.data;
        
        if (type === 'initialize') {
          const { format, codec, width, height } = data;
          // Initialize decoder
          try {
            const support = await VideoDecoder.isConfigSupported({
              codec: codec,
              codedWidth: width,
              codedHeight: height
            });
            
            if (support.supported) {
              videoDecoder = new VideoDecoder({
                output: (frame) => {
                  // Process decoded frame
                  frameCount++;
                  
                  // Send frame data back to main thread
                  self.postMessage({
                    type: 'frame',
                    data: {
                      timestamp: frame.timestamp,
                      count: frameCount
                    }
                  });
                  
                  frame.close();
                },
                error: (error) => {
                  self.postMessage({
                    type: 'error',
                    error: error.message
                  });
                }
              });
              
              videoDecoder.configure({
                codec: codec,
                codedWidth: width,
                codedHeight: height
              });
              
              self.postMessage({ type: 'ready' });
            } else {
              throw new Error('Codec not supported');
            }
          } catch (error) {
            self.postMessage({
              type: 'error',
              error: error.message
            });
          }
        }
        
        if (type === 'process-chunk' && videoDecoder) {
          const { chunk } = data;
          try {
            videoDecoder.decode(new EncodedVideoChunk(chunk));
          } catch (error) {
            self.postMessage({
              type: 'error',
              error: error.message
            });
          }
        }
        
        if (type === 'finalize') {
          if (videoDecoder) {
            await videoDecoder.flush();
            self.postMessage({
              type: 'complete',
              frameCount: frameCount
            });
          }
        }
      };
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));
  }

  // Extract metadata from video file
  async extractMetadata(file: File | Blob): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      
      video.preload = 'metadata';
      video.src = url;
      
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        
        this.metadata = {
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          fps: 30, // Will be refined during decoding
          codec: 'h264', // Default, will be updated
          hasAudio: video.webkitAudioDecodedByteCount > 0,
          size: file.size
        };
        
        resolve(this.metadata);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video metadata'));
      };
    });
  }

  // Extract keyframes using WebCodecs API
  async extractKeyframes(
    file: File | Blob,
    options: {
      maxFrames?: number;
      quality?: number;
      onProgress?: (progress: ProcessingProgress) => void;
    } = {}
  ): Promise<ExtractedFrame[]> {
    const { maxFrames = 30, quality = 0.8, onProgress } = options;
    
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    
    try {
      onProgress?.({
        stage: 'uploading',
        progress: 0,
        message: 'Reading video file...'
      });
      
      // Get metadata first
      const metadata = await this.extractMetadata(file);
      
      onProgress?.({
        stage: 'decoding',
        progress: 10,
        message: 'Decoding video...'
      });
      
      // Calculate frame extraction intervals
      const duration = metadata.duration;
      const frameInterval = duration / maxFrames;
      
      this.frames = [];
      let processedFrames = 0;
      
      // Create video element for frame extraction
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      video.src = url;
      video.crossOrigin = 'anonymous';
      
      await new Promise((resolve) => {
        video.onloadeddata = resolve;
      });
      
      // Extract frames at calculated intervals
      for (let i = 0; i < maxFrames; i++) {
        if (signal.aborted) {
          throw new Error('Processing cancelled');
        }
        
        const timestamp = i * frameInterval;
        
        onProgress?.({
          stage: 'extracting',
          progress: 10 + (i / maxFrames) * 80,
          message: `Extracting frame ${i + 1} of ${maxFrames}...`
        });
        
        // Seek to timestamp
        await new Promise<void>((resolve, reject) => {
          video.currentTime = timestamp;
          video.onseeked = () => resolve();
          video.onerror = () => reject(new Error('Seek failed'));
        });
        
        // Capture frame
        const canvas = document.createElement('canvas');
        canvas.width = metadata.width;
        canvas.height = metadata.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context not available');
        
        ctx.drawImage(video, 0, 0);
        
        // Convert to blob and base64
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
          }, 'image/jpeg', quality);
        });
        
        const base64 = await this.blobToBase64(blob);
        
        this.frames.push({
          timestamp,
          blob,
          base64,
          isKeyframe: i === 0 || i === maxFrames - 1
        });
        
        processedFrames++;
      }
      
      URL.revokeObjectURL(url);
      
      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: `Extracted ${processedFrames} frames successfully`
      });
      
      return this.frames;
      
    } catch (error) {
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: 'Failed to extract frames',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Process video in chunks for large files
  async processVideoInChunks(
    file: File,
    chunkSize: number = 50 * 1024 * 1024, // 50MB chunks
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<void> {
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    for (let i = 0; i < totalChunks; i++) {
      if (this.abortController?.signal.aborted) {
        throw new Error('Processing cancelled');
      }
      
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      
      onProgress?.({
        stage: 'extracting',
        progress: (i / totalChunks) * 100,
        message: `Processing chunk ${i + 1} of ${totalChunks}...`
      });
      
      // Process chunk (implementation depends on WebCodecs support)
      await this.processChunk(chunk, i);
    }
  }

  // Process individual chunk
  private async processChunk(chunk: Blob, chunkIndex: number): Promise<void> {
    // Implementation depends on video format and WebCodecs support
    // This is a placeholder for advanced chunk-based processing
    console.log(`Processing chunk ${chunkIndex}`);
  }

  // Convert blob to base64
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Generate thumbnail from video
  async generateThumbnail(
    file: File | Blob,
    timestamp: number = 0
  ): Promise<{ blob: Blob; base64: string }> {
    const metadata = await this.extractMetadata(file);
    
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.src = url;
    
    await new Promise<void>((resolve) => {
      video.onloadeddata = () => resolve();
    });
    
    video.currentTime = Math.min(timestamp, metadata.duration);
    
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
    });
    
    const canvas = document.createElement('canvas');
    const thumbnailWidth = 320;
    const thumbnailHeight = (metadata.height / metadata.width) * thumbnailWidth;
    
    canvas.width = thumbnailWidth;
    canvas.height = thumbnailHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');
    
    ctx.drawImage(video, 0, 0, thumbnailWidth, thumbnailHeight);
    
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create thumbnail'));
      }, 'image/jpeg', 0.8);
    });
    
    const base64 = await this.blobToBase64(blob);
    URL.revokeObjectURL(url);
    
    return { blob, base64 };
  }

  // Cancel ongoing processing
  cancel(): void {
    this.abortController?.abort();
    this.worker?.terminate();
    this.worker = null;
  }

  // Get extracted metadata
  getMetadata(): VideoMetadata | null {
    return this.metadata;
  }

  // Get extracted frames
  getFrames(): ExtractedFrame[] {
    return [...this.frames];
  }

  // Check if WebCodecs API is supported
  static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'VideoDecoder' in window &&
      'EncodedVideoChunk' in window &&
      'OffscreenCanvas' in window
    );
  }

  // Get supported video formats
  static getSupportedFormats(): string[] {
    const video = document.createElement('video');
    const formats = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/ogg'
    ];
    
    return formats.filter(format => video.canPlayType(format));
  }
}

// Singleton instance
export const videoProcessor = new VideoProcessor();
```

**File: src/hooks/useVideoUpload.ts**
```typescript
import { useState, useCallback } from 'react';
import { VideoProcessor, VideoMetadata, ExtractedFrame, ProcessingProgress } from '../services/videoProcessing';
import { VideoFile } from '../types';

interface UseVideoUploadOptions {
  onProgress?: (progress: ProcessingProgress) => void;
  maxFileSize?: number; // in bytes, default 500MB
}

export const useVideoUpload = (options: UseVideoUploadOptions = {}) => {
  const { onProgress, maxFileSize = 500 * 1024 * 1024 } = options;
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<VideoFile | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [frames, setFrames] = useState<ExtractedFrame[]>([]);

  const videoProcessor = new VideoProcessor();

  // Upload local file
  const uploadLocalFile = useCallback(async (file: File): Promise<VideoFile> => {
    try {
      setIsProcessing(true);
      setError(null);
      
      // Validate file
      if (file.size > maxFileSize) {
        throw new Error(`File too large. Maximum size is ${maxFileSize / 1024 / 1024}MB`);
      }
      
      if (!file.type.startsWith('video/')) {
        throw new Error('Invalid file type. Please select a video file.');
      }
      
      // Extract metadata
      const meta = await videoProcessor.extractMetadata(file);
      setMetadata(meta);
      
      // Generate thumbnail
      const thumbnail = await videoProcessor.generateThumbnail(file, 0);
      
      // Extract keyframes
      const extractedFrames = await videoProcessor.extractKeyframes(file, {
        maxFrames: 30,
        quality: 0.8,
        onProgress: (p) => {
          setProgress(p);
          onProgress?.(p);
        }
      });
      setFrames(extractedFrames);
      
      const videoFile: VideoFile = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        duration: meta.duration,
        thumbnailUrl: thumbnail.base64,
        file: file,
        uploadDate: new Date()
      };
      
      setUploadedFile(videoFile);
      return videoFile;
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [maxFileSize, onProgress]);

  // Upload from Google Drive
  const uploadFromDrive = useCallback(async (
    fileId: string,
    name: string,
    blob: Blob,
    streamUrl?: string
  ): Promise<VideoFile> => {
    try {
      setIsProcessing(true);
      setError(null);
      
      if (blob.size > maxFileSize) {
        throw new Error(`File too large. Maximum size is ${maxFileSize / 1024 / 1024}MB`);
      }
      
      // Extract metadata (use streamUrl if available)
      const source = streamUrl ? streamUrl : blob;
      const meta = await videoProcessor.extractMetadata(
        typeof source === 'string' ? await fetch(source).then(r => r.blob()) : blob
      );
      setMetadata(meta);
      
      // Generate thumbnail
      const thumbnailBlob = typeof source === 'string' 
        ? await fetch(source).then(r => r.blob())
        : blob;
      const thumbnail = await videoProcessor.generateThumbnail(thumbnailBlob, 0);
      
      // Extract keyframes
      const extractedFrames = await videoProcessor.extractKeyframes(blob, {
        maxFrames: 30,
        quality: 0.8,
        onProgress: (p) => {
          setProgress(p);
          onProgress?.(p);
        }
      });
      setFrames(extractedFrames);
      
      const videoFile: VideoFile = {
        id: fileId,
        name: name,
        size: blob.size,
        type: blob.type,
        duration: meta.duration,
        thumbnailUrl: thumbnail.base64,
        driveFileId: fileId,
        uploadDate: new Date()
      };
      
      setUploadedFile(videoFile);
      return videoFile;
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [maxFileSize, onProgress]);

  // Cancel ongoing upload
  const cancelUpload = useCallback(() => {
    videoProcessor.cancel();
    setIsProcessing(false);
    setProgress(null);
  }, []);

  // Reset upload state
  const reset = useCallback(() => {
    setUploadedFile(null);
    setMetadata(null);
    setFrames([]);
    setError(null);
    setProgress(null);
    setIsProcessing(false);
  }, []);

  return {
    uploadLocalFile,
    uploadFromDrive,
    cancelUpload,
    reset,
    isProcessing,
    progress,
    error,
    uploadedFile,
    metadata,
    frames
  };
};
```

**File: src/components/VideoUpload/UploadZone.tsx**
```typescript
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useVideoUpload } from '../../hooks/useVideoUpload';
import { VideoFile } from '../../types';

interface UploadZoneProps {
  onUploadComplete: (videoFile: VideoFile) => void;
  onGoogleDriveSelect?: () => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onUploadComplete,
  onGoogleDriveSelect
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const {
    uploadLocalFile,
    isProcessing,
    progress,
    error,
    reset
  } = useVideoUpload({
    onProgress: (p) => {
      console.log(`Progress: ${p.progress}% - ${p.message}`);
    }
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    setSelectedFile(file);
    
    try {
      const videoFile = await uploadLocalFile(file);
      onUploadComplete(videoFile);
    } catch (err) {
      console.error('Upload failed:', err);
    }
  }, [uploadLocalFile, onUploadComplete]);

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm', '.mkv']
    },
    maxSize: 500 * 1024 * 1024, // 500MB
    multiple: false,
    disabled: isProcessing,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false)
  });

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    
    try {
      const videoFile = await uploadLocalFile(file);
      onUploadComplete(videoFile);
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    reset();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg border-2 border-dashed border-gray-300">
        <div
          {...getRootProps()}
          className={`p-8 text-center transition-all duration-200 ${
            isDragActive ? 'bg-blue-50 border-blue-400' : 'hover:bg-gray-50'
          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">📹</span>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isDragActive ? 'Drop video here' : 'Upload your video'}
            </h3>
            
            <p className="text-gray-600 mb-4">
              Drag and drop a video file here, or click to browse
            </p>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                {error}
              </div>
            )}
            
            {progress && isProcessing && (
              <div className="w-full max-w-md">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>{progress.message}</span>
                  <span>{Math.round(progress.progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.progress}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {selectedFile && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-blue-700">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
            
            <div className="mt-6 flex gap-4 justify-center">
              <button
                onClick={open}
                disabled={isProcessing}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Select Video'}
              </button>
              
              <input
                type="file"
                accept="video/*"
                onChange={handleFileInput}
                disabled={isProcessing}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer disabled:opacity-50"
                style={{ display: 'none' }}
              >
                Browse Files
              </label>
              
              {onGoogleDriveSelect && (
                <button
                  onClick={onGoogleDriveSelect}
                  disabled={isProcessing}
                  className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <img
                    src="https://www.google.com/favicon.ico"
                    alt="Google"
                    className="w-4 h-4"
                  />
                  Google Drive
                </button>
              )}
            </div>
            
            {selectedFile && (
              <button
                onClick={resetUpload}
                className="mt-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            )}
            
            <p className="mt-4 text-xs text-gray-500">
              Supports MP4, MOV, AVI, WebM up to 500MB
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadZone;
```

### ACCEPTANCE CRITERIA FOR PHASE 4:

1. ✅ File drag-and-drop works with visual feedback
2. ✅ File browser selection works
3. ✅ Google Drive files upload and process correctly
4. ✅ WebCodecs API initializes successfully
5. ✅ Video metadata extraction (duration, resolution, FPS)
6. ✅ Keyframe extraction at consistent intervals
7. ✅ Thumbnail generation from first frame
8. ✅ Progress indicators show accurate status
9. ✅ Error handling for invalid/corrupted files
10. ✅ Memory cleanup after processing
11. ✅ Cancel processing option available
12. ✅ Support MP4, WebM, MOV formats
13. ✅ Maximum file size enforced (500MB)
14. ✅ Web Worker created for heavy processing
15. ✅ TypeScript compiles with zero errors

### TESTING CHECKLIST:

```bash
# Manual tests:
# 1. Drag MP4 file (50MB) - verify upload and processing
# 2. Select MOV file (200MB) - verify metadata extraction
# 3. Upload from Google Drive - verify blob handling
# 4. Upload corrupted video - verify error handling
# 5. Upload invalid file type - verify validation
# 6. Upload >500MB file - verify size limit
# 7. Cancel processing mid-upload - verify cleanup
# 8. Verify 30 keyframes extracted
# 9. Check thumbnail generated
# 10. Verify frames array has base64 data
```

### PERFORMANCE REQUIREMENTS:

- Metadata extraction: < 2 seconds
- Frame extraction (30 frames): < 10 seconds
- Thumbnail generation: < 1 second
- Memory usage: < 200MB for 500MB file
- Garbage collection after processing
- Web Worker doesn't block UI thread

### BROWSER COMPATIBILITY:

- Chrome 94+ (WebCodecs support)
- Edge 94+
- Firefox (limited WebCodecs, use fallback)
- Safari (limited WebCodecs, use fallback)
- Mobile browsers (basic HTML5 video support)

### FALLBACK STRATEGY:

For browsers without WebCodecs support:
- Use HTML5 video element for frame extraction
- Reduced frame quality
- Limited format support
- Show warning to user about reduced functionality