import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/connection';
import { authenticate } from '../middleware/auth';
import { getStorageAdapter } from '../services';
import { extractVideoMetadata } from '../services/metadata';
import { fileQueue } from '../services/queue';
import { Video, VideoMetadata, ChunkUploadResponse, VideoFinalizeResponse } from '../../../shared/types';
import { UPLOAD_CONSTANTS, VIDEO_STATUS, ERROR_MESSAGES } from '../../../shared/constants';
import logger from '../utils/logger';

// Type for authenticated request
type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email: string;
  };
};

const router = Router();

// Configure multer for chunk uploads
const uploadDir = UPLOAD_CONSTANTS.TEMP_UPLOAD_DIR;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { videoId } = req.body;
    const chunkDir = path.join(uploadDir, videoId);
    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir, { recursive: true });
    }
    cb(null, chunkDir);
  },
  filename: (req, file, cb) => {
    const { chunkNumber } = req.body;
    cb(null, `chunk_${chunkNumber}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: UPLOAD_CONSTANTS.CHUNK_SIZE,
  },
});

// POST /api/videos/upload
// Upload a chunk of a video file
router.post(
  '/upload',
  authenticate,
  upload.single('chunk'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { videoId, chunkNumber, totalChunks, filename } = req.body;
      const file = req.file;

      if (!file) {
        res.status(400).json({
          success: false,
          error: ERROR_MESSAGES.MISSING_CHUNK,
        });
        return;
      }

      if (!videoId || !chunkNumber || !totalChunks || !filename) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: videoId, chunkNumber, totalChunks, filename',
        });
        return;
      }

      const chunkNum = parseInt(chunkNumber as string, 10);
      const totalChunksNum = parseInt(totalChunks as string, 10);

      if (chunkNum < 1 || chunkNum > totalChunksNum) {
        res.status(400).json({
          success: false,
          error: ERROR_MESSAGES.CHUNK_MISMATCH,
        });
        return;
      }

      logger.info(`Received chunk ${chunkNum}/${totalChunksNum} for video ${videoId}`);

      const response: ChunkUploadResponse = {
        videoId,
        chunkNumber: chunkNum,
        received: true,
      };

      res.json({
        success: true,
        data: response,
        message: `Chunk ${chunkNum} received successfully`,
      });
    } catch (error) {
      logger.error('Chunk upload error:', error);
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.UPLOAD_CHUNK_FAILED,
      });
    }
  }
);

// POST /api/videos/finalize
// Combine chunks and finalize the upload
router.post(
  '/finalize',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { videoId, filename, totalChunks, title, mimeType, fileSize } = req.body;
      const userId = req.user!.id;

      if (!videoId || !filename || !totalChunks || !title) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: videoId, filename, totalChunks, title',
        });
        return;
      }

      const chunkDir = path.join(uploadDir, videoId);
      if (!fs.existsSync(chunkDir)) {
        res.status(400).json({
          success: false,
          error: 'Upload session not found',
        });
        return;
      }

      const totalChunksNum = parseInt(totalChunks as string, 10);
      const ext = path.extname(filename);
      const finalFilename = `${videoId}${ext}`;
      const finalPath = path.join(chunkDir, finalFilename);

      // Combine chunks
      const writeStream = fs.createWriteStream(finalPath);
      for (let i = 1; i <= totalChunksNum; i++) {
        const chunkPath = path.join(chunkDir, `chunk_${i}`);
        if (!fs.existsSync(chunkPath)) {
          res.status(400).json({
            success: false,
            error: `Missing chunk ${i}`,
          });
          return;
        }

        const chunkData = fs.readFileSync(chunkPath);
        writeStream.write(chunkData);
      }
      writeStream.end();

      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      logger.info(`Combined ${totalChunksNum} chunks into ${finalPath}`);

      // Extract metadata
      let metadata: VideoMetadata;
      try {
        metadata = await extractVideoMetadata(finalPath);
      } catch (metaError) {
        logger.warn('Metadata extraction failed, using defaults');
        metadata = {
          duration: 0,
          width: 0,
          height: 0,
          frameRate: 30,
          frameCount: 0,
          mimeType: mimeType || 'video/mp4',
          fileSize: parseInt(fileSize as string, 10) || fs.statSync(finalPath).size,
        };
      }

      // Store video using storage adapter
      const storageAdapter = getStorageAdapter();
      const storagePath = await storageAdapter.upload(finalPath, `${userId}/${finalFilename}`);

      // Create video record in database
      const db = getDatabase();
      const videoIdDb = uuidv4();

      await db.run(
        `INSERT INTO videos (
          id, user_id, title, filename, original_filename, path,
          file_size_bytes, mime_type, duration_seconds, width, height,
          frame_count, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          videoIdDb,
          userId,
          title,
          finalFilename,
          filename,
          storagePath,
          metadata.fileSize,
          metadata.mimeType,
          metadata.duration,
          metadata.width,
          metadata.height,
          metadata.frameCount,
          VIDEO_STATUS.UPLOADED,
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      );

      // Clean up temporary files
      fs.rmSync(chunkDir, { recursive: true, force: true });

      // Queue video for processing
      await fileQueue.enqueue({
        videoId,
        userId,
        status: 'pending',
      });

      // Fetch the created video
      const video = await db.get<Video>(
        'SELECT * FROM videos WHERE id = ?',
        [videoIdDb]
      );

      logger.info(`Video finalized: ${videoId}`);

      const response: VideoFinalizeResponse = {
        video: video!,
        message: 'Video uploaded and finalized successfully',
      };

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      logger.error('Finalize error:', error);
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.FINALIZE_FAILED,
      });
    }
  }
);

