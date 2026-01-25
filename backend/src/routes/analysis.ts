import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import { getDatabase } from '../db/connection';
import { authenticate } from '../middleware/auth';
import { geminiService } from '../services/gemini';
import { 
  Video, 
  Analysis, 
  Conversation, 
  ConversationMessage,
  AnalysisJobResponse,
  AnalysisStatusResponse,
  Scene,
  SearchMatch,
  SummaryResult,
} from '@gemini-video-platform/shared';
import { ANALYSIS_CONSTANTS, ERROR_MESSAGES } from '@gemini-video-platform/shared';
import logger from '../utils/logger';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email: string;
  };
};

const router = Router();

// Helper function to get video and verify ownership
async function getVideoForUser(videoId: string, userId: string): Promise<Video | null> {
  const db = getDatabase();
  const video = await db.get<Video>(
    'SELECT * FROM videos WHERE id = ? AND user_id = ?',
    [videoId, userId]
  );
  return video || null;
}

// Helper function to check cache
async function getCachedAnalysis(
  videoId: string,
  userId: string,
  analysisType: string,
  query?: string
): Promise<Analysis | null> {
  const db = getDatabase();
  
  let sql = `
    SELECT * FROM analyses 
    WHERE video_id = ? AND user_id = ? AND analysis_type = ? AND status = 'complete'
  `;
  const params: any[] = [videoId, userId, analysisType];
  
  if (query) {
    sql += ' AND query = ?';
    params.push(query);
  } else {
    sql += ' AND query IS NULL';
  }
  
  sql += ' ORDER BY created_at DESC LIMIT 1';
  
  console.log('[getCachedAnalysis] Executing query:', sql);
  console.log('[getCachedAnalysis] Params:', params);
  
  const cached = await db.get<Analysis>(sql, params);
  
  console.log('[getCachedAnalysis] Query result:', cached ? 'Found' : 'Not found');
  if (cached) {
    console.log('[getCachedAnalysis] Analysis details:', {
      id: cached.id,
      type: cached.analysisType,
      status: cached.status,
      createdAt: cached.createdAt,
    });
  }
  
  if (cached) {
    const age = Date.now() - new Date(cached.createdAt).getTime();
    console.log('[getCachedAnalysis] Cache age:', Math.round(age / 1000), 'seconds');
    console.log('[getCachedAnalysis] Cache duration limit:', ANALYSIS_CONSTANTS.CACHE_DURATION / 1000, 'seconds');
    
    if (age < ANALYSIS_CONSTANTS.CACHE_DURATION) {
      logger.info(`Cache hit for ${analysisType} on video ${videoId}`);
      return cached;
    } else {
      console.log('[getCachedAnalysis] Cache expired');
    }
  }
  
  return null;
}

