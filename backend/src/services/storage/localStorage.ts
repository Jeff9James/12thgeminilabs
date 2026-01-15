import * as fs from 'fs';
import * as path from 'path';
import { createReadStream, createWriteStream, promises as fsPromises } from 'fs';
import { StorageProvider } from './types';
import logger from '../../utils/logger';

export class LocalStorageProvider implements StorageProvider {
  name = 'local' as const;

  constructor(private basePath: string) {}

  async initialize(): Promise<void> {
    await fsPromises.mkdir(this.basePath, { recursive: true });
    logger.info(`Local storage initialized at: ${this.basePath}`);
  }

  async uploadFile(
    sourcePath: string,
    destinationPath: string,
    metadata?: { contentType?: string }
  ): Promise<string> {
    const fullDestinationPath = path.join(this.basePath, destinationPath);
    const dir = path.dirname(fullDestinationPath);
    
    await fsPromises.mkdir(dir, { recursive: true });
    await fsPromises.copyFile(sourcePath, fullDestinationPath);
    
    logger.info(`File uploaded to local storage: ${destinationPath}`);
    return destinationPath;
  }

  async uploadBuffer(
    buffer: Buffer,
    destinationPath: string,
    metadata?: { contentType?: string }
  ): Promise<string> {
    const fullDestinationPath = path.join(this.basePath, destinationPath);
    const dir = path.dirname(fullDestinationPath);
    
    await fsPromises.mkdir(dir, { recursive: true });
    await fsPromises.writeFile(fullDestinationPath, buffer);
    
    logger.info(`Buffer uploaded to local storage: ${destinationPath}`);
    return destinationPath;
  }

  async downloadFile(sourcePath: string, destinationPath: string): Promise<void> {
    const fullSourcePath = path.join(this.basePath, sourcePath);
    await fsPromises.copyFile(fullSourcePath, destinationPath);
    logger.info(`File downloaded from local storage: ${sourcePath}`);
  }

  async getFileBuffer(sourcePath: string): Promise<Buffer> {
    const fullPath = path.join(this.basePath, sourcePath);
    return fsPromises.readFile(fullPath);
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(this.basePath, filePath);
    if (await this.fileExists(fullPath)) {
      await fsPromises.unlink(fullPath);
      logger.info(`File deleted from local storage: ${filePath}`);
    }
  }

  createReadStream(filePath: string): NodeJS.ReadableStream {
    const fullPath = path.join(this.basePath, filePath);
    return createReadStream(fullPath);
  }

  createWriteStream(filePath: string): NodeJS.WritableStream {
    const fullPath = path.join(this.basePath, filePath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    return createWriteStream(fullPath);
  }

  async fileExists(filePath: string): Promise<boolean> {
    const fullPath = path.join(this.basePath, filePath);
    try {
      await fsPromises.access(fullPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async getFileSize(filePath: string): Promise<number> {
    const fullPath = path.join(this.basePath, filePath);
    const stats = await fsPromises.stat(fullPath);
    return stats.size;
  }

  async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    return `file://${path.join(this.basePath, filePath)}`;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await fsPromises.access(this.basePath, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  // Public method to get the full path
  getFullPath(filePath: string): string {
    return path.join(this.basePath, filePath);
  }
}
