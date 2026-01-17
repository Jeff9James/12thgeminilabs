import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { temporalIndexService } from '../services/temporalIndex';
import { semanticSearchService } from '../services/semanticSearch';
import { 
  SearchRequest, 
  IndexingJob,
  TemporalSegment 
} from '@gemini-video-platform/shared';
import logger from '../utils/logger';

// Type for authenticated request
type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email: string;
  };
};

const router = Router();

// POST /api/videos/:id/index
// Trigger indexing of a video into temporal segments
router.post(
  '/:id/index',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id: videoId } = req.params;
      const userId = req.user!.id;

      // Check if video is already indexed
      const isIndexed = await temporalIndexService.isVideoIndexed(videoId, userId);
      if (isIndexed) {
        res.status(400).json({
          success: false,
          error: 'Video is already indexed',
        });
        return;
      }

      // Start indexing process
      const job = await temporalIndexService.startIndexing(videoId, userId);

      logger.info(`Started indexing for video ${videoId}, job: ${job.id}`);

      res.json({
        success: true,
        data: job,
        message: 'Indexing started successfully',
      });
    } catch (error) {
      logger.error('Start indexing error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start indexing',
      });
    }
  }
);

// GET /api/videos/:id/index/status
// Get indexing status for a video
router.get(
  '/:id/index/status',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id: videoId } = req.params;
      const userId = req.user!.id;

      const job = await temporalIndexService.getIndexingStatusByVideo(videoId, userId);

      if (!job) {
        res.status(404).json({
          success: false,
          error: 'No indexing job found for this video',
        });
        return;
      }

      res.json({
        success: true,
        data: job,
      });
    } catch (error) {
      logger.error('Get indexing status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get indexing status',
      });
    }
  }
);

// GET /api/videos/:id/index/status/:jobId
// Get specific indexing job status
router.get(
  '/:id/index/status/:jobId',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id: videoId, jobId } = req.params;
      const userId = req.user!.id;

      const job = await temporalIndexService.getIndexingStatus(jobId);

      if (!job || job.videoId !== videoId || job.userId !== userId) {
        res.status(404).json({
          success: false,
          error: 'Indexing job not found',
        });
        return;
      }

      res.json({
        success: true,
        data: job,
      });
    } catch (error) {
      logger.error('Get indexing job status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get indexing job status',
      });
    }
  }
);

// GET /api/videos/:id/index/segments
// Get all temporal segments for a video
router.get(
  '/:id/index/segments',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id: videoId } = req.params;
      const userId = req.user!.id;

      const segments = await temporalIndexService.getVideoSegments(videoId, userId);

      res.json({
        success: true,
        data: segments,
      });
    } catch (error) {
      logger.error('Get segments error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get video segments',
      });
    }
  }
);

// POST /api/videos/:id/search
// Search within a video using temporal index
router.post(
  '/:id/search',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id: videoId } = req.params;
      const userId = req.user!.id;
      const searchRequest: SearchRequest = req.body;

      // Validate request
      if (!searchRequest.query || searchRequest.query.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Search query is required',
        });
        return;
      }

      // Check if video is indexed
      const isIndexed = await temporalIndexService.isVideoIndexed(videoId, userId);
      if (!isIndexed) {
        res.status(400).json({
          success: false,
          error: 'Video must be indexed before searching',
        });
        return;
      }

      // Perform search
      const results = await semanticSearchService.searchVideo(videoId, userId, searchRequest);

      logger.info(`Search completed for video ${videoId}, query: "${searchRequest.query}"`);

      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      logger.error('Search error:', error);
      res.status(500).json({
        success: false,
        error: 'Search failed',
      });
    }
  }
);

// GET /api/videos/:id/search/suggestions
// Get search suggestions for a video
router.get(
  '/:id/search/suggestions',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id: videoId } = req.params;
      const userId = req.user!.id;
      const { q: partialQuery } = req.query;

      if (!partialQuery || typeof partialQuery !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Query parameter "q" is required',
        });
        return;
      }

      // Check if video is indexed
      const isIndexed = await temporalIndexService.isVideoIndexed(videoId, userId);
      if (!isIndexed) {
        res.status(400).json({
          success: false,
          error: 'Video must be indexed before getting suggestions',
        });
        return;
      }

      const suggestions = await semanticSearchService.getSearchSuggestions(
        videoId, 
        userId, 
        partialQuery
      );

      res.json({
        success: true,
        data: suggestions,
      });
    } catch (error) {
      logger.error('Get search suggestions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get search suggestions',
      });
    }
  }
);

// GET /api/videos/:id/search/popular
// Get popular search terms for a video
router.get(
  '/:id/search/popular',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id: videoId } = req.params;
      const userId = req.user!.id;

      // Check if video is indexed
      const isIndexed = await temporalIndexService.isVideoIndexed(videoId, userId);
      if (!isIndexed) {
        res.status(400).json({
          success: false,
          error: 'Video must be indexed before getting popular terms',
        });
        return;
      }

      const popularTerms = await semanticSearchService.getPopularSearchTerms(videoId, userId);

      res.json({
        success: true,
        data: popularTerms,
      });
    } catch (error) {
      logger.error('Get popular search terms error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get popular search terms',
      });
    }
  }
);

// POST /api/videos/:id/index/reindex
// Re-index a video (delete existing segments and create new ones)
router.post(
  '/:id/index/reindex',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id: videoId } = req.params;
      const userId = req.user!.id;

      // Delete existing index first
      await temporalIndexService.deleteVideoIndex(videoId, userId);
      
      // Start new indexing job
      const job = await temporalIndexService.startIndexing(videoId, userId);

      logger.info(`Started re-indexing for video ${videoId}, job: ${job.id}`);

      res.json({
        success: true,
        data: job,
        message: 'Re-indexing started successfully',
      });
    } catch (error) {
      logger.error('Re-indexing error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start re-indexing',
      });
    }
  }
);

// DELETE /api/videos/:id/index
// Delete the temporal index for a video
router.delete(
  '/:id/index',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id: videoId } = req.params;
      const userId = req.user!.id;

      await temporalIndexService.deleteVideoIndex(videoId, userId);

      logger.info(`Deleted temporal index for video ${videoId}`);

      res.json({
        success: true,
        message: 'Temporal index deleted successfully',
      });
    } catch (error) {
      logger.error('Delete index error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete temporal index',
      });
    }
  }
);

export default router;