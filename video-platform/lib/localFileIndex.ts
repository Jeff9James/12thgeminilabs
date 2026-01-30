// Local File Index - Store and search local file metadata
// Enables AI search across local files without uploading them

import type { LocalFile } from './localFileAccess';

export interface IndexedFile extends LocalFile {
  id: string;
  directoryName: string;
  directoryPath: string;
  indexed: boolean;
  indexedAt?: number;
  analyzed: boolean;
  analyzedAt?: number;
  analysisResult?: FileAnalysisResult;
  contentPreview?: string; // First few KB for text files
  tags?: string[];
  aiSummary?: string;
}

export interface FileAnalysisResult {
  summary?: string;
  keywords?: string[];
  topics?: string[];
  entities?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  language?: string;
  confidence?: number;
}

export interface SearchResult {
  file: IndexedFile;
  score: number;
  matchType: 'filename' | 'content' | 'ai-analysis' | 'metadata';
  matchedText?: string;
  highlights?: string[];
}

export interface SearchOptions {
  query: string;
  fileTypes?: string[];
  directories?: string[];
  dateRange?: { from?: number; to?: number };
  includeAnalyzed?: boolean;
  includeUnanalyzed?: boolean;
  maxResults?: number;
  sortBy?: 'relevance' | 'name' | 'date' | 'size';
  sortOrder?: 'asc' | 'desc';
}

// IndexedDB configuration
const DB_NAME = 'LocalFileIndexDB';
const DB_VERSION = 1;
const FILES_STORE = 'indexedFiles';
const ANALYSIS_STORE = 'analysisCache';

// Initialize IndexedDB
async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Files store
      if (!db.objectStoreNames.contains(FILES_STORE)) {
        const filesStore = db.createObjectStore(FILES_STORE, { keyPath: 'id' });
        filesStore.createIndex('path', 'path', { unique: true });
        filesStore.createIndex('directoryName', 'directoryName', { unique: false });
        filesStore.createIndex('type', 'type', { unique: false });
        filesStore.createIndex('indexed', 'indexed', { unique: false });
        filesStore.createIndex('analyzed', 'analyzed', { unique: false });
        filesStore.createIndex('lastModified', 'lastModified', { unique: false });
      }

      // Analysis cache store
      if (!db.objectStoreNames.contains(ANALYSIS_STORE)) {
        const analysisStore = db.createObjectStore(ANALYSIS_STORE, { keyPath: 'fileId' });
        analysisStore.createIndex('analyzedAt', 'analyzedAt', { unique: false });
      }
    };
  });
}

// Add file to index
export async function indexFile(file: LocalFile, directoryName: string, directoryPath: string): Promise<IndexedFile> {
  const db = await openDatabase();

  const indexedFile: IndexedFile = {
    ...file,
    id: `${directoryPath}/${file.path}`,
    directoryName,
    directoryPath,
    indexed: true,
    indexedAt: Date.now(),
    analyzed: false,
  };

  // Try to get content preview for text files
  if (file.type.startsWith('text/') && file.handle) {
    try {
      const fileObj = await file.handle.getFile();
      const text = await fileObj.text();
      indexedFile.contentPreview = text.slice(0, 5000); // First 5KB
    } catch (error) {
      console.warn('[LocalFileIndex] Could not read text content:', error);
    }
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILES_STORE, 'readwrite');
    const store = tx.objectStore(FILES_STORE);
    const request = store.put(indexedFile);

    request.onsuccess = () => {
      console.log('[LocalFileIndex] Indexed file:', indexedFile.name);
      resolve(indexedFile);
    };
    request.onerror = () => reject(request.error);
  });
}

// Index multiple files
export async function indexFiles(
  files: LocalFile[],
  directoryName: string,
  directoryPath: string,
  onProgress?: (current: number, total: number) => void
): Promise<IndexedFile[]> {
  const indexed: IndexedFile[] = [];

  for (let i = 0; i < files.length; i++) {
    try {
      const indexedFile = await indexFile(files[i], directoryName, directoryPath);
      indexed.push(indexedFile);

      if (onProgress) {
        onProgress(i + 1, files.length);
      }
    } catch (error) {
      console.error('[LocalFileIndex] Error indexing file:', files[i].name, error);
    }
  }

  return indexed;
}

// Get all indexed files
export async function getAllIndexedFiles(): Promise<IndexedFile[]> {
  return new Promise((resolve, reject) => {
    openDatabase().then((db) => {
      const tx = db.transaction(FILES_STORE, 'readonly');
      const store = tx.objectStore(FILES_STORE);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    }).catch(reject);
  });
}

// Get indexed files by directory
export async function getIndexedFilesByDirectory(directoryName: string): Promise<IndexedFile[]> {
  return new Promise((resolve, reject) => {
    openDatabase().then((db) => {
      const tx = db.transaction(FILES_STORE, 'readonly');
      const store = tx.objectStore(FILES_STORE);
      const index = store.index('directoryName');
      const request = index.getAll(directoryName);
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    }).catch(reject);
  });
}

