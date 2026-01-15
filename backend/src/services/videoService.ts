import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/connection';
import { Video, VideoStatus, VideoMetadata } from '../../../shared/types';
import { config } from '../../utils/env';
import logger from '../../utils/logger';
import { metadataExtractor } from './metadataExtractor';
import { createStorageProvider } from './storage';
import { queueService } from './queue';

const CREATE_VIDEOS_TABLE = `
  CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    duration FLOAT,
    width INTEGER,
    height INTEGER,
    frame_count INTEGER,
    status TEXT NOT NULL DEFAULT 'uploading',
    upload_error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`;

const CREATE_VIDEOS_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
  CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
`;

export class VideoService {
  async initialize(): Promise<void> {
    const db = getDatabase();
    await db.run(CREATE_VIDEOS_TABLE);
    await db.run(CREATE_VIDEOS_INDEX);
    logger.info('Video service initialized');
  }

  async create(
    userId: string,
    title: string,
    filename: string,
    originalFilename: string,
    path: string,
    fileSize: number,
    mimeType: string
  ): Promise<Video> {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO videos (id, user_id, title, filename, original_filename, path, file_size, mime_type, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'uploading', ?, ?)`,
      [id, userId, title, filename, originalFilename, path, fileSize, mimeType, now, now]
    );

    return this.getById(id, userId) as Promise<Video>;
  }

  async getById(id: string, userId?: string): Promise<Video | null> {
    const db = getDatabase();
    
    let sql = 'SELECT * FROM videos WHERE id = ?';
    const params: any[] = [id];

    if (userId) {
      sql += ' AND user_id = ?';
      params.push(userId);
    }

    const row = await db.get<any>(sql, params);
    
    if (!row) {
      return null;
    }

    return this.mapRowToVideo(row);
  }

  async getByUserId(userId: string): Promise<Video[]> {
    const db = getDatabase();
    const rows = await db.all<any[]>(
      'SELECT * FROM videos WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    return rows.map((row) => this.mapRowToVideo(row));
  }

  async updateStatus(id: string, status: VideoStatus, error?: string): Promise<Video | null> {
    const db = getDatabase();
    const now = new Date().toISOString();

    let sql = 'UPDATE videos SET status = ?, updated_at = ?';
    const params: any[] = [status, now];

    if (error) {
      sql += ', upload_error = ?';
      params.push(error);
    }

    sql += ' WHERE id = ?';
    params.push(id);

    await db.run(sql, params);
    return this.getById(id);
  }

  async updateMetadata(
    id: string,
    metadata: Partial<Pick<Video, 'duration' | 'width' | 'height' | 'frameCount'>>
  ): Promise<Video | null> {
    const db = getDatabase();
    const now = new Date().toISOString();

    const updates: string[] = [];
    const params: any[] = [];

    if (metadata.duration !== undefined) {
      updates.push('duration = ?');
      params.push(metadata.duration);
    }
    if (metadata.width !== undefined) {
      updates.push('width = ?');
      params.push(metadata.width);
    }
    if (metadata.height !== undefined) {
      updates.push('height = ?');
      params.push(metadata.height);
    }
    if (metadata.frameCount !== undefined) {
      updates.push('frame_count = ?');
      params.push(metadata.frameCount);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    updates.push('updated_at = ?');
    params.push(now);
    params.push(id);

    await db.run(
      `UPDATE videos SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.getById(id);
  }

  async updatePathAndSize(
    id: string,
    path: string,
    fileSize: number
  ): Promise<Video | null> {
    const db = getDatabase();
    const now = new Date().toISOString();

    await db.run(
      'UPDATE videos SET path = ?, file_size = ?, updated_at = ? WHERE id = ?',
      [path, fileSize, now, id]
    );

    return this.getById(id);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const db = getDatabase();
    const video = await this.getById(id, userId);

    if (!video) {
      return false;
    }

    // Delete from storage
    try {
      const storage = await createStorageProvider();
      await storage.deleteFile(video.path);
    } catch (error) {
      logger.warn(`Failed to delete file from storage: ${error}`);
    }

    // Delete from database
    await db.run('DELETE FROM videos WHERE id = ?', [id]);
    return true;
  }

  async getStoragePath(id: string): Promise<string | null> {
    const video = await this.getById(id);
    return video?.path || null;
  }

  async extractAndSaveMetadata(id: string): Promise<VideoMetadata | null> {
    const video = await this.getById(id);
    
    if (!video) {
      return null;
    }

    const storage = await createStorageProvider();
    const fullPath = storage.name === 'local' 
      ? (storage as any).getFullPath(video.path)
      : undefined;

    if (!fullPath) {
      logger.warn('Cannot extract metadata from Firebase storage without downloading');
      return null;
    }

    const metadata = await metadataExtractor.extractMetadata(fullPath);
    
    if (metadata) {
      await this.updateMetadata(id, {
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        frameCount: metadata.frameCount,
      });
    }

    return metadata;
  }

  async queueForProcessing(id: string, userId: string): Promise<void> {
    const video = await this.getById(id, userId);
    
    if (!video) {
      throw new Error('Video not found');
    }

    await queueService.enqueue({
      videoId: id,
      userId,
      status: 'pending',
    });

    await this.updateStatus(id, 'processing');
  }

  private mapRowToVideo(row: any): Video {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      filename: row.filename,
      originalFilename: row.original_filename,
      path: row.path,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      duration: row.duration,
      width: row.width,
      height: row.height,
      frameCount: row.frame_count,
      status: row.status as VideoStatus,
      uploadError: row.upload_error,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export const videoService = new VideoService();
