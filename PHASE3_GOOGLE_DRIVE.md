# PHASE 3: Google Drive Integration & File Selection

## TASK TITLE: Build Gemini-Powered Video Understanding Web App - Phase 3: Google Drive API Integration

**PRIORITY: HIGH** - Direct Drive integration without backend is critical feature

---

## FULL PROMPT FOR AI CODING AGENT:

Implement complete Google Drive API integration that allows users to browse and select video files directly from their Google Drive. This must follow the client-side-only pattern established by amurex, with NO backend server required.

### ARCHITECTURAL REQUIREMENTS:

- Use Google Drive API v3 with OAuth 2.0 authentication
- List video files (MP4, MOV, AVI, WebM, etc.) from user's Drive
- Search and filter capabilities
- Preview thumbnails for video files
- Direct download/stream to browser for analysis
- Handle large files with chunked downloads
- Progressive loading UI with skeleton states
- Error handling for Drive API failures
- Rate limiting compliance (respect Google's quotas)

### DELIVERABLES:

**File: src/services/googleDriveApi.ts**
```typescript
import { GOOGLE_AUTH_CONFIG } from '../utils/constants';
import { googleAuthService } from './googleAuth';
import { GoogleDriveFile } from '../types';

class GoogleDriveAPIService {
  private static instance: GoogleDriveAPIService;
  
  private constructor() {}
  
  static getInstance(): GoogleDriveAPIService {
    if (!GoogleDriveAPIService.instance) {
      GoogleDriveAPIService.instance = new GoogleDriveAPIService();
    }
    return GoogleDriveAPIService.instance;
  }

  // List video files from Google Drive
  async listVideoFiles(pageSize: number = 50, pageToken?: string): Promise<{
    files: GoogleDriveFile[];
    nextPageToken?: string;
  }> {
    const token = await googleAuthService.getValidAccessToken();
    if (!token) {
      throw new Error('Not authenticated with Google');
    }

    // Query for video MIME types
    const videoMimeTypes = [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-ms-wmv',
      'video/mpeg',
      'video/webm',
      'video/3gpp'
    ];

    const query = `mimeType contains 'video/' and (${videoMimeTypes.map(type => `mimeType='${type}'`).join(' or ')})`;

    const params = new URLSearchParams({
      q: query,
      pageSize: pageSize.toString(),
      fields: 'nextPageToken,files(id,name,mimeType,size,modifiedTime,thumbnailLink,webContentLink)',
      orderBy: 'modifiedTime desc'
    });

    if (pageToken) {
      params.append('pageToken', pageToken);
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Drive API error: ${error.error.message}`);
      }

      const data = await response.json();
      
      return {
        files: data.files.map((file: any) => ({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          size: parseInt(file.size || '0'),
          modifiedTime: file.modifiedTime,
          thumbnail: file.thumbnailLink
        })),
        nextPageToken: data.nextPageToken
      };
    } catch (error) {
      console.error('Failed to list Drive files:', error);
      throw error;
    }
  }

  // Search for specific files
  async searchFiles(query: string, pageSize: number = 20): Promise<GoogleDriveFile[]> {
    const token = await googleAuthService.getValidAccessToken();
    if (!token) {
      throw new Error('Not authenticated with Google');
    }

    const searchQuery = `name contains '${query}' and mimeType contains 'video/'`;

    const params = new URLSearchParams({
      q: searchQuery,
      pageSize: pageSize.toString(),
      fields: 'files(id,name,mimeType,size,modifiedTime,thumbnailLink)'
    });

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Search failed: ${error.error.message}`);
      }

      const data = await response.json();
      
      return data.files.map((file: any) => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: parseInt(file.size || '0'),
        modifiedTime: file.modifiedTime,
        thumbnail: file.thumbnailLink
      }));
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }

  // Get file metadata
  async getFileMetadata(fileId: string): Promise<GoogleDriveFile> {
    const token = await googleAuthService.getValidAccessToken();
    if (!token) {
      throw new Error('Not authenticated with Google');
    }

    const params = new URLSearchParams({
      fields: 'id,name,mimeType,size,modifiedTime,thumbnailLink,webContentLink'
    });

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 404) {
          throw new Error('File not found in Google Drive');
        }
        throw new Error(`Drive API error: ${error.error.message}`);
      }

      const file = await response.json();
      
      return {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: parseInt(file.size || '0'),
        modifiedTime: file.modifiedTime,
        thumbnail: file.thumbnailLink
      };
    } catch (error) {
      console.error(`Failed to get file ${fileId}:`, error);
      throw error;
    }
  }

  // Create resumable download session
  private async createResumableSession(fileId: string): Promise<string> {
    const token = await googleAuthService.getValidAccessToken();
    if (!token) {
      throw new Error('Not authenticated with Google');
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to initiate download: ${response.statusText}`);
    }

    // Return the download URL
    return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  }

  // Download file in chunks for large files
  async downloadFile(fileId: string, onProgress?: (progress: number) => void): Promise<Blob> {
    const file = await this.getFileMetadata(fileId);
    const token = await googleAuthService.getValidAccessToken();
    
    if (!token) {
      throw new Error('Not authenticated with Google');
    }

    const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
    const totalSize = file.size;
    const chunks: ArrayBuffer[] = [];
    let downloaded = 0;

    try {
      while (downloaded < totalSize) {
        const end = Math.min(downloaded + CHUNK_SIZE - 1, totalSize - 1);
        
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Range': `bytes=${downloaded}-${end}`,
              'Accept': 'application/octet-stream'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Download failed: ${response.statusText}`);
        }

        const chunk = await response.arrayBuffer();
        chunks.push(chunk);
        downloaded += chunk.byteLength;

        if (onProgress) {
          onProgress((downloaded / totalSize) * 100);
        }
      }

      // Combine chunks
      const combined = new Uint8Array(totalSize);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }

      return new Blob([combined.buffer], { type: file.mimeType });
    } catch (error) {
      console.error('File download failed:', error);
      throw error;
    }
  }

  // Stream file directly to video element
  async getStreamableUrl(fileId: string): Promise<string> {
    const token = await googleAuthService.getValidAccessToken();
    if (!token) {
      throw new Error('Not authenticated with Google');
    }

    // For smaller files (<100MB), we can stream directly
    const file = await this.getFileMetadata(fileId);
    
    if (file.size > 100 * 1024 * 1024) {
      throw new Error('File too large for direct streaming. Use downloadFile instead.');
    }

    // Create a blob URL for the file
    const blob = await this.downloadFile(fileId);
    return URL.createObjectURL(blob);
  }

  // Get thumbnail for video file
  async getThumbnail(fileId: string): Promise<string | null> {
    try {
      const file = await this.getFileMetadata(fileId);
      return file.thumbnail || null;
    } catch (error) {
      console.warn('Failed to get thumbnail:', error);
      return null;
    }
  }
}

export const googleDriveApi = GoogleDriveAPIService.getInstance();
```

**File: src/hooks/useGoogleDrive.ts**
```typescript
import { useState, useCallback } from 'react';
import { googleDriveApi } from '../services/googleDriveApi';
import { GoogleDriveFile } from '../types';

interface UseGoogleDriveOptions {
  pageSize?: number;
}

export const useGoogleDrive = (options: UseGoogleDriveOptions = {}) => {
  const { pageSize = 20 } = options;
  
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);

  // Load files from Drive
  const loadFiles = useCallback(async (loadMore = false) => {
    try {
      setLoading(true);
      setError(null);

      const result = await googleDriveApi.listVideoFiles(
        pageSize,
        loadMore ? nextPageToken : undefined
      );

      if (loadMore) {
        setFiles(prev => [...prev, ...result.files]);
      } else {
        setFiles(result.files);
      }

      setNextPageToken(result.nextPageToken);
      setHasMore(!!result.nextPageToken);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load files';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [pageSize, nextPageToken]);

  // Search files
  const searchFiles = useCallback(async (query: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await googleDriveApi.searchFiles(query, pageSize);
      setFiles(result);
      setHasMore(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  // Clear search and show all files
  const clearSearch = useCallback(() => {
    setFiles([]);
    setNextPageToken(undefined);
    setHasMore(true);
    loadFiles(false);
  }, [loadFiles]);

  // Download file for analysis
  const downloadFile = useCallback(async (
    fileId: string,
    onProgress?: (progress: number) => void
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      const blob = await googleDriveApi.downloadFile(fileId, onProgress);
      return blob;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get streamable URL
  const getStreamableUrl = useCallback(async (fileId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const url = await googleDriveApi.getStreamableUrl(fileId);
      return url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Streaming failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    files,
    loading,
    error,
    hasMore,
    loadFiles,
    searchFiles,
    clearSearch,
    downloadFile,
    getStreamableUrl,
    loadMore: () => loadFiles(true)
  };
};
```

**File: src/components/VideoUpload/GoogleDriveSelector.tsx**
```typescript
import React, { useState, useCallback } from 'react';
import { useGoogleDrive } from '../../hooks/useGoogleDrive';
import { GoogleDriveFile } from '../../types';

interface GoogleDriveSelectorProps {
  onFileSelect: (file: { id: string, name: string, blob?: Blob, streamUrl?: string }) => void;
  onCancel?: () => void;
}

export const GoogleDriveSelector: React.FC<GoogleDriveSelectorProps> = ({
  onFileSelect,
  onCancel
}) => {
  const {
    files,
    loading,
    error,
    hasMore,
    loadFiles,
    searchFiles,
    downloadFile,
    getStreamableUrl
  } = useGoogleDrive({ pageSize: 30 });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<GoogleDriveFile | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Load initial files
  React.useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Handle search
  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      await searchFiles(searchQuery);
    } else {
      loadFiles();
    }
  }, [searchQuery, searchFiles, loadFiles]);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle file selection
  const handleFileSelect = async (file: GoogleDriveFile) => {
    try {
      setSelectedFile(file);
      setDownloading(true);
      setDownloadProgress(0);

      // For files < 50MB, download directly
      // For larger files, stream
      if (file.size < 50 * 1024 * 1024) {
        const blob = await downloadFile(file.id, (progress) => {
          setDownloadProgress(progress);
        });
        
        onFileSelect({
          id: file.id,
          name: file.name,
          blob
        });
      } else {
        // For large files, get streamable URL
        const streamUrl = await getStreamableUrl(file.id);
        
        onFileSelect({
          id: file.id,
          name: file.name,
          streamUrl
        });
      }
    } catch (err) {
      console.error('Failed to select file:', err);
      setError('Failed to load file. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // Format modified time
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Select Video from Google Drive
            </h2>
            {onCancel && (
              <button
                onClick={onCancel}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-200">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for videos..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  loadFiles();
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* File List */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">
              {error}
            </div>
          ) : files.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No video files found in your Google Drive
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {files.map((file) => (
                <div
                  key={file.id}
                  onClick={() => handleFileSelect(file)}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedFile?.id === file.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1 min-w-0">
                      {/* Thumbnail or icon */}
                      <div className="w-12 h-12 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center mr-3">
                        {file.thumbnail ? (
                          <img
                            src={file.thumbnail}
                            alt={file.name}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <span className="text-gray-500">🎬</span>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <span>{formatFileSize(file.size)}</span>
                          <span className="mx-2">•</span>
                          <span>{formatDate(file.modifiedTime)}</span>
                        </div>
                      </div>
                    </div>

                    {downloading && selectedFile?.id === file.id && (
                      <div className="ml-4">
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="ml-2 text-xs text-blue-600">
                            {Math.round(downloadProgress)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Load More */}
        {hasMore && !loading && files.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <button
              onClick={() => loadMore()}
              className="w-full py-2 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
            >
              Load More Videos...
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleDriveSelector;
```

### ACCEPTANCE CRITERIA FOR PHASE 3:

1. ✅ User can authenticate and grant Drive access
2. ✅ Video files list loads from Google Drive
3. ✅ Search functionality returns filtered results
4. ✅ File thumbnails display (when available)
5. ✅ File metadata (size, modified date) displays correctly
6. ✅ Small files (<50MB) download directly to browser
7. ✅ Large files (>50MB) use chunked download
8. ✅ Download progress indicator shows percentage
9. ✅ Files can be streamed directly to video element
10. ✅ Error handling for network failures
11. ✅ Rate limiting awareness (respect Google's quotas)
12. ✅ TypeScript compiles with zero errors
13. ✅ Infinite scroll/load more functionality works
14. ✅ Clear search returns to full file list
15. ✅ No backend server used - pure client-side

### TESTING CHECKLIST:

```bash
# Manual tests required:
# 1. Authenticate and verify Drive scope granted
# 2. Load initial file list (20-30 files)
# 3. Scroll to trigger load more
# 4. Search for specific video file
# 5. Select small file (<50MB) - verify download
# 6. Select large file (>50MB) - verify chunked download
# 7. Check progress indicator during download
# 8. Verify blob/streamUrl returned to parent component
# 9. Test error handling (revoke Drive access, try loading files)
# 10. Verify no files leak between searches
```

### PERFORMANCE REQUIREMENTS:

- Initial file list loads in <2 seconds
- Search results return in <1 second
- Download progress updates every 100ms
- Thumbnail loading doesn't block UI
- Lazy loading implemented for large lists
- Maximum 50 files per page (respect API quotas)

### GOOGLE DRIVE API LIMITS TO RESPECT:

- 1000 requests per 100 seconds per user
- Page size maximum: 100 (we use 30-50)
- Implement exponential backoff on 429 errors
- No parallel download requests (sequential only)
- Respect user's storage bandwidth