// Get file by ID
export async function getIndexedFile(id: string): Promise<IndexedFile | null> {
  return new Promise((resolve, reject) => {
    openDatabase().then((db) => {
      const tx = db.transaction(FILES_STORE, 'readonly');
      const store = tx.objectStore(FILES_STORE);
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    }).catch(reject);
  });
}

// Update file analysis result
export async function updateFileAnalysis(
  fileId: string,
  analysis: FileAnalysisResult
): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    // Update file
    const fileTx = db.transaction(FILES_STORE, 'readwrite');
    const fileStore = fileTx.objectStore(FILES_STORE);
    const getRequest = fileStore.get(fileId);

    getRequest.onsuccess = () => {
      const file = getRequest.result;
      
      if (file) {
        file.analyzed = true;
        file.analyzedAt = Date.now();
        file.analysisResult = analysis;
        file.aiSummary = analysis.summary;
        file.tags = analysis.keywords || [];
        
        const putRequest = fileStore.put(file);
        putRequest.onerror = () => reject(putRequest.error);
      }

      // Cache analysis
      const cacheTx = db.transaction(ANALYSIS_STORE, 'readwrite');
      const cacheStore = cacheTx.objectStore(ANALYSIS_STORE);
      const cacheRequest = cacheStore.put({
        fileId,
        analysis,
        analyzedAt: Date.now(),
      });

      cacheRequest.onsuccess = () => {
        console.log('[LocalFileIndex] Updated analysis for:', fileId);
        resolve();
      };
      cacheRequest.onerror = () => reject(cacheRequest.error);
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
}

// Search indexed files
export async function searchIndexedFiles(options: SearchOptions): Promise<SearchResult[]> {
  const allFiles = await getAllIndexedFiles();
  const results: SearchResult[] = [];

  const query = options.query.toLowerCase();

  for (const file of allFiles) {
    let score = 0;
    let matchType: SearchResult['matchType'] = 'filename';
    const highlights: string[] = [];

    // Filter by file types
    if (options.fileTypes && options.fileTypes.length > 0) {
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!options.fileTypes.includes(fileExt)) continue;
    }

    // Filter by directories
    if (options.directories && options.directories.length > 0) {
      if (!options.directories.includes(file.directoryName)) continue;
    }

    // Filter by date range
    if (options.dateRange) {
      if (options.dateRange.from && file.lastModified < options.dateRange.from) continue;
      if (options.dateRange.to && file.lastModified > options.dateRange.to) continue;
    }

    // Filter by analysis status
    if (options.includeAnalyzed === false && file.analyzed) continue;
    if (options.includeUnanalyzed === false && !file.analyzed) continue;

    // Skip if no query
    if (!query) {
      results.push({ file, score: 0, matchType: 'filename' });
      continue;
    }

    // Match filename (highest priority)
    if (file.name.toLowerCase().includes(query)) {
      score += 100;
      matchType = 'filename';
      highlights.push(`Filename: ${file.name}`);
    }

    // Match path
    if (file.path.toLowerCase().includes(query)) {
      score += 50;
      highlights.push(`Path: ${file.path}`);
    }

    // Match content preview (text files)
    if (file.contentPreview) {
      const contentLower = file.contentPreview.toLowerCase();
      if (contentLower.includes(query)) {
        score += 70;
        matchType = 'content';

        // Extract context around match
        const index = contentLower.indexOf(query);
        const start = Math.max(0, index - 50);
        const end = Math.min(file.contentPreview.length, index + query.length + 50);
        const context = file.contentPreview.slice(start, end);
        highlights.push(`Content: ...${context}...`);
      }
    }

    // Match AI analysis
    if (file.analyzed && file.analysisResult) {
      const { summary, keywords, topics, entities } = file.analysisResult;

      if (summary && summary.toLowerCase().includes(query)) {
        score += 90;
        matchType = 'ai-analysis';
        highlights.push(`AI Summary: ${summary.slice(0, 100)}...`);
      }

      if (keywords && keywords.some((k) => k.toLowerCase().includes(query))) {
        score += 80;
        matchType = 'ai-analysis';
        highlights.push(`Keywords: ${keywords.join(', ')}`);
      }

      if (topics && topics.some((t) => t.toLowerCase().includes(query))) {
        score += 75;
        matchType = 'ai-analysis';
        highlights.push(`Topics: ${topics.join(', ')}`);
      }

      if (entities && entities.some((e) => e.toLowerCase().includes(query))) {
        score += 70;
        matchType = 'ai-analysis';
        highlights.push(`Entities: ${entities.join(', ')}`);
      }
    }

    // Match AI summary
    if (file.aiSummary && file.aiSummary.toLowerCase().includes(query)) {
      score += 85;
      matchType = 'ai-analysis';
      highlights.push(`Summary: ${file.aiSummary.slice(0, 100)}...`);
    }

    // Match tags
    if (file.tags && file.tags.some((tag) => tag.toLowerCase().includes(query))) {
      score += 60;
      highlights.push(`Tags: ${file.tags.join(', ')}`);
    }

    // Match file type
    if (file.type.toLowerCase().includes(query)) {
      score += 30;
      matchType = 'metadata';
      highlights.push(`Type: ${file.type}`);
    }

    // Only include if there's a match
    if (score > 0) {
      results.push({
        file,
        score,
        matchType,
        highlights: highlights.slice(0, 3), // Top 3 highlights
      });
    }
  }

  // Sort results
  results.sort((a, b) => {
    if (options.sortBy === 'name') {
      return options.sortOrder === 'asc'
        ? a.file.name.localeCompare(b.file.name)
        : b.file.name.localeCompare(a.file.name);
    } else if (options.sortBy === 'date') {
      return options.sortOrder === 'asc'
        ? a.file.lastModified - b.file.lastModified
        : b.file.lastModified - a.file.lastModified;
    } else if (options.sortBy === 'size') {
      return options.sortOrder === 'asc'
        ? a.file.size - b.file.size
        : b.file.size - a.file.size;
    } else {
      // Default: sort by relevance (score)
      return b.score - a.score;
    }
  });

  // Limit results
  const maxResults = options.maxResults || 50;
  return results.slice(0, maxResults);
}

