import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { videoService } from '../services/videoService';
import { createStorageProvider } from '../services/storage';
import { queueService } from '../services/queue';
import { metadataExtractor } from '../services/metadataExtractor';
import { config } from '../utils/env';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, VIDEO_STATUS, SUPPORTED_VIDEO_FORMATS } from '../../../shared/constants';
import { ApiResponse, Video, ChunkUploadResponse, FinalizeUploadResponse } from '../../../shared/types';
import logger from '../utils/logger';

const router = Router();

// Configure multer for chunk uploads
const uploadDir = path.resolve(config.tempUploadPath);
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
    cb(null, `chunk-${chunkNumber}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.maxChunkSize,
  },
});

// Validate video file
function validateVideoFile(file: Express.Multer.File): { valid: boolean; error?: string } {
  if (!SUPPORTED_VIDEO_FORMATS.includes(file.mimetype)) {
    return { valid: false, error: ERROR_MESSAGES.INVALID_FILE_TYPE };
  }
  
  // Check file size limit (this is for individual chunks, so we don't check full file size here)
  return { valid: true };
}

// POST /api/videos/upload - Upload a chunk
router.post(
  '/upload',
  authenticate,
  upload.single('chunk'),
  async (req: AuthenticatedRequest, res: Response<ApiResponse<ChunkUploadResponse>>, next: NextFunction) => {
    try {
      const user = req.user!;
      const { chunkNumber, totalChunks, videoId, filename } = req.body;

      // Validate required fields
      if (!chunkNumber || !totalChunks || !videoId || !filename) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: chunkNumber, totalChunks, videoId, filename',
        });
      }

      const chunkNum = parseInt(chunkNumber, 10);
      const totalNum = parseInt(totalChunks, 10);

      if (chunkNum < 1 || chunkNum > totalNum) {
        return res.status(400).json({
          success: false,
          error: 'Invalid chunk number',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No chunk file provided',
        });
      }

      // Validate file type
      const validation = validateVideoFile(req.file);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: validation.error,
        });
      }

      // Create video record if this is the first chunk
      if (chunkNum === 1) {
        const title = path.basename(filename, path.extname(filename));
        await videoService.create(
          user.id,
          title,
          `${videoId}.mp4`,
          filename,
          '', // Path will be set during finalize
          0, // Size will be calculated during finalize
          req.file.mimetype
        );
      }

      logger.info(`Chunk ${chunkNum}/${totalNum} uploaded for video ${videoId}`);

      res.json({
        success: true,
        data: {
          success: true,
          chunkNumber: chunkNum,
          totalChunks: totalNum,
          videoId,
          message: `Chunk ${chunkNum} received successfully`,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/videos/finalize - Combine chunks and finalize upload
router.post(
  '/finalize',
  authenticate,
  async (req: AuthenticatedRequest, res: Response<ApiResponse<FinalizeUploadResponse>>, next: NextFunction) => {
    try {
      const user = req.user!;
      const { videoId, filename, totalChunks, mimeType } = req.body;

      if (!videoId || !totalChunks) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: videoId, totalChunks',
        });
      }

      const video = await videoService.getById(videoId, user.id);
      
      if (!video) {
        return res.status(404).json({
          success: false,
          error: ERROR_MESSAGES.VIDEO_NOT_FOUND,
        });
      }

      const chunkDir = path.join(uploadDir, videoId);
      const chunkDirExists = fs.existsSync(chunkDir);

      if (!chunkDirExists) {
        return res.status(400).json({
          success: false,
          error: ERROR_MESSAGES.UPLOAD_INCOMPLETE,
        });
      }

      // Check if all chunks exist
      const totalNum = parseInt(totalChunks, 10);
      for (let i = 1; i <= totalNum; i++) {
        const chunkPath = path.join(chunkDir, `chunk-${i}`);
        if (!fs.existsSync(chunkPath)) {
          return res.status(400).json({
            success: false,
            error: `Missing chunk ${i} of ${totalNum}`,
          });
        }
      }

      logger.info(`Finalizing video ${videoId}, combining ${totalNum} chunks`);

      // Create final file path
      const extension = path.extname(filename) || '.mp4';
      const finalFilename = `${videoId}${extension}`;
      const storagePath = path.join('videos', finalFilename);

      // Create write stream for final file
      const storage = await createStorageProvider();
      const writeStream = storage.createWriteStream(storagePath);

      // Combine chunks
      for (let i = 1; i <= totalNum; i++) {
        const chunkPath = path.join(chunkDir, `chunk-${i}`);
        const chunkData = fs.readFileSync(chunkPath);
        writeStream.write(chunkData);
        fs.unlinkSync(chunkPath); // Delete chunk after reading
      }

      writeStream.end();

      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      // Clean up chunk directory
      fs.rmdirSync(chunkDir);

      // Calculate file size
      const fileSize = await storage.getFileSize(storagePath);

      // Extract metadata
      let metadata = null;
      if (storage.name === 'local') {
        try {
          const fullPath = (storage as any).getFullPath(storagePath);
          metadata = await metadataExtractor.extractMetadata(fullPath);
        } catch (metaError) {
          logger.warn(`Failed to extract metadata: ${metaError}`);
        }
      }

      // Update video record with path and size
      await videoService.updatePathAndSize(videoId, storagePath, fileSize);
      await videoService.updateStatus(videoId, VIDEO_STATUS.UPLOADED);
      await videoService.updateMetadata(videoId, {
        duration: metadata?.duration,
        width: metadata?.width,
        height: metadata?.height,
        frameCount: metadata?.frameCount,
      });

      // Queue for processing
      await queueService.enqueue({
        videoId,
        userId: user.id,
        status: 'pending',
      });

      const updatedVideo = await videoService.updateStatus(videoId, VIDEO_STATUS.PROCESSING);

      logger.info(`Video ${videoId} finalized and queued for processing`);

      res.json({
        success: true,
        data: {
          success: true,
          video: updatedVideo!,
          message: SUCCESS_MESSAGES.FINALIZE_COMPLETE,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/videos - List user's videos
router.get(
  '/',
  authenticate,
  async (req: AuthenticatedRequest, res: Response<ApiResponse<Video[]>>) => {
    try {
      const user = req.user!;
      const videos = await videoService.getByUserId(user.id);

      res.json({
        success: true,
        data: videos,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }
);

// GET /api/videos/:id - Get video metadata
router.get(
  '/:id',
  authenticate,
  async (req: AuthenticatedRequest, res: Response<ApiResponse<Video>>) => {
    try {
      const user = req.user!;
      const { id } = req.params;

      const video = await videoService.getById(id, user.id);

      if (!video) {
        return res.status(404).json({
          success: false,
          error: ERROR_MESSAGES.VIDEO_NOT_FOUND,
        });
      }

      res.json({
        success: true,
        data: video,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }
);

// GET /api/videos/:id/stream - Stream video for preview
router.get(
  '/:id/stream',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { id } = req.params;

      const video = await videoService.getById(id, user.id);

      if (!video) {
        return res.status(404).json({
          success: false,
          error: ERROR_MESSAGES.VIDEO_NOT_FOUND,
        });
      }

      const storage = await createStorageProvider();

      // Handle range requests for seeking
      const range = req.headers.range;
      const fileSize = video.fileSize;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': video.mimeType,
        });

        const readStream = storage.createReadStream(video.path);
        readStream.on('data', (chunk: Buffer) => {
          if (readStream.readableEnded) return;
        });

        readStream.pipe(res, { start, end });
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': video.mimeType,
        });

        const readStream = storage.createReadStream(video.path);
        readStream.pipe(res);
      }
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/videos/:id - Delete video
router.delete(
  '/:id',
  authenticate,
  async (req: AuthenticatedRequest, res: Response<ApiResponse<{ success: boolean }>>) => {
    try {
      const user = req.user!;
      const { id } = req.params;

      const deleted = await videoService.delete(id, user.id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: ERROR_MESSAGES.VIDEO_NOT_FOUND,
        });
      }

      res.json({
        success: true,
        data: { success: true },
        message: SUCCESS_MESSAGES.DELETE_COMPLETE,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }
);

export default router;
