# PHASE 7: IndexedDB Storage & Data Persistence Layer

## TASK TITLE: Build Gemini-Powered Video Understanding Web App - Phase 7: Client-Side Database with Dexie.js

**PRIORITY: HIGH** - Persistent storage without backend is critical feature

---

## FULL PROMPT FOR AI CODING AGENT:

Implement complete IndexedDB database layer using Dexie.js ORM for storing video files, analysis results, user preferences, and cache data. This phase ensures all data persists locally without any server-side storage.

### ARCHITECTURAL REQUIREMENTS:

- **Database Schema**: Multiple tables for different data types
- **Dexie.js Integration**: Type-safe ORM wrapper for IndexedDB
- **BLOB Storage**: Efficient video file and thumbnail storage
- **Index Management**: Proper indexes for fast querying
- **Data Versioning**: Handle schema migrations
- **Size Management**: Automatic cleanup of old data
- **Backup/Export**: JSON export of analysis results
- **Cache Layer**: Store API responses and processed data
- **Performance**: Bulk operations and pagination
- **Error Recovery**: Handle corrupted database states

### DELIVERABLES:

**File: src/services/indexedDb.ts**
```typescript
import Dexie, { Table } from 'dexie';
import { VideoFile, AnalysisResult, GoogleDriveFile, AuthState } from '../types';
import { ExtractedFrame, VideoMetadata } from './videoProcessing';

// Database schema interfaces
export interface StoredVideoFile {
  id: string;
  name: string;
  size: number;
  type: string;
  duration: number;
  thumbnailUrl?: string;
  driveFileId?: string;
  uploadDate: Date;
  blob?: Blob; // Actual video file data
  metadata?: VideoMetadata;
}

export interface StoredAnalysis {
  id: string;
  videoId: string;
  videoName: string;
  status: 'completed' | 'failed' | 'processing';
  summary?: AnalysisResult['summary'];
  temporalSegments?: AnalysisResult['temporalSegments'];
  spatialAnalysis?: AnalysisResult['spatialAnalysis'];
  reasoning?: AnalysisResult['reasoning'];
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredFrame {
  id: string;
  videoId: string;
  frameIndex: number;
  timestamp: number;
  thumbnailData: string; // base64
  isKeyframe: boolean;
  extractedAt: Date;
}

export interface ApiCache {
  id: string;
  requestKey: string; // MD5 hash of request params
  responseData: any;
  cachedAt: Date;
  expiresAt: Date;
}

export interface UserPreferences {
  id: string;
  userId: string;
  preferences: {
    maxFileSize: number;
    defaultFrames: number;
    theme: 'light' | 'dark';
    language: string;
    notifications: boolean;
  };
  updatedAt: Date;
}

export class VideoAnalysisDB extends Dexie {
  // Table definitions
  videos!: Table<StoredVideoFile, string>;
  analyses!: Table<StoredAnalysis, string>;
  frames!: Table<StoredFrame, string>;
  apiCache!: Table<ApiCache, string>;
  preferences!: Table<UserPreferences, string>;
  driveFiles!: Table<GoogleDriveFile & { userId: string; lastSynced: Date }, string>;

  constructor() {
    super('VideoAnalysisDB');

    // Schema definition
    this.version(1).stores({
      // Video files table
      videos: `
        id,
        name,
        size,
        type,
        duration,
        uploadDate,
        driveFileId
      `,

      // Analysis results table
      analyses: `
        id,
        videoId,
        videoName,
        status,
        createdAt,
        updatedAt
      `,

      // Extracted frames table
      frames: `
        id,
        videoId,
        frameIndex,
        timestamp,
        isKeyframe,
        [videoId+frameIndex],
        [videoId+isKeyframe]
      `,

      // API response cache
      apiCache: `
        id,
        requestKey,
        cachedAt,
        expiresAt
      `,

      // User preferences
      preferences: `
        id,
        userId
      `,

      // Google Drive file cache
      driveFiles: `
        id,
        userId,
        lastSynced
      `
    });

    // Add TypeScript typing
    this.videos.mapToClass(StoredVideoFile);
    this.analyses.mapToClass(StoredAnalysis);
    this.frames.mapToClass(StoredFrame);
    this.apiCache.mapToClass(ApiCache);
    this.preferences.mapToClass(UserPreferences);
  }

  // Initialize database
  async initialize(): Promise<void> {
    try {
      await this.open();
      console.log('IndexedDB initialized successfully');
      
      // Set up periodic cleanup
      this.setupCleanupTask();
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
      throw new Error('Storage system failed to initialize');
    }
  }

  // Video file operations
  async storeVideoFile(videoFile: StoredVideoFile): Promise<string> {
    try {
      const id = await this.videos.put(videoFile);
      console.log(`Video file stored: ${videoFile.name} (${(videoFile.size / 1024 / 1024).toFixed(2)} MB)`);
      
      // Monitor storage usage
      await this.checkStorageQuota();
      
      return id;
    } catch (error) {
      console.error('Failed to store video file:', error);
      throw this.handleDbError(error, 'store video');
    }
  }

  async getVideoFile(id: string): Promise<StoredVideoFile | undefined> {
    try {
      return await this.videos.get(id);
    } catch (error) {
      console.error('Failed to retrieve video file:', error);
      throw this.handleDbError(error, 'retrieve video');
    }
  }

  async getAllVideoFiles(limit: number = 100, offset: number = 0): Promise<{
    files: StoredVideoFile[];
    total: number;
  }> {
    try {
      const [files, total] = await Promise.all([
        this.videos.orderBy('uploadDate').reverse().offset(offset).limit(limit).toArray(),
        this.videos.count()
      ]);
      
      return { files, total };
    } catch (error) {
      console.error('Failed to retrieve video files:', error);
      throw this.handleDbError(error, 'retrieve videos');
    }
  }

  async deleteVideoFile(id: string): Promise<void> {
    try {
      // Cascade delete related records
      await this.transaction('rw', [this.videos, this.analyses, this.frames], async () => {
        await this.analyses.where('videoId').equals(id).delete();
        await this.frames.where('videoId').equals(id).delete();
        await this.videos.delete(id);
      });
      
      console.log(`Video file and related data deleted: ${id}`);
    } catch (error) {
      console.error('Failed to delete video file:', error);
      throw this.handleDbError(error, 'delete video');
    }
  }

  // Analysis result operations
  async storeAnalysis(analysis: StoredAnalysis): Promise<string> {
    try {
      analysis.updatedAt = new Date();
      const id = await this.analyses.put(analysis);
      console.log(`Analysis stored: ${analysis.videoName}`);
      return id;
    } catch (error) {
      console.error('Failed to store analysis:', error);
      throw this.handleDbError(error, 'store analysis');
    }
  }

  async getAnalysis(id: string): Promise<StoredAnalysis | undefined> {
    try {
      return await this.analyses.get(id);
    } catch (error) {
      console.error('Failed to retrieve analysis:', error);
      throw this.handleDbError(error, 'retrieve analysis');
    }
  }

  async getAnalysesByVideo(videoId: string): Promise<StoredAnalysis[]> {
    try {
      return await this.analyses.where('videoId').equals(videoId).toArray();
    } catch (error) {
      console.error('Failed to retrieve analyses:', error);
      throw this.handleDbError(error, 'retrieve analyses');
    }
  }

  async getRecentAnalyses(limit: number = 20): Promise<StoredAnalysis[]> {
    try {
      return await this.analyses
        .orderBy('createdAt')
        .reverse()
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('Failed to retrieve recent analyses:', error);
      throw this.handleDbError(error, 'retrieve recent analyses');
    }
  }

  // Frame storage operations
  async storeFrames(videoId: string, frames: ExtractedFrame[]): Promise<void> {
    try {
      const storedFrames: StoredFrame[] = frames.map((frame, index) => ({
        id: `${videoId}-frame-${index}`,
        videoId,
        frameIndex: index,
        timestamp: frame.timestamp,
        thumbnailData: frame.base64,
        isKeyframe: frame.isKeyframe,
        extractedAt: new Date()
      }));

      await this.frames.bulkPut(storedFrames);
      console.log(`Stored ${storedFrames.length} frames for video: ${videoId}`);
    } catch (error) {
      console.error('Failed to store frames:', error);
      throw this.handleDbError(error, 'store frames');
    }
  }

  async getVideoFrames(videoId: string, includeThumbnails = false): Promise<StoredFrame[]> {
    try {
      const frames = await this.frames
        .where('videoId')
        .equals(videoId)
        .sortBy('frameIndex');

      // Optionally exclude large thumbnail data
      if (!includeThumbnails) {
        return frames.map(f => ({ ...f, thumbnailData: '' }));
      }
      
      return frames;
    } catch (error) {
      console.error('Failed to retrieve frames:', error);
      throw this.handleDbError(error, 'retrieve frames');
    }
  }

  async getKeyFrames(videoId: string): Promise<StoredFrame[]> {
    try {
      return await this.frames
        .where('[videoId+isKeyframe]')
        .equals([videoId, 1]) // isKeyframe = true
        .sortBy('timestamp');
    } catch (error) {
      console.error('Failed to retrieve keyframes:', error);
      throw this.handleDbError(error, 'retrieve keyframes');
    }
  }

  // API caching for Gemini responses
  async getCachedResponse(requestKey: string): Promise<ApiCache | undefined> {
    try {
      const cached = await this.apiCache.where('requestKey').equals(requestKey).first();
      
      if (cached && cached.expiresAt > new Date()) {
        return cached;
      }
      
      // Delete expired cache
      if (cached) {
        await this.apiCache.delete(cached.id);
      }
      
      return undefined;
    } catch (error) {
      console.error('Failed to retrieve cached response:', error);
      return undefined; // Fail silently for cache misses
    }
  }

  async storeCachedResponse(
    requestKey: string,
    responseData: any,
    ttlMinutes: number = 60
  ): Promise<void> {
    try {
      const cached: ApiCache = {
        id: crypto.randomUUID(),
        requestKey,
        responseData,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + ttlMinutes * 60000)
      };

      await this.apiCache.put(cached);
      console.log(`Response cached with TTL: ${ttlMinutes} minutes`);
    } catch (error) {
      console.warn('Failed to cache response:', error);
      // Don't throw - cache failures are non-critical
    }
  }

  // User preferences
  async getPreferences(userId: string): Promise<UserPreferences | undefined> {
    try {
      return await this.preferences.where('userId').equals(userId).first();
    } catch (error) {
      console.error('Failed to retrieve preferences:', error);
      return undefined;
    }
  }

  async setPreferences(userId: string, preferences: UserPreferences['preferences']): Promise<void> {
    try {
      await this.preferences.put({
        id: userId,
        userId,
        preferences,
        updatedAt: new Date()
      });
      
      console.log('Preferences updated');
    } catch (error) {
      console.error('Failed to store preferences:', error);
      throw this.handleDbError(error, 'store preferences');
    }
  }

  // Google Drive file cache
  async cacheDriveFiles(userId: string, files: GoogleDriveFile[]): Promise<void> {
    try {
      const cacheEntries = files.map(file => ({
        ...file,
        userId,
        lastSynced: new Date()
      }));

      await this.driveFiles.bulkPut(cacheEntries);
      console.log(`Cached ${cacheEntries.length} Drive files`);
    } catch (error) {
      console.error('Failed to cache Drive files:', error);
      throw this.handleDbError(error, 'cache Drive files');
    }
  }

  async getCachedDriveFiles(userId: string, maxAgeMinutes: number = 30): Promise<GoogleDriveFile[]> {
    try {
      const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60000);
      
      const cached = await this.driveFiles
        .where('[userId+lastSynced]')
        .between([userId, cutoffTime], [userId, Dexie.maxKey])
        .toArray();

      return cached.map(({ userId, lastSynced, ...file }) => file);
    } catch (error) {
      console.error('Failed to retrieve cached Drive files:', error);
      return []; // Fail silently
    }
  }

  // Export data for backup
  async exportData(videoId: string): Promise<{
    video: StoredVideoFile | undefined;
    analyses: StoredAnalysis[];
    frames: StoredFrame[];
  }> {
    try {
      const [video, analyses, videoFrames] = await Promise.all([
        this.getVideoFile(videoId),
        this.getAnalysesByVideo(videoId),
        this.getVideoFrames(videoId, true) // include thumbnails
      ]);

      return { video, analyses, frames: videoFrames };
    } catch (error) {
      console.error('Failed to export data:', error);
      throw this.handleDbError(error, 'export data');
    }
  }

  async importData(backup: {
    video: StoredVideoFile;
    analyses: StoredAnalysis[];
    frames: StoredFrame[];
  }): Promise<void> {
    try {
      await this.transaction('rw', [this.videos, this.analyses, this.frames], async () => {
        await this.videos.put(backup.video);
        await this.analyses.bulkPut(backup.analyses);
        await this.frames.bulkPut(backup.frames);
      });
      
      console.log(`Imported backup for video: ${backup.video.id}`);
    } catch (error) {
      console.error('Failed to import backup:', error);
      throw this.handleDbError(error, 'import backup');
    }
  }

  // Storage management
  async getStorageUsage(): Promise<{
    totalBytes: number;
    quotaBytes: number;
    usagePercent: number;
  }> {
    try {
      if (!navigator.storage?.estimate) {
        return { totalBytes: 0, quotaBytes: 0, usagePercent: 0 };
      }

      const estimate = await navigator.storage.estimate();
      const totalBytes = estimate.usage || 0;
      const quotaBytes = estimate.quota || 0;
      const usagePercent = quotaBytes > 0 ? (totalBytes / quotaBytes) * 100 : 0;

      return { totalBytes, quotaBytes, usagePercent };
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return { totalBytes: 0, quotaBytes: 0, usagePercent: 0 };
    }
  }

  async cleanupOldData(maxAgeDays: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

      console.log(`Cleaning up data older than ${cutoffDate.toISOString()}`);

      // Clean up old analyses and their frames
      const oldAnalyses = await this.analyses
        .where('createdAt')
        .below(cutoffDate)
        .toArray();

      for (const analysis of oldAnalyses) {
        await this.deleteVideoFile(analysis.videoId);
      }

      // Clean up expired API cache
      await this.apiCache.where('expiresAt').below(new Date()).delete();

      // Clean up old Drive cache
      await this.driveFiles.where('lastSynced').below(cutoffDate).delete();

      console.log('Cleanup completed');
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  private async checkStorageQuota(): Promise<void> {
    try {
      const usage = await this.getStorageUsage();
      
      if (usage.usagePercent > 80) {
        console.warn('Storage usage high:', usage.usagePercent.toFixed(2) + '%');
        
        // Trigger cleanup of old data
        await this.cleanupOldData(7); // Keep only last 7 days
      }
    } catch (error) {
      console.error('Failed to check storage quota:', error);
    }
  }

  private setupCleanupTask(): void {
    // Run cleanup every hour
    setInterval(() => {
      this.cleanupOldData().catch(console.error);
    }, 60 * 60 * 1000);

    // Run quota check every 15 minutes
    setInterval(() => {
      this.checkStorageQuota().catch(console.error);
    }, 15 * 60 * 1000);
  }

  private handleDbError(error: any, operation: string): Error {
    const message = `Database ${operation} failed: ${error.message || error}`;
    console.error(message);
    
    if (error.name === 'QuotaExceededError') {
      return new Error('Storage limit exceeded. Please delete old videos to free up space.');
    }
    
    if (error.name === 'VersionError') {
      return new Error('Database version mismatch. Please refresh the page.');
    }
    
    return new Error(`Database error: ${message}`);
  }
}

// Singleton instance with lazy initialization
let dbInstance: VideoAnalysisDB | null = null;

export const getDb = (): VideoAnalysisDB => {
  if (!dbInstance) {
    dbInstance = new VideoAnalysisDB();
  }
  return dbInstance;
};

// Initialize on module import
export const initializeDatabase = async (): Promise<void> => {
  const db = getDb();
  await db.initialize();
};
```

