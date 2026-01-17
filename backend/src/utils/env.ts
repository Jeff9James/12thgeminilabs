import dotenv from 'dotenv';
import { ENV_VARS } from '@gemini-video-platform/shared';

dotenv.config();

export function validateEnv(): void {
  const debug = process.env.DEBUG_ENV === 'true';

  const requiredVars = [
    ENV_VARS.GEMINI_API_KEY,
    ENV_VARS.GOOGLE_CLIENT_ID,
    ENV_VARS.GOOGLE_CLIENT_SECRET,
    ENV_VARS.DATABASE_PATH,
    ENV_VARS.FRONTEND_URL,
    ENV_VARS.JWT_SECRET,
    ENV_VARS.JWT_REFRESH_SECRET,
  ];

  const missingVars: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (debug) {
    const debugVars = [
      ...requiredVars,
      ENV_VARS.VIDEO_STORAGE_TYPE,
      ENV_VARS.VIDEO_STORAGE_PATH,
      ENV_VARS.NODE_ENV,
      ENV_VARS.PORT,
      'RAILWAY_ENVIRONMENT_ID',
      'RAILWAY_SERVICE_NAME',
    ];

    const availability = Object.fromEntries(
      debugVars.map((k) => [k, Boolean(process.env[k])])
    );

    // eslint-disable-next-line no-console
    console.error('[DEBUG_ENV] Environment variable availability:', availability);
    // eslint-disable-next-line no-console
    console.error('[DEBUG_ENV] Total process.env keys:', Object.keys(process.env).length);
  }

  // VIDEO_STORAGE_TYPE is optional; default is "local"
  const validStorageTypes = ['local', 'firebase'];
  const storageType = process.env.VIDEO_STORAGE_TYPE || 'local';
  if (!validStorageTypes.includes(storageType)) {
    throw new Error(
      `Invalid VIDEO_STORAGE_TYPE. Must be one of: ${validStorageTypes.join(', ')}`
    );
  }

  if (missingVars.length > 0) {
    const isRailway = process.env.RAILWAY_ENVIRONMENT_ID;
    const troubleshootingHelp = isRailway
      ? '\n\n🚨 Railway Deployment Detected!\n' +
        'Shared Variables must be explicitly shared with your backend service.\n' +
        'See RAILWAY_SETUP.md for step-by-step instructions.\n' +
        'Quick fix:\n' +
        '  1. Go to Project Settings → Shared Variables\n' +
        '  2. For each variable, click Share → Select backend service\n' +
        '  OR: Go to backend service → Variables → Shared Variable → Add all\n'
      : '\n\nSee .env.example for required environment variables.';

    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}${troubleshootingHelp}`
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
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};
