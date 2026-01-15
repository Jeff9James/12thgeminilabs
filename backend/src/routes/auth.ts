import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { getDatabase } from '../db/connection';
import { authenticate, generateToken } from '../middleware/auth';
import { ApiResponse, AuthResponse, User } from '../../../shared/types';
import { config } from '../utils/env';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const oauth2Client = new OAuth2Client();

// Google OAuth callback
router.post('/google', async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      res.status(400).json({
        success: false,
        error: 'Google ID token is required',
      });
      return;
    }

    // Verify the ID token
    const ticket = await oauth2Client.verifyIdToken({
      idToken,
      audience: config.googleClientId,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.sub || !payload.email) {
      res.status(400).json({
        success: false,
        error: 'Invalid Google ID token',
      });
      return;
    }

    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name || email.split('@')[0];

    const db = getDatabase();

    // Check if user exists
    const existingUser = await db.get<User>(
      'SELECT * FROM users WHERE google_id = ?',
      [googleId]
    );

    let user: User;

    if (existingUser) {
      user = existingUser;
      logger.info(`Existing user logged in: ${email}`);
    } else {
      // Create new user
      const userId = uuidv4();
      await db.run(
        'INSERT INTO users (id, email, name, google_id) VALUES (?, ?, ?, ?)',
        [userId, email, name, googleId]
      );

      user = {
        id: userId,
        email,
        name,
        googleId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      logger.info(`New user created: ${email}`);
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    const response: ApiResponse<AuthResponse> = {
      success: true,
      data: {
        user,
        token,
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

// Get current user
router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
      return;
    }

    const db = getDatabase();
    const user = await db.get<User>(
      'SELECT * FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    const response: ApiResponse<User> = {
      success: true,
      data: user,
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

// Logout
router.post('/logout', authenticate, (req: Request, res: Response): void => {
  // In a JWT-based system, logout is handled on the client side
  // by removing the token. This endpoint exists for future extensions.
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

export default router;