// Helper function to create analysis job
async function createAnalysisJob(
  videoId: string,
  userId: string,
  analysisType: string,
  query?: string
): Promise<Analysis> {
  const db = getDatabase();
  const id = uuidv4();
  
  await db.run(
    `INSERT INTO analyses (id, video_id, user_id, analysis_type, query, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    [id, videoId, userId, analysisType, query || null, new Date().toISOString()]
  );
  
  const analysis = await db.get<Analysis>(
    'SELECT * FROM analyses WHERE id = ?',
    [id]
  );
  
  return analysis!;
}

// Helper function to update analysis status
async function updateAnalysisStatus(
  id: string,
  status: string,
  result?: any,
  error?: string
): Promise<void> {
  const db = getDatabase();
  
  const updates: string[] = ['status = ?', 'updated_at = ?'];
  const params: any[] = [status, new Date().toISOString()];
  
  if (status === 'processing') {
    updates.push('started_at = ?');
    params.push(new Date().toISOString());
  }
  
  if (status === 'complete') {
    updates.push('completed_at = ?', 'result = ?');
    params.push(new Date().toISOString(), JSON.stringify(result));
  }
  
  if (status === 'error' && error) {
    updates.push('error_message = ?');
    params.push(error);
  }
  
  params.push(id);
  
  await db.run(
    `UPDATE analyses SET ${updates.join(', ')} WHERE id = ?`,
    params
  );
}

// POST /api/videos/:id/analyze
// Generic analysis endpoint - triggers summary and scenes
router.post(
  '/:id/analyze',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id: videoId } = req.params;
      const userId = req.user!.id;

      console.log('========================================');
      console.log('📊 MANUAL ANALYZE REQUEST');
      console.log('Video ID:', videoId);
      console.log('User ID:', userId);
      console.log('========================================');

      const video = await getVideoForUser(videoId, userId);
      if (!video) {
        res.status(404).json({
          success: false,
          error: ERROR_MESSAGES.VIDEO_NOT_FOUND,
        });
        return;
      }

      // Import geminiService
      const { geminiService } = await import('../services/gemini');
      const { v4: uuidv4 } = await import('uuid');
      const db = getDatabase();

      // Trigger analysis immediately
      res.json({
        success: true,
        message: 'Analysis started',
      });

      // Run analysis in background
      (async () => {
        try {
          console.log('🚀 Starting background analysis for video:', videoId);
          
          const [summaryResult, scenesResult] = await Promise.allSettled([
            geminiService.summarizeVideo(video.path),
            geminiService.detectScenes(video.path),
          ]);

          if (summaryResult.status === 'fulfilled') {
            const summaryId = uuidv4();
            await db.run(
              `INSERT INTO analyses (id, video_id, user_id, analysis_type, status, result, created_at, completed_at)
               VALUES (?, ?, ?, 'summary', 'complete', ?, ?, ?)`,
              [summaryId, videoId, userId, JSON.stringify(summaryResult.value), new Date().toISOString(), new Date().toISOString()]
            );
            console.log('✅ Summary analysis complete');
          } else {
            console.error('❌ Summary failed:', summaryResult.reason);
          }

          if (scenesResult.status === 'fulfilled') {
            const scenesId = uuidv4();
            await db.run(
              `INSERT INTO analyses (id, video_id, user_id, analysis_type, status, result, created_at, completed_at)
               VALUES (?, ?, ?, 'scenes', 'complete', ?, ?, ?)`,
              [scenesId, videoId, userId, JSON.stringify(scenesResult.value), new Date().toISOString(), new Date().toISOString()]
            );
            console.log(`✅ Scene detection complete (${scenesResult.value.length} scenes)`);
          } else {
            console.error('❌ Scenes failed:', scenesResult.reason);
          }

          await db.run('UPDATE videos SET status = ? WHERE id = ?', ['ready', videoId]);
          console.log('✅ Video marked as ready');
        } catch (error) {
          console.error('❌ Background analysis error:', error);
        }
      })();
    } catch (error) {
      logger.error('Create analysis error:', error);
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.ANALYSIS_FAILED,
      });
    }
  }
);

// GET /api/videos/:id/analysis/:jobId
// Get analysis status and results
router.get(
  '/:id/analysis/:jobId',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { jobId } = req.params;
      const userId = req.user!.id;

      const db = getDatabase();
      const analysis = await db.get<Analysis>(
        'SELECT * FROM analyses WHERE id = ? AND user_id = ?',
        [jobId, userId]
      );

      if (!analysis) {
        res.status(404).json({
          success: false,
          error: 'Analysis job not found',
        });
        return;
      }

      const response: AnalysisStatusResponse = {
        jobId: analysis.id,
        status: analysis.status as any,
        result: analysis.result ? JSON.parse(analysis.result) : undefined,
        error: analysis.errorMessage,
      };

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      logger.error('Get analysis status error:', error);
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      });
    }
  }
);

// POST /api/videos/:id/summarize
// Summarize video
router.post(
  '/:id/summarize',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id: videoId } = req.params;
      const userId = req.user!.id;

      const video = await getVideoForUser(videoId, userId);
      if (!video) {
        res.status(404).json({
          success: false,
          error: ERROR_MESSAGES.VIDEO_NOT_FOUND,
        });
        return;
      }

      // Check cache
      console.log('🔍 Checking cache for summary...');
      console.log('  Video ID:', videoId);
      console.log('  User ID:', userId);
      
      const cached = await getCachedAnalysis(videoId, userId, 'summary');
      
      if (cached) {
        console.log('✅ Cache hit! Returning cached summary');
        console.log('  Analysis ID:', cached.id);
        console.log('  Created at:', cached.createdAt);
        const parsedResult = JSON.parse(cached.result!);
        console.log('  Result preview:', JSON.stringify(parsedResult).substring(0, 200));
        
        res.json({
          success: true,
          data: parsedResult,
          message: 'Retrieved from cache',
        });
        return;
      }
      
      console.log('❌ Cache miss - no cached summary found');

      // Check if should process sync or async
      const fileSize = video.fileSize || 0;
      
      if (fileSize > ANALYSIS_CONSTANTS.SYNC_SIZE_THRESHOLD) {
        // Large video - process async
        const job = await createAnalysisJob(videoId, userId, 'summary');
        
        const response: AnalysisJobResponse = {
          jobId: job.id,
          status: 'pending',
          message: 'Video is large, processing asynchronously',
        };

        res.json({
          success: true,
          data: response,
        });

        // Process in background
        processAnalysisJob(job.id, video.path, 'summary').catch(error => {
          logger.error(`Error processing summary job ${job.id}:`, error);
        });
      } else {
        // Small video - process synchronously
        const job = await createAnalysisJob(videoId, userId, 'summary');
        await updateAnalysisStatus(job.id, 'processing');

        try {
          const result = await geminiService.summarizeVideo(video.path);
          result.duration = video.duration || 0;
          
          await updateAnalysisStatus(job.id, 'complete', result);
          
          res.json({
            success: true,
            data: result,
          });
        } catch (error: any) {
          await updateAnalysisStatus(job.id, 'error', undefined, error.message);
          throw error;
        }
      }
    } catch (error) {
      logger.error('Summarize video error:', error);
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.ANALYSIS_FAILED,
      });
    }
  }
);

// POST /api/videos/:id/scenes
// Detect scenes in video
router.post(
  '/:id/scenes',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id: videoId } = req.params;
      const userId = req.user!.id;

      const video = await getVideoForUser(videoId, userId);
      if (!video) {
        res.status(404).json({
          success: false,
          error: ERROR_MESSAGES.VIDEO_NOT_FOUND,
        });
        return;
      }

      // Check cache
      console.log('🔍 Checking cache for scenes...');
      console.log('  Video ID:', videoId);
      console.log('  User ID:', userId);
      
      const cached = await getCachedAnalysis(videoId, userId, 'scenes');
      
      if (cached) {
        console.log('✅ Cache hit! Returning cached scenes');
        console.log('  Analysis ID:', cached.id);
        console.log('  Created at:', cached.createdAt);
        const parsedResult = JSON.parse(cached.result!);
        console.log('  Number of scenes:', parsedResult.length);
        
        res.json({
          success: true,
          data: parsedResult,
          message: 'Retrieved from cache',
        });
        return;
      }
      
      console.log('❌ Cache miss - no cached scenes found');

      // Check if should process sync or async
      const fileSize = video.fileSize || 0;
      
      if (fileSize > ANALYSIS_CONSTANTS.SYNC_SIZE_THRESHOLD) {
        const job = await createAnalysisJob(videoId, userId, 'scenes');
        
        const response: AnalysisJobResponse = {
          jobId: job.id,
          status: 'pending',
          message: 'Video is large, processing asynchronously',
        };

        res.json({
          success: true,
          data: response,
        });

        processAnalysisJob(job.id, video.path, 'scenes').catch(error => {
          logger.error(`Error processing scenes job ${job.id}:`, error);
        });
      } else {
        const job = await createAnalysisJob(videoId, userId, 'scenes');
        await updateAnalysisStatus(job.id, 'processing');

        try {
          const scenes = await geminiService.detectScenes(video.path);
          await updateAnalysisStatus(job.id, 'complete', scenes);
          
          res.json({
            success: true,
            data: scenes,
          });
        } catch (error: any) {
          await updateAnalysisStatus(job.id, 'error', undefined, error.message);
          throw error;
        }
      }
    } catch (error) {
      logger.error('Detect scenes error:', error);
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.ANALYSIS_FAILED,
      });
    }
  }
);

// POST /api/videos/:id/search
// Search for specific moments in video
router.post(
  '/:id/search',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id: videoId } = req.params;
      const { query } = req.body;
      const userId = req.user!.id;

      if (!query) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameter: query',
        });
        return;
      }

      const video = await getVideoForUser(videoId, userId);
      if (!video) {
        res.status(404).json({
          success: false,
          error: ERROR_MESSAGES.VIDEO_NOT_FOUND,
        });
        return;
      }

      // Check cache
      const cached = await getCachedAnalysis(videoId, userId, 'search', query);
      if (cached) {
        res.json({
          success: true,
          data: JSON.parse(cached.result!),
          message: 'Retrieved from cache',
        });
        return;
      }

      const fileSize = video.fileSize || 0;
      
      if (fileSize > ANALYSIS_CONSTANTS.SYNC_SIZE_THRESHOLD) {
        const job = await createAnalysisJob(videoId, userId, 'search', query);
        
        const response: AnalysisJobResponse = {
          jobId: job.id,
          status: 'pending',
          message: 'Video is large, processing asynchronously',
        };

        res.json({
          success: true,
          data: response,
        });

        processAnalysisJob(job.id, video.path, 'search', query).catch(error => {
          logger.error(`Error processing search job ${job.id}:`, error);
        });
      } else {
        const job = await createAnalysisJob(videoId, userId, 'search', query);
        await updateAnalysisStatus(job.id, 'processing');

        try {
          const matches = await geminiService.searchVideo(video.path, query);
          await updateAnalysisStatus(job.id, 'complete', matches);
          
          res.json({
            success: true,
            data: matches,
          });
        } catch (error: any) {
          await updateAnalysisStatus(job.id, 'error', undefined, error.message);
          throw error;
        }
      }
    } catch (error) {
      logger.error('Search video error:', error);
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.ANALYSIS_FAILED,
      });
    }
  }
);

// Background processing function
async function processAnalysisJob(
  jobId: string,
  videoPath: string,
  analysisType: string,
  query?: string
): Promise<void> {
  try {
    await updateAnalysisStatus(jobId, 'processing');
    
    let result: any;
    
    switch (analysisType) {
      case 'summary':
        result = await geminiService.summarizeVideo(videoPath);
        break;
      case 'scenes':
        result = await geminiService.detectScenes(videoPath);
        break;
      case 'search':
        if (!query) throw new Error('Query required for search analysis');
        result = await geminiService.searchVideo(videoPath, query);
        break;
      default:
        throw new Error(`Unknown analysis type: ${analysisType}`);
    }
    
    await updateAnalysisStatus(jobId, 'complete', result);
    logger.info(`Analysis job ${jobId} completed successfully`);
  } catch (error: any) {
    logger.error(`Analysis job ${jobId} failed:`, error);
    await updateAnalysisStatus(jobId, 'error', undefined, error.message);
  }
}

export default router;
