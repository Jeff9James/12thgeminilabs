import { getDatabase } from '../db/connection';
import { v4 as uuidv4 } from 'uuid';

interface RateLimitEntry {
  id: string;
  userId: string;
  videoId: string;
  action: string;
  count: number;
  resetTime: Date;
  createdAt: Date;
}

export class RateLimitService {
  private static instance: RateLimitService;
  private readonly DAILY_LIMIT = 50; // 50 messages per video per day
  private readonly RESET_HOURS = 24; // Reset every 24 hours

  static getInstance(): RateLimitService {
    if (!RateLimitService.instance) {
      RateLimitService.instance = new RateLimitService();
    }
    return RateLimitService.instance;
  }

  async checkLimit(userId: string, videoId: string, action: string = 'chat'): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    const db = getDatabase();
    const now = new Date();
    const resetTime = new Date(now.getTime() + this.RESET_HOURS * 60 * 60 * 1000);

    // Get or create rate limit entry
    let rateLimit = await db.get<RateLimitEntry>(
      'SELECT * FROM rate_limits WHERE user_id = ? AND video_id = ? AND action = ?',
      [userId, videoId, action]
    );

    if (!rateLimit) {
      // Create new entry
      const id = uuidv4();
      await db.run(
        `INSERT INTO rate_limits (id, user_id, video_id, action, count, reset_time, created_at)
         VALUES (?, ?, ?, ?, 0, ?, ?)`,
        [id, userId, videoId, action, resetTime.toISOString(), now.toISOString()]
      );
      rateLimit = { id, userId, videoId, action, count: 0, resetTime, createdAt: now };
    }

    // Check if we need to reset (past reset time)
    if (now > new Date(rateLimit.resetTime)) {
      await db.run(
        'UPDATE rate_limits SET count = 0, reset_time = ? WHERE id = ?',
        [resetTime.toISOString(), rateLimit.id]
      );
      rateLimit.count = 0;
      rateLimit.resetTime = resetTime;
    }

    const remaining = Math.max(0, this.DAILY_LIMIT - rateLimit.count);
    const allowed = rateLimit.count < this.DAILY_LIMIT;

    return { allowed, remaining, resetTime };
  }

  async incrementUsage(userId: string, videoId: string, action: string = 'chat'): Promise<void> {
    const db = getDatabase();
    const now = new Date();
    const resetTime = new Date(now.getTime() + this.RESET_HOURS * 60 * 60 * 1000);

    // Check if entry exists and get current count
    const rateLimit = await db.get<RateLimitEntry>(
      'SELECT * FROM rate_limits WHERE user_id = ? AND video_id = ? AND action = ?',
      [userId, videoId, action]
    );

    if (!rateLimit) {
      // Create new entry
      const id = uuidv4();
      await db.run(
        `INSERT INTO rate_limits (id, user_id, video_id, action, count, reset_time, created_at)
         VALUES (?, ?, ?, ?, 1, ?, ?)`,
        [id, userId, videoId, action, resetTime.toISOString(), now.toISOString()]
      );
    } else {
      // Update existing entry
      await db.run(
        'UPDATE rate_limits SET count = count + 1 WHERE id = ?',
        [rateLimit.id]
      );
    }
  }

  async getRemainingCount(userId: string, videoId: string, action: string = 'chat'): Promise<number> {
    const result = await this.checkLimit(userId, videoId, action);
    return result.remaining;
  }
}

export const rateLimitService = RateLimitService.getInstance();