**File: src/hooks/useIndexedDB.ts**
```typescript
import { useState, useEffect, useCallback } from 'react';
import { getDb, StoredVideoFile, StoredAnalysis, StoredFrame } from '../services/indexedDb';
import { VideoFile } from '../types';

export const useIndexedDB = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState({ totalBytes: 0, quotaBytes: 0, usagePercent: 0 });
  
  const db = getDb();

  // Initialize database on mount
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await db.initialize();
        setIsInitialized(true);
        
        // Get initial storage usage
        const usageData = await db.getStorageUsage();
        setUsage(usageData);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialize database';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [db]);

  // Save video file
  const saveVideoFile = useCallback(async (videoFile: VideoFile & { blob?: Blob }): Promise<string> => {
    try {
      setLoading(true);
      setError(null);
      
      const storedFile: StoredVideoFile = {
        id: videoFile.id,
        name: videoFile.name,
        size: videoFile.size,
        type: videoFile.type,
        duration: videoFile.duration,
        thumbnailUrl: videoFile.thumbnailUrl,
        driveFileId: videoFile.driveFileId,
        uploadDate: videoFile.uploadDate,
        blob: videoFile.file
      };
      
      const id = await db.storeVideoFile(storedFile);
      return id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save video';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [db]);

  // Load video file
  const loadVideoFile = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      return await db.getVideoFile(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load video';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [db]);

  // Save analysis result
  const saveAnalysis = useCallback(async (
    videoId: string,
    videoName: string,
    analysisResult: any
  ): Promise<string> => {
    try {
      setLoading(true);
      setError(null);
      
      const storedAnalysis: StoredAnalysis = {
        id: analysisResult.id || crypto.randomUUID(),
        videoId,
        videoName,
        status: analysisResult.status || 'completed',
        summary: analysisResult.summary,
        temporalSegments: analysisResult.temporalSegments,
        spatialAnalysis: analysisResult.spatialAnalysis,
        reasoning: analysisResult.reasoning,
        createdAt: analysisResult.createdAt || new Date(),
        updatedAt: new Date()
      };
      
      const id = await db.storeAnalysis(storedAnalysis);
      return id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save analysis';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [db]);

  // Load recent analyses
  const loadRecentAnalyses = useCallback(async (limit = 20) => {
    try {
      setLoading(true);
      setError(null);
      
      return await db.getRecentAnalyses(limit);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load analyses';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [db]);

  // Cleanup old data
  const cleanupOldData = useCallback(async (maxAgeDays = 30) => {
    try {
      setLoading(true);
      setError(null);
      
      await db.cleanupOldData(maxAgeDays);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Cleanup failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [db]);

  // Get storage usage
  const refreshStorageUsage = useCallback(async () => {
    try {
      const usageData = await db.getStorageUsage();
      setUsage(usageData);
    } catch (err) {
      console.error('Failed to get storage usage:', err);
    }
  }, [db]);

  return {
    isInitialized,
    loading,
    error,
    usage,
    saveVideoFile,
    loadVideoFile,
    saveAnalysis,
    loadRecentAnalyses,
    cleanupOldData,
    refreshStorageUsage
  };
};
```

