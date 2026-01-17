import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../db/connection';
import { authenticate, generateToken, generateRefreshToken } from '../middleware/auth';
import { ApiResponse, AuthResponse, User } from '@gemini-video-platform/shared';
import { config } from '../utils/env';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const oauth2Client = new OAuth2Client();

// Helper function to verify Google ID token
async function verifyGoogleIdToken(idToken: string): Promise<any> {
  try {
    const ticket = await oauth2Client.verifyIdToken({
      idToken,
      audience: config.googleClientId,
    });
    return ticket.getPayload();
  } catch (error) {
    logger.error('Google ID token verification failed:', error);
    throw new Error('Invalid Google ID token');
  }
}

// Helper function to get or create user
async function getOrCreateUser(payload: any): Promise<User> {
  const db = getDatabase();
  const googleId = payload.sub;
  const email = payload.email;
  const name = payload.name || email.split('@')[0];
  const picture = payload.picture;

  // Check if user exists in our minimal users table
  const existingUser = await db.get<User>(
    'SELECT * FROM users WHERE google_id = ?',
    [googleId]
  );

  let user: User;

  if (existingUser) {
    user = existingUser;
    logger.info(`Existing user logged in: ${email}`);
  } else {
    // Create new user for quota/auditing only
    const userId = uuidv4();
    await db.run(
      'INSERT INTO users (id, email, name, google_id, picture_url, quota_used) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, email, name, googleId, picture, 0]
    );

    user = {
      id: userId,
      email,
      name,
      googleId,
      picture,
      createdAt: new Date(),
      updatedAt: new Date(),
      quotaUsed: 0,
    };

    logger.info(`New user created: ${email}`);
  }

  return user;
}

// POST /api/auth/google-callback
// Receives Google ID token from frontend, validates token signature with Google's public keys (cached)
// Extracts user info (email, name, picture, sub as user_id)
// Generates JWT token valid for 1 hour
// Returns JWT in response
router.post('/google-callback', async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken, accessToken, refreshToken: googleRefreshToken } = req.body;

    if (!idToken) {
      res.status(400).json({
        success: false,
        error: 'Google ID token is required',
      });
      return;
    }

    // Verify the ID token with Google's public keys (cached)
    const payload = await verifyGoogleIdToken(idToken);

    if (!payload || !payload.sub || !payload.email) {
      res.status(400).json({
        success: false,
        error: 'Invalid Google ID token',
      });
      return;
    }

    // Get or create user (for quota/auditing only)
    const user = await getOrCreateUser(payload);

    // Generate JWT token valid for 1 hour
    const token = generateToken(user.id, user.email);

    // Generate refresh token
    const refreshToken = generateRefreshToken(user.id, user.email);

    // Set HTTP-only cookie for OAuth access token (for Google Drive integration)
    if (accessToken) {
      res.cookie('oauth_access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000, // 1 hour
      });
    }

    // Set HTTP-only cookie for Google refresh token (for token renewal)
    if (googleRefreshToken) {
      res.cookie('google_refresh_token', googleRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
    }

    // Set HTTP-only cookie for app refresh token
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const response: ApiResponse<AuthResponse> = {
      success: true,
      data: {
        user,
        token, // This will be stored in localStorage on frontend
        refreshToken, // This will be stored in localStorage on frontend
      },
      message: 'Authentication successful',
    };

    res.json(response);
  } catch (error) {
    logger.error('Google authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to authenticate with Google',
    });
  }
});

// POST /api/auth/refresh
// Takes refresh token
// Validates and generates new JWT
// Returns new JWT
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
      return;
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as {
      userId: string;
      email: string;
      type: 'refresh';
    };

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    // Generate new JWT token
    const newToken = generateToken(decoded.userId, decoded.email);

    const response: ApiResponse<{ token: string }> = {
      success: true,
      data: { token: newToken },
      message: 'Token refreshed successfully',
    };

    res.json(response);
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid or expired refresh token',
    });
  }
});

// GET /api/auth/me
// Validates JWT
// Returns current user info
router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
      return;
    }

    // Get user info from JWT (no database lookup needed)
    // But we can optionally fetch quota info for display
    const db = getDatabase();
    const userWithQuota = await db.get<User>(
      'SELECT id, email, name, picture_url, quota_used, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!userWithQuota) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    const response: ApiResponse<User> = {
      success: true,
      data: userWithQuota,
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
    });
  }
});

// POST /api/auth/logout
// Invalidates JWT (or client-side only)
router.post('/logout', (req: Request, res: Response): void => {
  // Clear cookies
  res.clearCookie('oauth_access_token');
  res.clearCookie('refresh_token');

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

export default router;