// IndexedDB wrapper for storing video files locally
const DB_NAME = 'gemini-video-storage';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

interface VideoFile {
  id: string;
  file: Blob;
  filename: string;
  mimeType: string;
  uploadedAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function saveVideoFile(id: string, file: File): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  const videoFile: VideoFile = {
    id,
    file,
    filename: file.name,
    mimeType: file.type,
    uploadedAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const request = store.put(videoFile);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getVideoFile(id: string): Promise<Blob | null> {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const store = transaction.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => {
      const result = request.result as VideoFile | undefined;
      resolve(result ? result.file : null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteVideoFile(id: string): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function createBlobUrl(id: string): Promise<string | null> {
  const blob = await getVideoFile(id);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}