### ACCEPTANCE CRITERIA FOR PHASE 7:

1. ✅ IndexedDB initializes successfully in browser
2. ✅ Video files stored with BLOB data
3. ✅ Analysis results saved and retrieved correctly
4. ✅ Frames stored with thumbnail data
5. ✅ Query by videoId returns correct data
6. ✅ Recent analyses loaded in reverse chronological order
7. ✅ API responses cached with TTL expiration
8. ✅ Storage quota monitored (usage < 80% triggers cleanup)
9. ✅ Old data auto-deleted after 30 days
10. ✅ Cascade delete removes related records
11. ✅ Export/backup creates valid JSON
12. ✅ Import/restore loads data correctly
13. ✅ User preferences stored and retrieved
14. ✅ Drive file cache syncs correctly
15. ✅ Transaction handling for atomic operations
16. ✅ Error recovery for corrupted database
17. ✅ TypeScript generics work with Dexie tables
18. ✅ Database version migrations handled
19. ✅ Storage usage shows accurate percentage
20. ✅ Memory efficient (no leaks in hooks)

### TESTING CHECKLIST:

```bash
# Manual tests:
# 1. Save video file (50MB) - verify in IndexedDB
# 2. Save analysis result - verify all fields stored
# 3. Store frames (30 frames) - verify thumbnails saved
# 4. Load video by ID - returns correct file
# 5. Load recent analyses - correct order, use limit
# 6. Query by videoId - returns correct analyses
# 7. API cache stores/retrieves with TTL
# 8. Expired cache entries auto-deleted
# 9. Delete video - cascades to analyses/frames
# 10. Export backup - JSON valid structure
# 11. Import backup - data loads correctly
# 12. Storage quota at 85% - triggers cleanup
# 13. Save user preferences - persists across sessions
# 14. Old data (31 days) - auto-deleted
# 15. Concurrent operations - transaction safety
```

