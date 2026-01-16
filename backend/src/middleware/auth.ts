import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../utils/env';
import { ERROR_MESSAGES } from '@gemini-video-platform/shared';
import logger from '../utils/logger';

interface AuthenticatedUser {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: ERROR_MESSAGES.UNAUTHORIZED,
      });
      return;
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, config.jwtSecret) as {
      userId: string;
      email: string;
    };

    req.user = {
      id: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      error: ERROR_MESSAGES.INVALID_TOKEN,
    });
  }
}

export function generateToken(userId: string, email: string): string {
  // Generate JWT token valid for 1 hour (3600 seconds)
  return jwt.sign(
    { userId, email },
    config.jwtSecret,
    { expiresIn: '1h' }
  );
}

export function generateRefreshToken(userId: string, email: string): string {
  // Generate refresh token valid for 7 days
  return jwt.sign(
    { userId, email, type: 'refresh' },
    config.jwtRefreshSecret,
    { expiresIn: '7d' }
  );
}