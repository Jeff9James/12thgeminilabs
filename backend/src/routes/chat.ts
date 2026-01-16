import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/connection';
import { authenticate } from '../middleware/auth';
import { geminiService } from '../services/gemini';
import { rateLimitService } from '../services/rateLimit';
import { 
  Video, 
  Conversation, 
  ConversationMessage,
  ChatRequest,
  ChatResponse,
  CustomAnalysisRequest,
  CustomAnalysisResponse,
  BookmarkRequest,
  BookmarkResponse,
  RateLimitInfo,
  Bookmark
} from '../../../shared/types';
import { ERROR_MESSAGES } from '../../../shared/constants';
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

// Helper function to generate message ID
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// POST /api/videos/:id/chat
// Enhanced chat about video content with rate limiting and timestamp parsing
router.post(
  '/:id/chat',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id: videoId } = req.params;
      const { message, conversationId }: ChatRequest = req.body;
      const userId = req.user!.id;

      if (!message) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameter: message',
        });
        return;
      }

      // Check rate limit
      const rateLimit = await rateLimitService.checkLimit(userId, videoId, 'chat');
      if (!rateLimit.allowed) {
        res.status(429).json({
          success: false,
          error: `Rate limit exceeded. ${rateLimit.remaining} messages remaining.`,
          data: {
            remaining: rateLimit.remaining,
            resetTime: rateLimit.resetTime,
            limit: 50,
          },
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

      const db = getDatabase();
      let conversation: Conversation | undefined;
      let conversationHistory: ConversationMessage[] = [];

      // Get or create conversation
      if (conversationId) {
        conversation = await db.get<Conversation>(
          'SELECT * FROM conversations WHERE id = ? AND user_id = ? AND video_id = ? AND deleted_at IS NULL',
          [conversationId, userId, videoId]
        );
        if (conversation) {
          try {
            conversationHistory = JSON.parse(conversation.messages);
          } catch (e) {
            logger.warn('Failed to parse conversation messages:', e);
            conversationHistory = [];
          }
        }
      }

      if (!conversation) {
        const newId = uuidv4();
        let title = await geminiService.generateConversationTitle(message, video.title);
        
        await db.run(
          `INSERT INTO conversations (id, video_id, user_id, title, messages, created_at, updated_at)
           VALUES (?, ?, ?, ?, '[]', ?, ?)`,
          [newId, videoId, userId, title, new Date().toISOString(), new Date().toISOString()]
        );
        conversation = await db.get<Conversation>(
          'SELECT * FROM conversations WHERE id = ?',
          [newId]
        );
      }

      // Add user message to history
      const userMessage: ConversationMessage = {
        id: generateMessageId(),
        role: 'user',
        content: message,
        createdAt: new Date(),
      };
      conversationHistory.push(userMessage);

      // Get response from Gemini
      const geminiResponse = await geminiService.chatAboutVideo(
        video.path,
        message,
        conversationHistory.slice(0, -1) // Don't include the message we just added
      );

      // Add assistant message to history
      const assistantMessage: ConversationMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: geminiResponse.response,
        timestamp: geminiResponse.referencedTimestamps?.[0]?.start,
        createdAt: new Date(),
      };
      conversationHistory.push(assistantMessage);

      // Update conversation in database
      await db.run(
        'UPDATE conversations SET messages = ?, updated_at = ? WHERE id = ?',
        [JSON.stringify(conversationHistory), new Date().toISOString(), conversation!.id]
      );

      // Increment rate limit usage
      await rateLimitService.incrementUsage(userId, videoId, 'chat');

      const response: ChatResponse = {
        conversationId: conversation!.id,
        reply: geminiResponse.response,
        referencedTimestamps: geminiResponse.referencedTimestamps,
        messageId: assistantMessage.id,
      };

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      logger.error('Chat error:', error);
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.ANALYSIS_FAILED,
      });
    }
  }
);

