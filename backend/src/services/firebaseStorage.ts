import { Storage } from '@google-cloud/storage';
import * as path from 'path';
import { StorageAdapter } from './storage';
import { config } from '../utils/env';
import logger from '../utils/logger';

class FirebaseStorageAdapter implements StorageAdapter {
  private storage: Storage;
  private bucketName: string;

  constructor() {
    if (!config.firebaseProjectId || !config.firebaseClientEmail || !config.firebasePrivateKey) {
      throw new Error('Firebase configuration is incomplete. Please check your environment variables.');
    }

    this.storage = new Storage({
      projectId: config.firebaseProjectId,
      credentials: {
        client_email: config.firebaseClientEmail,
        private_key: config.firebasePrivateKey,
      },
    });

    this.bucketName = `${config.firebaseProjectId}.appspot.com`;
    logger.info(`Firebase storage initialized with bucket: ${this.bucketName}`);
  }

  async upload(filePath: string, destination: string): Promise<string> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const destPath = `videos/${destination}`;
      
      await bucket.upload(filePath, {
        destination: destPath,
        metadata: {
          contentType: this.getContentType(path.extname(destination)),
        },
      });

      logger.info(`Uploaded file to Firebase Storage: ${destPath}`);
      return destPath;
    } catch (error) {
      logger.error('Failed to upload to Firebase:', error);
      throw error;
    }
  }

  async download(videoPath: string): Promise<Buffer> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(videoPath);
      
      const [buffer] = await file.download();
      return buffer;
    } catch (error) {
      logger.error('Failed to download from Firebase:', error);
      throw error;
    }
  }

  async delete(videoPath: string): Promise<void> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(videoPath);
      
      await file.delete();
      logger.info(`Deleted file from Firebase Storage: ${videoPath}`);
    } catch (error) {
      logger.error('Failed to delete from Firebase:', error);
      throw error;
    }
  }

  async exists(videoPath: string): Promise<boolean> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(videoPath);
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      logger.error('Failed to check file existence in Firebase:', error);
      return false;
    }
  }

  getStream(videoPath: string): NodeJS.ReadableStream {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(videoPath);
    
    return file.createReadStream();
  }

  async getSignedUrl(videoPath: string, expiresIn: number = 3600): Promise<string> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(videoPath);
      
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expiresIn * 1000,
      });

      return url;
    } catch (error) {
      logger.error('Failed to generate signed URL:', error);
      throw error;
    }
  }

  private getContentType(extension: string): string {
    const contentTypes: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.webm': 'video/webm',
    };
    return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
  }
}

let firebaseStorageAdapterInstance: FirebaseStorageAdapter | null = null;

export function getFirebaseStorageAdapter(): StorageAdapter {
  if (!firebaseStorageAdapterInstance) {
    firebaseStorageAdapterInstance = new FirebaseStorageAdapter();
  }
  return firebaseStorageAdapterInstance;
}
