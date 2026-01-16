import { useState, useCallback } from 'react';
import { googleDriveApi } from '../services/googleDriveApi';
import { GoogleDriveFile, GoogleDriveImportStatus } from '@shared/types';

interface UseGoogleDriveReturn {
  files: GoogleDriveFile[];
  isLoading: boolean;
  error: string | null;
  importStatus: Map<string, GoogleDriveImportStatus>;
  listFiles: () => Promise<void>;
  importFile: (fileId: string, title?: string) => Promise<string>;
  getImportStatus: (videoId: string) => Promise<GoogleDriveImportStatus>;
  clearError: () => void;
}

export function useGoogleDrive(): UseGoogleDriveReturn {
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<Map<string, GoogleDriveImportStatus>>(
    new Map()
  );

  const listFiles = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const driveFiles = await googleDriveApi.listFiles();
      setFiles(driveFiles);
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to list Google Drive files');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const importFile = useCallback(async (fileId: string, title?: string): Promise<string> => {
    try {
      setError(null);
      const result = await googleDriveApi.importFile(fileId, title);
      
      // Initialize import status
      setImportStatus((prev) => {
        const newMap = new Map(prev);
        newMap.set(result.videoId, {
          videoId: result.videoId,
          status: 'pending',
          progress: 0,
          message: 'Starting import...',
        });
        return newMap;
      });

      return result.videoId;
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to import video');
      throw err;
    }
  }, []);

  const getImportStatus = useCallback(
    async (videoId: string): Promise<GoogleDriveImportStatus> => {
      try {
        const status = await googleDriveApi.getImportStatus(videoId);
        
        // Update import status
        setImportStatus((prev) => {
          const newMap = new Map(prev);
          newMap.set(videoId, status);
          return newMap;
        });

        return status;
      } catch (err) {
        const error = err as Error;
        setError(error.message || 'Failed to get import status');
        throw err;
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    files,
    isLoading,
    error,
    importStatus,
    listFiles,
    importFile,
    getImportStatus,
    clearError,
  };
}