### PERFORMANCE REQUIREMENTS:

- Database open: < 500ms
- Single record save: < 100ms
- Bulk insert (30 frames): < 2 seconds
- Query by index: < 50ms
- Count operation: < 50ms
- Storage quota check: < 200ms
- Cleanup (1000 old records): < 5 seconds
- Memory overhead: < 20MB metadata

### STORAGE LIMITS:

- Per origin quota: ~60% of available disk space (browser dependent)
- Single file max: 2GB (IndexedDB limit, but we enforce 500MB)
- Total database: Up to quota
- API cache: Keep last 1000 responses
- Frame thumbnails: JPEG at 0.8 quality (~10KB each)
- Video retention: 30 days default
- Analysis retention: 90 days (longer than video)

### ERROR HANDLING:

- QuotaExceededError: Show user clear message to delete files
- VersionError: Force refresh/reload page
- TransactionError: Retry once, then fail gracefully
- ConstraintError: Validate data before insert
- AbortError: User cancelled operation
- UnknownError: Report and suggest restart

### BROWSER COMPATIBILITY:

- Chrome 11+ (IndexedDB support)
- Firefox 16+
- Safari 7.1+
- Edge 12+
- Mobile browsers (iOS Safari 8+, Chrome Android)
- Fallback gracefully for private/incognito mode

### DATA PRIVACY:

- All data stored client-side only
- No data transmitted to backend
- Export data is user-owned
- Clear instructions on how to delete data
- GDPR compliant (user has full control)
- No tracking or analytics stored