// GET /api/videos/:id
// Get video metadata
router.get(
  '/:id',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const db = getDatabase();
      const video = await db.get<Video>(
        'SELECT * FROM videos WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (!video) {
        res.status(404).json({
          success: false,
          error: ERROR_MESSAGES.VIDEO_NOT_FOUND,
        });
        return;
      }

      res.json({
        success: true,
        data: video,
      });
    } catch (error) {
      logger.error('Get video error:', error);
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }
);

// GET /api/videos/:id/stream
// Stream video with range support
router.get(
  '/:id/stream',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const db = getDatabase();
      const video = await db.get<Video>(
        'SELECT * FROM videos WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (!video) {
        res.status(404).json({
          success: false,
          error: ERROR_MESSAGES.VIDEO_NOT_FOUND,
        });
        return;
      }

      const storageAdapter = getStorageAdapter();
      const stat = await fs.promises.stat(video.path);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;

        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': video.mimeType,
        };

        res.writeHead(206, head);
        
        const stream = storageAdapter.getStream(video.path);
        stream.on('data', (chunk) => {
          // Handle data
        });
        
        // Create limited read stream for the range
        const limitedStream = fs.createReadStream(video.path, { start, end });
        limitedStream.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': video.mimeType,
        };

        res.writeHead(200, head);
        
        const stream = storageAdapter.getStream(video.path);
        stream.pipe(res);
      }
    } catch (error) {
      logger.error('Stream video error:', error);
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }
);

// GET /api/videos
// List all videos for the current user
router.get(
  '/',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;

      const db = getDatabase();
      const videos = await db.all<Video>(
        'SELECT * FROM videos WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );

      res.json({
        success: true,
        data: videos,
      });
    } catch (error) {
      logger.error('List videos error:', error);
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }
);

// DELETE /api/videos/:id
// Delete a video
router.delete(
  '/:id',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const db = getDatabase();
      const video = await db.get<Video>(
        'SELECT * FROM videos WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (!video) {
        res.status(404).json({
          success: false,
          error: ERROR_MESSAGES.VIDEO_NOT_FOUND,
        });
        return;
      }

      // Delete from storage
      const storageAdapter = getStorageAdapter();
      await storageAdapter.delete(video.path);

      // Delete from database
      await db.run('DELETE FROM videos WHERE id = ?', [id]);

      // Delete from queue if exists
      const queueItem = await fileQueue.getByVideoId(id);
      if (queueItem) {
        await fileQueue.remove(queueItem.id);
      }

      logger.info(`Video deleted: ${id}`);

      res.json({
        success: true,
        message: 'Video deleted successfully',
      });
    } catch (error) {
      logger.error('Delete video error:', error);
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }
);

export default router;