// Delete file from index
export async function removeIndexedFile(id: string): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    // Remove from files store
    const fileTx = db.transaction(FILES_STORE, 'readwrite');
    const fileStore = fileTx.objectStore(FILES_STORE);
    const fileRequest = fileStore.delete(id);

    fileRequest.onsuccess = () => {
      // Remove from analysis cache
      const cacheTx = db.transaction(ANALYSIS_STORE, 'readwrite');
      const cacheStore = cacheTx.objectStore(ANALYSIS_STORE);
      const cacheRequest = cacheStore.delete(id);

      cacheRequest.onsuccess = () => {
        console.log('[LocalFileIndex] Removed file from index:', id);
        resolve();
      };
      cacheRequest.onerror = () => reject(cacheRequest.error);
    };
    
    fileRequest.onerror = () => reject(fileRequest.error);
  });
}

// Delete all indexed files for a directory
export async function removeDirectoryFromIndex(directoryName: string): Promise<void> {
  const files = await getIndexedFilesByDirectory(directoryName);
  for (const file of files) {
    await removeIndexedFile(file.id);
  }
  console.log('[LocalFileIndex] Removed directory from index:', directoryName);
}

// Clear entire index
export async function clearIndex(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const filesTx = db.transaction(FILES_STORE, 'readwrite');
    const filesStore = filesTx.objectStore(FILES_STORE);
    const filesRequest = filesStore.clear();

    filesRequest.onsuccess = () => {
      const analysisTx = db.transaction(ANALYSIS_STORE, 'readwrite');
      const analysisStore = analysisTx.objectStore(ANALYSIS_STORE);
      const analysisRequest = analysisStore.clear();

      analysisRequest.onsuccess = () => {
        console.log('[LocalFileIndex] Cleared entire index');
        resolve();
      };
      analysisRequest.onerror = () => reject(analysisRequest.error);
    };
    
    filesRequest.onerror = () => reject(filesRequest.error);
  });
}

// Get index statistics
export async function getIndexStats(): Promise<{
  totalFiles: number;
  analyzedFiles: number;
  unanalyzedFiles: number;
  directories: string[];
  totalSize: number;
  fileTypes: Record<string, number>;
}> {
  const allFiles = await getAllIndexedFiles();

  const stats = {
    totalFiles: allFiles.length,
    analyzedFiles: allFiles.filter((f) => f.analyzed).length,
    unanalyzedFiles: allFiles.filter((f) => !f.analyzed).length,
    directories: Array.from(new Set(allFiles.map((f) => f.directoryName))),
    totalSize: allFiles.reduce((sum, f) => sum + f.size, 0),
    fileTypes: {} as Record<string, number>,
  };

  for (const file of allFiles) {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;
  }

  return stats;
}

// Check if file is already indexed
export async function isFileIndexed(path: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    openDatabase().then((db) => {
      const tx = db.transaction(FILES_STORE, 'readonly');
      const store = tx.objectStore(FILES_STORE);
      const index = store.index('path');
      const request = index.get(path);
      
      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => reject(request.error);
    }).catch(reject);
  });
}

// Batch operations for performance
export async function batchIndexFiles(
  batches: Array<{ files: LocalFile[]; directoryName: string; directoryPath: string }>,
  onProgress?: (current: number, total: number) => void
): Promise<IndexedFile[]> {
  const allIndexed: IndexedFile[] = [];
  let processed = 0;
  const total = batches.reduce((sum, batch) => sum + batch.files.length, 0);

  for (const batch of batches) {
    const indexed = await indexFiles(
      batch.files,
      batch.directoryName,
      batch.directoryPath,
      (current) => {
        if (onProgress) {
          onProgress(processed + current, total);
        }
      }
    );
    allIndexed.push(...indexed);
    processed += batch.files.length;
  }

  return allIndexed;
}
