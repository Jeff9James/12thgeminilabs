import dotenv from 'dotenv';
import { ENV_VARS } from '../../../shared/constants';

dotenv.config();

export function validateEnv(): void {
  const requiredVars = [
    ENV_VARS.GEMINI_API_KEY,
    ENV_VARS.GOOGLE_CLIENT_ID,
    ENV_VARS.GOOGLE_CLIENT_SECRET,
    ENV_VARS.DATABASE_PATH,
    ENV_VARS.FRONTEND_URL,
    ENV_VARS.VIDEO_STORAGE_TYPE,
    ENV_VARS.JWT_SECRET,
  ];

  const missingVars: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }

  // Validate VIDEO_STORAGE_TYPE
  const validStorageTypes = ['local', 'firebase'];
  if (
    process.env.VIDEO_STORAGE_TYPE &&
    !validStorageTypes.includes(process.env.VIDEO_STORAGE_TYPE)
  ) {
    throw new Error(
      `Invalid VIDEO_STORAGE_TYPE. Must be one of: ${validStorageTypes.join(
        ', '
      )}`
    );
  }

  console.log('✓ Environment variables validated');
}

export const config = {
  geminiApiKey: process.env.GEMINI_API_KEY!,
  googleClientId: process.env.GOOGLE_CLIENT_ID!,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  databasePath: process.env.DATABASE_PATH || './database.db',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  videoStorageType: process.env.VIDEO_STORAGE_TYPE || 'local',
  videoStoragePath: process.env.VIDEO_STORAGE_PATH || './videos',
  jwtSecret: process.env.JWT_SECRET!,
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};