// POST /api/videos/:id/analyze-custom
// Custom analysis with user-defined prompts
router.post(
  '/:id/analyze-custom',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id: videoId } = req.params;
      const { prompt }: CustomAnalysisRequest = req.body;
      const userId = req.user!.id;

      if (!prompt) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameter: prompt',
        });
        return;
      }

      // Check rate limit
      const rateLimit = await rateLimitService.checkLimit(userId, videoId, 'analysis');
      if (!rateLimit.allowed) {
        res.status(429).json({
          success: false,
          error: `Rate limit exceeded. ${rateLimit.remaining} analyses remaining.`,
          data: {
            remaining: rateLimit.remaining,
            resetTime: rateLimit.resetTime,
            limit: 50,
          },
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

      // Get custom analysis from Gemini
      const analysisResult = await geminiService.analyzeWithCustomPrompt(video.path, prompt);

      // Increment rate limit usage
      await rateLimitService.incrementUsage(userId, videoId, 'analysis');

      const response: CustomAnalysisResponse = {
        analysis: analysisResult.analysis,
        referencedTimestamps: analysisResult.referencedTimestamps,
      };

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      logger.error('Custom analysis error:', error);
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.ANALYSIS_FAILED,
      });
    }
  }
);

// POST /api/videos/:id/bookmarks
// Save bookmarked moments from chat
router.post(
  '/:id/bookmarks',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id: videoId } = req.params;
      const { timestamp, note, conversationId }: BookmarkRequest = req.body;
      const userId = req.user!.id;

      if (timestamp === undefined || timestamp === null) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameter: timestamp',
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

      const db = getDatabase();
      const id = uuidv4();

      // If conversationId provided, verify it belongs to user
      if (conversationId) {
        const conversation = await db.get<Conversation>(
          'SELECT id FROM conversations WHERE id = ? AND user_id = ? AND video_id = ?',
          [conversationId, userId, videoId]
        );
        if (!conversation) {
          res.status(404).json({
            success: false,
            error: 'Conversation not found',
          });
          return;
        }
      }

      await db.run(
        `INSERT INTO bookmarks (id, video_id, user_id, conversation_id, timestamp_seconds, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, videoId, userId, conversationId || null, timestamp, note || null, new Date().toISOString()]
      );

      const bookmark = await db.get<Bookmark>(
        'SELECT * FROM bookmarks WHERE id = ?',
        [id]
      );

      const response: BookmarkResponse = {
        bookmark: bookmark!,
      };

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      logger.error('Create bookmark error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create bookmark',
      });
    }
  }
);

// GET /api/videos/:id/bookmarks
// Get user's bookmarks for a video
router.get(
  '/:id/bookmarks',
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

      const db = getDatabase();
      const bookmarks = await db.all<Bookmark>(
        'SELECT * FROM bookmarks WHERE video_id = ? AND user_id = ? ORDER BY timestamp_seconds ASC',
        [videoId, userId]
      );

      res.json({
        success: true,
        data: {
          bookmarks,
        },
      });
    } catch (error) {
      logger.error('Get bookmarks error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve bookmarks',
      });
    }
  }
);

// DELETE /api/videos/:id/bookmarks/:bookmarkId
// Delete a bookmark
router.delete(
  '/:id/bookmarks/:bookmarkId',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { bookmarkId } = req.params;
      const userId = req.user!.id;

      const db = getDatabase();
      const result = await db.run(
        'DELETE FROM bookmarks WHERE id = ? AND user_id = ?',
        [bookmarkId, userId]
      );

      if (result.changes === 0) {
        res.status(404).json({
          success: false,
          error: 'Bookmark not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Bookmark deleted successfully',
      });
    } catch (error) {
      logger.error('Delete bookmark error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete bookmark',
      });
    }
  }
);

// GET /api/videos/:id/rate-limit
// Get current rate limit status
router.get(
  '/:id/rate-limit',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id: videoId } = req.params;
      const userId = req.user!.id;

      const rateLimit = await rateLimitService.checkLimit(userId, videoId, 'chat');
      
      const response: RateLimitInfo = {
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime,
        limit: 50,
      };

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      logger.error('Get rate limit error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve rate limit status',
      });
    }
  }
);

export default router;