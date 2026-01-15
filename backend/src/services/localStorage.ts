import * as fs from 'fs';
import * as path from 'path';
import { StorageAdapter } from './storage';
import { config } from '../utils/env';
import logger from '../utils/logger';

export class LocalStorageAdapter implements StorageAdapter {
  private storagePath: string;

  constructor() {
    this.storagePath = config.videoStoragePath;
    this.ensureStorageDirectory();
  }

  private ensureStorageDirectory(): void {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
      logger.info(`Created video storage directory: ${this.storagePath}`);
    }
  }

  async upload(filePath: string, destination: string): Promise<string> {
    const fullPath = path.join(this.storagePath, destination);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await fs.promises.copyFile(filePath, fullPath);
    logger.info(`Uploaded file to local storage: ${fullPath}`);

    return fullPath;
  }

  async download(videoPath: string): Promise<Buffer> {
    const fullPath = path.join(this.storagePath, videoPath);
    return fs.promises.readFile(fullPath);
  }

  async delete(videoPath: string): Promise<void> {
    const fullPath = path.join(this.storagePath, videoPath);
    
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      logger.info(`Deleted file from local storage: ${fullPath}`);
    }
  }

  async exists(videoPath: string): Promise<boolean> {
    const fullPath = path.join(this.storagePath, videoPath);
    return fs.existsSync(fullPath);
  }

  getStream(videoPath: string): NodeJS.ReadableStream {
    const fullPath = path.join(this.storagePath, videoPath);
    return fs.createReadStream(fullPath);
  }

  async getSignedUrl(videoPath: string, expiresIn: number = 3600): Promise<string> {
    // Local storage doesn't need signed URLs, return the local path
    // In production, you might want to use a reverse proxy or CDN
    return path.join(this.storagePath, videoPath);
  }
}

export const localStorageAdapter = new LocalStorageAdapter();
