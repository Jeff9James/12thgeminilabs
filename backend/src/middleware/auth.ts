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

// SIMPLIFIED: Demo mode - no authentication required
// All users share a single demo user account
const DEMO_USER = {
  id: 'demo-user-id',
  email: 'demo@example.com',
};

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // In demo mode, just set the demo user
  req.user = DEMO_USER;
  next();
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