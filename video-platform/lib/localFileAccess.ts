// Local File Access using File System Access API
// Provides read-only access to user's local files with permission

export interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
}

export interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file';
  getFile(): Promise<File>;
}

export interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: 'directory';
  values(): AsyncIterableIterator<FileSystemHandle>;
  getFileHandle(name: string): Promise<FileSystemFileHandle>;
  getDirectoryHandle(name: string): Promise<FileSystemDirectoryHandle>;
}

export interface LocalFile {
  name: string;
  path: string;
  size: number;
  type: string;
  lastModified: number;
  handle?: FileSystemFileHandle;
}

export interface LocalDirectory {
  name: string;
  path: string;
  handle: FileSystemDirectoryHandle;
  files: LocalFile[];
  subdirectories: LocalDirectory[];
}

// Check if File System Access API is supported
export function isFileSystemAccessSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'showOpenFilePicker' in window && 'showDirectoryPicker' in window;
}

// Pick a single file
export async function pickFile(options?: {
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
  multiple?: boolean;
}): Promise<File[]> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API is not supported in this browser');
  }

  try {
    const handles = await (window as any).showOpenFilePicker({
      multiple: options?.multiple || false,
      types: options?.types || [
        {
          description: 'All Files',
          accept: {
            'video/*': ['.mp4', '.webm', '.mov', '.avi', '.mkv'],
            'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
            'audio/*': ['.mp3', '.wav', '.ogg', '.m4a', '.flac'],
            'application/pdf': ['.pdf'],
            'text/*': ['.txt', '.md', '.json', '.csv'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
          },
        },
      ],
    });

    const files: File[] = [];
    for (const handle of handles) {
      const file = await handle.getFile();
      files.push(file);
    }

    return files;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.log('[LocalFileAccess] User cancelled file picker');
      return [];
    }
    throw error;
  }
}

// Pick a directory
export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API is not supported in this browser');
  }

  try {
    const handle = await (window as any).showDirectoryPicker({
      mode: 'read', // Read-only access
    });

    return handle;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.log('[LocalFileAccess] User cancelled directory picker');
      return null;
    }
    throw error;
  }
}

// Read all files from a directory (recursive)
export async function readDirectory(
  dirHandle: FileSystemDirectoryHandle,
  path: string = '',
  maxDepth: number = 5,
  currentDepth: number = 0
): Promise<LocalDirectory> {
  if (currentDepth >= maxDepth) {
    console.warn(`[LocalFileAccess] Max depth ${maxDepth} reached at ${path}`);
    return {
      name: dirHandle.name,
      path,
      handle: dirHandle,
      files: [],
      subdirectories: [],
    };
  }

  const files: LocalFile[] = [];
  const subdirectories: LocalDirectory[] = [];

  try {
    for await (const entry of dirHandle.values()) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name;

      if (entry.kind === 'file') {
        try {
          const fileHandle = entry as FileSystemFileHandle;
          const file = await fileHandle.getFile();

          files.push({
            name: file.name,
            path: entryPath,
            size: file.size,
            type: file.type || 'application/octet-stream',
            lastModified: file.lastModified,
            handle: fileHandle,
          });
        } catch (error) {
          console.warn(`[LocalFileAccess] Could not read file ${entryPath}:`, error);
        }
      } else if (entry.kind === 'directory') {
        try {
          const subDirHandle = entry as FileSystemDirectoryHandle;
          const subDir = await readDirectory(subDirHandle, entryPath, maxDepth, currentDepth + 1);
          subdirectories.push(subDir);
        } catch (error) {
          console.warn(`[LocalFileAccess] Could not read directory ${entryPath}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('[LocalFileAccess] Error reading directory:', error);
  }

  return {
    name: dirHandle.name,
    path,
    handle: dirHandle,
    files,
    subdirectories,
  };
}

// Get all files from a directory (flat list)
export function flattenDirectory(directory: LocalDirectory): LocalFile[] {
  const allFiles: LocalFile[] = [...directory.files];

  for (const subdir of directory.subdirectories) {
    allFiles.push(...flattenDirectory(subdir));
  }

  return allFiles;
}

// Filter files by type
export function filterFilesByType(files: LocalFile[], types: string[]): LocalFile[] {
  return files.filter((file) => {
    const fileType = file.type.toLowerCase();
    return types.some((type) => {
      if (type.endsWith('/*')) {
        const prefix = type.slice(0, -2);
        return fileType.startsWith(prefix);
      }
      return fileType === type;
    });
  });
}

// Filter files by extension
export function filterFilesByExtension(files: LocalFile[], extensions: string[]): LocalFile[] {
  return files.filter((file) => {
    const ext = file.name.toLowerCase().split('.').pop() || '';
    return extensions.includes(`.${ext}`);
  });
}

// Search files by name
export function searchFilesByName(files: LocalFile[], query: string): LocalFile[] {
  const lowerQuery = query.toLowerCase();
  return files.filter((file) => file.name.toLowerCase().includes(lowerQuery));
}

// Read file content as text
export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// Read file content as data URL
export async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Read file content as array buffer
export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

// Get file extension
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? `.${parts.pop()?.toLowerCase()}` : '';
}

// Get MIME type from extension
export function getMimeTypeFromExtension(extension: string): string {
  const mimeTypes: Record<string, string> = {
    // Video
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    // Image
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    // Audio
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.flac': 'audio/flac',
    // Documents
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Text
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.json': 'application/json',
    '.csv': 'text/csv',
    '.xml': 'application/xml',
    '.html': 'text/html',
  };

  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Persistent storage for directory handles (using IndexedDB)
const DB_NAME = 'LocalFileAccessDB';
const DB_VERSION = 1;
const STORE_NAME = 'directoryHandles';

export async function saveDirectoryHandle(
  name: string,
  handle: FileSystemDirectoryHandle
): Promise<void> {
  return new Promise((resolve, reject) => {
    openDB().then((db) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put({ name, handle });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    }).catch(reject);
  });
}

export async function getDirectoryHandle(name: string): Promise<FileSystemDirectoryHandle | null> {
  return new Promise((resolve, reject) => {
    openDB().then((db) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(name);
      
      request.onsuccess = () => resolve(request.result?.handle || null);
      request.onerror = () => reject(request.error);
    }).catch(reject);
  });
}

export async function getAllDirectoryHandles(): Promise<
  Array<{ name: string; handle: FileSystemDirectoryHandle }>
> {
  return new Promise((resolve, reject) => {
    openDB().then((db) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    }).catch(reject);
  });
}

export async function removeDirectoryHandle(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    openDB().then((db) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(name);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    }).catch(reject);
  });
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'name' });
      }
    };
  });
}

// Verify permission for a directory handle
export async function verifyPermission(
  handle: FileSystemDirectoryHandle,
  readWrite: boolean = false
): Promise<boolean> {
  const options: any = {
    mode: readWrite ? 'readwrite' : 'read',
  };

  // Check if permission was already granted
  if ((await handle.queryPermission(options)) === 'granted') {
    return true;
  }

  // Request permission
  if ((await handle.requestPermission(options)) === 'granted') {
    return true;
  }

  return false;
}
