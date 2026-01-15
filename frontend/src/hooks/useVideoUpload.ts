import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { apiClient } from '../services/api';
import { Video, UploadProgress } from '../../shared/types';
import { VIDEO_UPLOAD, ERROR_MESSAGES } from '../../shared/constants';

interface UseVideoUploadOptions {
  onSuccess?: (video: Video) => void;
  onError?: (error: string) => void;
}

interface UseVideoUploadReturn {
  upload: (file: File) => Promise<void>;
  progress: UploadProgress;
  isUploading: boolean;
  error: string | null;
  reset: () => void;
}

const CHUNK_SIZE = VIDEO_UPLOAD.CHUNK_SIZE;
const MAX_FILE_SIZE = VIDEO_UPLOAD.MAX_FILE_SIZE;

const SUPPORTED_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
];

export function useVideoUpload(options: UseVideoUploadOptions = {}): UseVideoUploadReturn {
  const [progress, setProgress] = useState<UploadProgress>({
    loaded: 0,
    total: 0,
    percentage: 0,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setProgress({ loaded: 0, total: 0, percentage: 0 });
    setIsUploading(false);
    setError(null);
    abortControllerRef.current = null;
  }, []);

  const upload = useCallback(async (file: File): Promise<void> => {
    // Reset previous state
    reset();
    setIsUploading(true);
    setError(null);

    // Validate file type
    if (!SUPPORTED_TYPES.includes(file.type)) {
      const errorMessage = ERROR_MESSAGES.INVALID_FILE_TYPE;
      setError(errorMessage);
      setIsUploading(false);
      options.onError?.(errorMessage);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const errorMessage = ERROR_MESSAGES.FILE_TOO_LARGE;
      setError(errorMessage);
      setIsUploading(false);
      options.onError?.(errorMessage);
      return;
    }

    // Create abort controller for cancellation support
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    try {
      const videoId = uuidv4();
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      // Calculate total bytes for progress
      setProgress((prev) => ({ ...prev, total: file.size }));

      // Upload chunks
      let uploadedBytes = 0;
      const uploadPromises: Promise<void>[] = [];

      // Upload chunks sequentially to avoid server issues
      for (let chunkNumber = 1; chunkNumber <= totalChunks; chunkNumber++) {
        if (signal.aborted) {
          throw new Error('Upload cancelled');
        }

        const start = (chunkNumber - 1) * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const uploadPromise = apiClient
          .uploadChunk(
            '/videos/upload',
            chunk,
            chunkNumber,
            totalChunks,
            videoId,
            file.name,
            (chunkProgress) => {
              // Calculate overall progress
              const chunkBytes = end - start;
              const totalUploaded = uploadedBytes + (chunkBytes * chunkProgress / 100);
              uploadedBytes += chunkBytes;

              setProgress({
                loaded: Math.round(totalUploaded),
                total: file.size,
                percentage: Math.round((totalUploaded / file.size) * 100),
              });
            }
          )
          .then((response) => {
            if (!response.success) {
              throw new Error(response.error || 'Chunk upload failed');
            }
          });

        uploadPromises.push(uploadPromise);
      }

      // Wait for all chunks to upload
      await Promise.all(uploadPromises);

      // Finalize upload
      const finalizeResponse = await apiClient.finalizeUpload<Video>(
        '/videos/finalize',
        {
          videoId,
          filename: file.name,
          totalChunks,
          mimeType: file.type,
        }
      );

      if (!finalizeResponse.success || !finalizeResponse.data) {
        throw new Error(finalizeResponse.error || 'Failed to finalize upload');
      }

      // Upload complete
      setProgress({
        loaded: file.size,
        total: file.size,
        percentage: 100,
      });
      setIsUploading(false);

      options.onSuccess?.(finalizeResponse.data);
    } catch (err: any) {
      // Handle cancellation
      if (err.name === 'AbortError') {
        setError('Upload cancelled');
      } else {
        const errorMessage = err.message || ERROR_MESSAGES.UPLOAD_FAILED;
        setError(errorMessage);
        options.onError?.(errorMessage);
      }
      setIsUploading(false);
    }
  }, [options, reset]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    upload,
    progress,
    isUploading,
    error,
    reset,
    cancel,
  };
}

export default useVideoUpload;
