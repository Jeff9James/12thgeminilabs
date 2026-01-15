import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { QueueItem } from './storage';
import logger from '../utils/logger';

const QUEUE_DIR = './data/queue';

export class FileQueue {
  private queueDir: string;

  constructor(queueDir: string = QUEUE_DIR) {
    this.queueDir = queueDir;
    this.ensureQueueDirectory();
  }

  private ensureQueueDirectory(): void {
    if (!fs.existsSync(this.queueDir)) {
      fs.mkdirSync(this.queueDir, { recursive: true });
      logger.info(`Created queue directory: ${this.queueDir}`);
    }
  }

  async enqueue(item: Omit<QueueItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<QueueItem> {
    const id = uuidv4();
    const queueItem: QueueItem = {
      id,
      ...item,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const filePath = path.join(this.queueDir, `${id}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(queueItem, null, 2));
    
    logger.info(`Enqueued video for processing: ${item.videoId}`);
    return queueItem;
  }

  async dequeue(): Promise<QueueItem | null> {
    const files = fs.readdirSync(this.queueDir);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(this.queueDir, file);
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const item = JSON.parse(content) as QueueItem;
        
        if (item.status === 'pending') {
          return item;
        }
      }
    }
    
    return null;
  }

  async updateStatus(id: string, status: QueueItem['status'], error?: string): Promise<void> {
    const filePath = path.join(this.queueDir, `${id}.json`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Queue item not found: ${id}`);
    }

    const content = await fs.promises.readFile(filePath, 'utf-8');
    const item = JSON.parse(content) as QueueItem;
    
    item.status = status;
    item.updatedAt = new Date().toISOString();
    if (error) {
      item.error = error;
    }

    await fs.promises.writeFile(filePath, JSON.stringify(item, null, 2));
    logger.info(`Updated queue item status: ${id} -> ${status}`);
  }

  async getByVideoId(videoId: string): Promise<QueueItem | null> {
    const files = fs.readdirSync(this.queueDir);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(this.queueDir, file);
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const item = JSON.parse(content) as QueueItem;
        
        if (item.videoId === videoId) {
          return item;
        }
      }
    }
    
    return null;
  }

  async getAll(): Promise<QueueItem[]> {
    const files = fs.readdirSync(this.queueDir);
    const items: QueueItem[] = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(this.queueDir, file);
        const content = await fs.promises.readFile(filePath, 'utf-8');
        items.push(JSON.parse(content));
      }
    }
    
    return items;
  }

  async remove(id: string): Promise<void> {
    const filePath = path.join(this.queueDir, `${id}.json`);
    
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      logger.info(`Removed queue item: ${id}`);
    }
  }

  async getPendingCount(): Promise<number> {
    const files = fs.readdirSync(this.queueDir);
    let count = 0;
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(this.queueDir, file);
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const item = JSON.parse(content) as QueueItem;
        
        if (item.status === 'pending') {
          count++;
        }
      }
    }
    
    return count;
  }
}

export const fileQueue = new FileQueue();
