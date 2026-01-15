import * as fs from 'fs';
import * as path from 'path';
import { promises as fsPromises } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { VideoProcessingQueueItem } from '../../../shared/types';
import logger from '../../utils/logger';
import { config } from '../../utils/env';

export class QueueService {
  private queueDir: string;

  constructor(queueDir: string = config.queuePath) {
    this.queueDir = queueDir;
  }

  async initialize(): Promise<void> {
    await fsPromises.mkdir(this.queueDir, { recursive: true });
    logger.info(`Queue service initialized at: ${this.queueDir}`);
  }

  async enqueue(item: Omit<VideoProcessingQueueItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<VideoProcessingQueueItem> {
    const queueItem: VideoProcessingQueueItem = {
      id: uuidv4(),
      ...item,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const filePath = path.join(this.queueDir, `${queueItem.id}.json`);
    await fsPromises.writeFile(filePath, JSON.stringify(queueItem, null, 2));

    logger.info(`Enqueued video for processing: ${queueItem.videoId}`);
    return queueItem;
  }

  async dequeue(): Promise<VideoProcessingQueueItem | null> {
    const files = await fsPromises.readdir(this.queueDir);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(this.queueDir, file);
        const content = await fsPromises.readFile(filePath, 'utf-8');
        const item = JSON.parse(content) as VideoProcessingQueueItem;

        if (item.status === 'pending') {
          return item;
        }
      }
    }

    return null;
  }

  async getById(id: string): Promise<VideoProcessingQueueItem | null> {
    const filePath = path.join(this.queueDir, `${id}.json`);
    
    try {
      const content = await fsPromises.readFile(filePath, 'utf-8');
      return JSON.parse(content) as VideoProcessingQueueItem;
    } catch {
      return null;
    }
  }

  async getByVideoId(videoId: string): Promise<VideoProcessingQueueItem | null> {
    const files = await fsPromises.readdir(this.queueDir);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(this.queueDir, file);
        const content = await fsPromises.readFile(filePath, 'utf-8');
        const item = JSON.parse(content) as VideoProcessingQueueItem;

        if (item.videoId === videoId) {
          return item;
        }
      }
    }

    return null;
  }

  async update(id: string, updates: Partial<VideoProcessingQueueItem>): Promise<VideoProcessingQueueItem | null> {
    const item = await this.getById(id);
    
    if (!item) {
      return null;
    }

    const updatedItem: VideoProcessingQueueItem = {
      ...item,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const filePath = path.join(this.queueDir, `${id}.json`);
    await fsPromises.writeFile(filePath, JSON.stringify(updatedItem, null, 2));

    return updatedItem;
  }

  async markCompleted(id: string): Promise<boolean> {
    const result = await this.update(id, { status: 'completed' });
    return result !== null;
  }

  async markFailed(id: string, error: string): Promise<boolean> {
    const result = await this.update(id, { status: 'failed', error });
    return result !== null;
  }

  async getAll(): Promise<VideoProcessingQueueItem[]> {
    const files = await fsPromises.readdir(this.queueDir);
    const items: VideoProcessingQueueItem[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(this.queueDir, file);
        const content = await fsPromises.readFile(filePath, 'utf-8');
        items.push(JSON.parse(content) as VideoProcessingQueueItem);
      }
    }

    return items;
  }

  async getPendingCount(): Promise<number> {
    const items = await this.getAll();
    return items.filter((item) => item.status === 'pending').length;
  }

  async remove(id: string): Promise<boolean> {
    const filePath = path.join(this.queueDir, `${id}.json`);
    
    try {
      await fsPromises.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async clearCompleted(): Promise<number> {
    const items = await this.getAll();
    let removedCount = 0;

    for (const item of items) {
      if (item.status === 'completed') {
        await this.remove(item.id);
        removedCount++;
      }
    }

    return removedCount;
  }
}

export const queueService = new QueueService();
