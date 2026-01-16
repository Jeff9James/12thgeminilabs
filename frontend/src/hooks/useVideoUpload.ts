import { useState, useCallback } from 'react';
import { videoApi } from '../services/videoApi';
import { v4 as uuidv4 } from 'uuid';
import { UPLOAD_CONSTANTS } from '@shared/constants';

export interface UseVideoUploadOptions {
  onSuccess?: (videoId: string) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

export interface UseVideoUploadReturn {
  upload: (file: File, title: string) => Promise<void>;
  isUploading: boolean;
  progress: number;
  error: string | null;
  reset: () => void;
}

export function useVideoUpload(options: UseVideoUploadOptions = {}): UseVideoUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { onSuccess, onError, onProgress } = options;

  const upload = useCallback(async (file: File, title: string): Promise<void> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Validate file
      if (!UPLOAD_CONSTANTS.SUPPORTED_FORMATS.includes(file.type)) {
        throw new Error(`Invalid file type. Supported types: ${UPLOAD_CONSTANTS.SUPPORTED_EXTENSIONS.join(', ')}`);
      }

      if (file.size > UPLOAD_CONSTANTS.MAX_FILE_SIZE) {
        throw new Error(`File too large. Maximum size is ${UPLOAD_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024 * 1024)}GB`);
      }

      // Generate video ID
      const videoId = uuidv4();
      const totalChunks = Math.ceil(file.size / UPLOAD_CONSTANTS.CHUNK_SIZE);
      const filename = file.name;

      // Upload chunks
      for (let chunkNumber = 1; chunkNumber <= totalChunks; chunkNumber++) {
        const start = (chunkNumber - 1) * UPLOAD_CONSTANTS.CHUNK_SIZE;
        const end = Math.min(start + UPLOAD_CONSTANTS.CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const chunkFile = new File([chunk], filename, { type: file.type });

        await videoApi.uploadChunk(
          chunkFile,
          videoId,
          chunkNumber,
          totalChunks,
          filename
        );

        const currentProgress = Math.round((chunkNumber / totalChunks) * 100);
        setProgress(currentProgress);
        onProgress?.(currentProgress);
      }

      // Finalize upload
      const finalizeResponse = await videoApi.finalizeUpload({
        videoId,
        filename,
        totalChunks,
        title: title || filename,
        mimeType: file.type,
        fileSize: file.size,
      });

      if (!finalizeResponse.success || !finalizeResponse.data) {
        throw new Error(finalizeResponse.data?.message || 'Failed to finalize upload');
      }

      setProgress(100);
      onSuccess?.(finalizeResponse.data.video.id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsUploading(false);
    }
  }, [onSuccess, onError, onProgress]);

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(0);
    setError(null);
  }, []);

  return {
    upload,
    isUploading,
    progress,
    error,
    reset,
  };
}
