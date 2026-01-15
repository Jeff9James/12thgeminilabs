import * as admin from 'firebase-admin';
import { StorageProvider } from './types';
import logger from '../../utils/logger';

export class FirebaseStorageProvider implements StorageProvider {
  name = 'firebase' as const;

  private bucket: admin.storage.Bucket | null = null;

  constructor(
    private projectId: string,
    private clientEmail: string,
    private privateKey: string,
    private bucketName: string
  ) {}

  async initialize(): Promise<void> {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: this.projectId,
          clientEmail: this.clientEmail,
          privateKey: this.privateKey,
        }),
        storageBucket: this.bucketName,
      });
    }

    this.bucket = admin.storage().bucket();
    logger.info(`Firebase storage initialized with bucket: ${this.bucketName}`);
  }

  async uploadFile(
    sourcePath: string,
    destinationPath: string,
    metadata?: { contentType?: string }
  ): Promise<string> {
    if (!this.bucket) {
      throw new Error('Firebase storage not initialized');
    }

    await this.bucket.upload(sourcePath, {
      destination: destinationPath,
      metadata: metadata ? { contentType: metadata.contentType } : undefined,
    });

    logger.info(`File uploaded to Firebase storage: ${destinationPath}`);
    return destinationPath;
  }

  async uploadBuffer(
    buffer: Buffer,
    destinationPath: string,
    metadata?: { contentType?: string }
  ): Promise<string> {
    if (!this.bucket) {
      throw new Error('Firebase storage not initialized');
    }

    const file = this.bucket.file(destinationPath);
    
    await file.save(buffer, {
      metadata: metadata ? { contentType: metadata.contentType } : undefined,
    });

    logger.info(`Buffer uploaded to Firebase storage: ${destinationPath}`);
    return destinationPath;
  }

  async downloadFile(sourcePath: string, destinationPath: string): Promise<void> {
    if (!this.bucket) {
      throw new Error('Firebase storage not initialized');
    }

    const file = this.bucket.file(sourcePath);
    await file.download({ destination: destinationPath });
    
    logger.info(`File downloaded from Firebase storage: ${sourcePath}`);
  }

  async getFileBuffer(sourcePath: string): Promise<Buffer> {
    if (!this.bucket) {
      throw new Error('Firebase storage not initialized');
    }

    const file = this.bucket.file(sourcePath);
    const [buffer] = await file.download();
    return buffer;
  }

  async deleteFile(filePath: string): Promise<void> {
    if (!this.bucket) {
      throw new Error('Firebase storage not initialized');
    }

    const file = this.bucket.file(filePath);
    await file.delete();
    
    logger.info(`File deleted from Firebase storage: ${filePath}`);
  }

  createReadStream(filePath: string): NodeJS.ReadableStream {
    if (!this.bucket) {
      throw new Error('Firebase storage not initialized');
    }

    const file = this.bucket.file(filePath);
    return file.createReadStream();
  }

  createWriteStream(filePath: string): NodeJS.WritableStream {
    if (!this.bucket) {
      throw new Error('Firebase storage not initialized');
    }

    const file = this.bucket.file(filePath);
    return file.createWriteStream();
  }

  async fileExists(filePath: string): Promise<boolean> {
    if (!this.bucket) {
      throw new Error('Firebase storage not initialized');
    }

    const file = this.bucket.file(filePath);
    try {
      await file.exists();
      return true;
    } catch {
      return false;
    }
  }

  async getFileSize(filePath: string): Promise<number> {
    if (!this.bucket) {
      throw new Error('Firebase storage not initialized');
    }

    const file = this.bucket.file(filePath);
    const [metadata] = await file.getMetadata();
    return parseInt(metadata.size || '0', 10);
  }

  async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    if (!this.bucket) {
      throw new Error('Firebase storage not initialized');
    }

    const file = this.bucket.file(filePath);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresIn * 1000,
    });

    return url;
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.bucket) {
        return false;
      }
      await this.bucket.getMetadata();
      return true;
    } catch {
      return false;
    }
  }
}
