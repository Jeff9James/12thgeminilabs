import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { google } from 'googleapis';
import { getDatabase } from '../db/connection';
import { authenticate } from '../middleware/auth';
import { GoogleDriveService } from '../services/googleDrive';
import { getStorageAdapter } from '../services';
import { extractVideoMetadata } from '../services/metadata';
import { fileQueue } from '../services/queue';
import {
  ApiResponse,
  GoogleDriveFile,
  GoogleDriveImportRequest,
  GoogleDriveImportStatus,
  Video,
  VideoMetadata,
} from '@gemini-video-platform/shared';
import { ERROR_MESSAGES, UPLOAD_CONSTANTS, VIDEO_STATUS } from '@gemini-video-platform/shared';
import { config } from '../utils/env';
import logger from '../utils/logger';

// Type for authenticated request
type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email: string;
  };
};

const router = Router();

const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];

const GOOGLE_ACCESS_COOKIE = 'oauth_access_token';
const GOOGLE_REFRESH_COOKIE = 'google_refresh_token';
const GOOGLE_STATE_COOKIE = 'google_drive_oauth_state';

const accessCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
};

const importProgress = new Map<string, GoogleDriveImportStatus>();

function importKey(userId: string, driveFileId: string): string {
  return `${userId}:${driveFileId}`;
}

function getBackendBaseUrl(req: Request): string {
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
  return `${proto}://${req.get('host')}`;
}

function createOAuthClient(redirectUri: string) {
  return new google.auth.OAuth2(config.googleClientId, config.googleClientSecret, redirectUri);
}

async function withDriveService(req: AuthenticatedRequest, res: Response): Promise<{
  service: GoogleDriveService;
  accessToken: string;
  refreshToken?: string;
}> {
  const userId = req.user!.id;
  const db = getDatabase();

  try {
    // Get tokens from database
    const user = await db.get<{
      google_drive_access_token?: string;
      google_drive_refresh_token?: string;
      google_drive_token_expiry?: string;
    }>('SELECT google_drive_access_token, google_drive_refresh_token, google_drive_token_expiry FROM users WHERE id = ?', [userId]);

    logger.info(`Fetched user Drive tokens for userId: ${userId}`, {
      hasUser: !!user,
      hasAccessToken: !!user?.google_drive_access_token,
      hasRefreshToken: !!user?.google_drive_refresh_token,
      tokenExpiry: user?.google_drive_token_expiry,
    });

    if (!user || !user.google_drive_access_token) {
      const err = new Error('Google Drive access not authorized');
      (err as any).statusCode = 401;
      throw err;
    }

  const accessToken = user.google_drive_access_token;
  const refreshToken = user.google_drive_refresh_token;
  const tokenExpiry = user.google_drive_token_expiry ? new Date(user.google_drive_token_expiry) : null;

  // Check if token is expired
  const isExpired = tokenExpiry && tokenExpiry.getTime() < Date.now();

  if (!isExpired) {
    const service = new GoogleDriveService(accessToken, refreshToken);
    const ok = await service.verifyAccess();
    if (ok) return { service, accessToken, refreshToken };
  }

  // Token expired or verification failed, try to refresh
  if (!refreshToken) {
    const err = new Error('Google Drive access expired. Please re-authenticate.');
    (err as any).statusCode = 401;
    throw err;
  }

  const service = new GoogleDriveService(accessToken, refreshToken);
  const newAccessToken = await service.refreshAccessToken();

  // Update tokens in database
  const newTokenExpiry = new Date(Date.now() + 3600 * 1000).toISOString();
  await db.run(
    `UPDATE users SET 
      google_drive_access_token = ?,
      google_drive_token_expiry = ?,
      updated_at = ?
    WHERE id = ?`,
    [newAccessToken, newTokenExpiry, new Date().toISOString(), userId]
  );

  return { service: new GoogleDriveService(newAccessToken, refreshToken), accessToken: newAccessToken, refreshToken };
  } catch (error) {
    logger.error('Error in withDriveService:', error);
    throw error;
  }
}

/**
 * GET /api/google-drive/auth/start
 */
router.get('/auth/start', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const state = uuidv4();
    
    // Store state with userId mapping to retrieve user during callback
    const stateData = JSON.stringify({ state, userId });
    const stateToken = Buffer.from(stateData).toString('base64');

    res.cookie(GOOGLE_STATE_COOKIE, stateToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
    });

    const redirectUri = `${getBackendBaseUrl(req)}/api/google-drive/auth/callback`;
    const oauth2Client = createOAuthClient(redirectUri);

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: DRIVE_SCOPES,
      include_granted_scopes: true,
      state,
    });

    res.redirect(url);
  } catch (error) {
    logger.error('Failed to start Google Drive OAuth:', error);
    res.status(500).send('Failed to start Google Drive authorization');
  }
});

/**
 * GET /api/google-drive/auth/callback
 */
router.get('/auth/callback', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, state } = req.query as { code?: string; state?: string };

    if (!code || !state) {
      res.status(400).send('Missing code/state');
      return;
    }

    const stateToken = req.cookies[GOOGLE_STATE_COOKIE] as string | undefined;
    if (!stateToken) {
      res.status(400).send('Missing OAuth state cookie');
      return;
    }

    // Decode state to get userId
    let userId: string;
    let expectedState: string;
    try {
      const stateData = JSON.parse(Buffer.from(stateToken, 'base64').toString('utf8'));
      userId = stateData.userId;
      expectedState = stateData.state;
    } catch (e) {
      res.status(400).send('Invalid OAuth state');
      return;
    }

    if (expectedState !== state) {
      res.status(400).send('OAuth state mismatch');
      return;
    }

    const redirectUri = `${getBackendBaseUrl(req)}/api/google-drive/auth/callback`;
    const oauth2Client = createOAuthClient(redirectUri);

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      res.status(400).send('No access token returned');
      return;
    }

    res.clearCookie(GOOGLE_STATE_COOKIE);

    // Store tokens in database instead of cookies
    const db = getDatabase();
    const tokenExpiry = tokens.expiry_date 
      ? new Date(tokens.expiry_date).toISOString() 
      : new Date(Date.now() + 3600 * 1000).toISOString();

    logger.info(`Storing Google Drive tokens for userId: ${userId}`, {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      tokenExpiry,
    });

    try {
      await db.run(
        `UPDATE users SET 
          google_drive_access_token = ?,
          google_drive_refresh_token = COALESCE(?, google_drive_refresh_token),
          google_drive_token_expiry = ?,
          updated_at = ?
        WHERE id = ?`,
        [tokens.access_token, tokens.refresh_token, tokenExpiry, new Date().toISOString(), userId]
      );
      logger.info(`Successfully stored Google Drive tokens for userId: ${userId}`);
    } catch (dbError) {
      logger.error(`Failed to store Google Drive tokens for userId: ${userId}`, dbError);
      throw dbError;
    }

    res.redirect(`${config.frontendUrl}/videos?drive=connected`);
  } catch (error) {
    logger.error('Google Drive OAuth callback failed:', error);
    res.status(500).send('Failed to complete Google Drive authorization');
  }
});

/**
 * POST /api/google-drive/revoke
 */
router.post('/revoke', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const db = getDatabase();

  await db.run(
    `UPDATE users SET 
      google_drive_access_token = NULL,
      google_drive_refresh_token = NULL,
      google_drive_token_expiry = NULL,
      updated_at = ?
    WHERE id = ?`,
    [new Date().toISOString(), userId]
  );

  res.json({ success: true, message: 'Google Drive permission revoked' });
});

/**
 * GET /api/google-drive/files
 */
router.get('/files', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { service } = await withDriveService(req, res);
    const files = await service.listVideoFiles();

    const response: ApiResponse<GoogleDriveFile[]> = {
      success: true,
      data: files,
    };

    res.json(response);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to list Google Drive files',
    });
  }
});

/**
 * POST /api/google-drive/import/:fileId
 */
router.post('/import/:fileId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;
    const userId = req.user!.id;
    const { title } = req.body as GoogleDriveImportRequest;

    const db = getDatabase();
    const alreadyImported = await db.get<Video>(
      'SELECT * FROM videos WHERE google_drive_id = ? AND user_id = ?',
      [fileId, userId]
    );

    if (alreadyImported) {
      res.status(400).json({ success: false, error: 'This file was already imported.' });
      return;
    }

    const { service, accessToken, refreshToken } = await withDriveService(req, res);
    const fileMetadata = await service.getFileMetadata(fileId);

    if (!fileMetadata.mimeType.startsWith('video/')) {
      res.status(400).json({ success: false, error: ERROR_MESSAGES.INVALID_FILE_TYPE });
      return;
    }

    if (fileMetadata.size > UPLOAD_CONSTANTS.MAX_FILE_SIZE) {
      res.status(400).json({ success: false, error: ERROR_MESSAGES.FILE_TOO_LARGE });
      return;
    }

    const videoId = uuidv4();
    const ext = path.extname(fileMetadata.name) || '.mp4';
    const filename = `${videoId}${ext}`;
    const resolvedTitle = title || path.basename(fileMetadata.name, ext);

    // Create DB record immediately so it appears
    await db.run(
      `INSERT INTO videos (
        id, user_id, title, filename, original_filename, path,
        file_size_bytes, mime_type, duration_seconds, width, height, frame_count,
        status, upload_error, google_drive_id, google_drive_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        videoId,
        userId,
        resolvedTitle,
        filename,
        fileMetadata.name,
        `pending:${videoId}`,
        fileMetadata.size,
        fileMetadata.mimeType,
        0,
        0,
        0,
        0,
        VIDEO_STATUS.PENDING,
        null,
        fileId,
        fileMetadata.webViewLink,
        new Date().toISOString(),
        new Date().toISOString(),
      ]
    );

    const key = importKey(userId, fileId);
    importProgress.set(key, {
      videoId,
      driveFileId: fileId,
      status: 'pending',
      progress: 0,
      message: 'Import queued',
    });

    void runImportJob({
      userId,
      driveFileId: fileId,
      videoId,
      filename,
      fileMetadata,
      accessToken,
      refreshToken,
    });

    const video = await db.get<Video>('SELECT * FROM videos WHERE id = ?', [videoId]);

    const response: ApiResponse<{ video: Video; importStatus: GoogleDriveImportStatus }> = {
      success: true,
      data: {
        video: video!,
        importStatus: importProgress.get(key)!,
      },
      message: 'Import started',
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Error starting Drive import:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to import video from Google Drive',
    });
  }
});

/**
 * GET /api/google-drive/import/:fileId/status
 */
router.get('/import/:fileId/status', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;
    const userId = req.user!.id;

    const key = importKey(userId, fileId);
    const status = importProgress.get(key);

    if (status) {
      res.json({ success: true, data: status });
      return;
    }

    const db = getDatabase();
    const video = await db.get<any>('SELECT * FROM videos WHERE google_drive_id = ? AND user_id = ?', [fileId, userId]);

    if (!video) {
      res.status(404).json({ success: false, error: 'Import not found' });
      return;
    }

    const inferred: GoogleDriveImportStatus = {
      videoId: video.id,
      driveFileId: fileId,
      status:
        video.status === VIDEO_STATUS.ERROR
          ? 'error'
          : video.status === VIDEO_STATUS.UPLOADED || video.status === VIDEO_STATUS.READY
            ? 'complete'
            : 'processing',
      progress:
        video.status === VIDEO_STATUS.ERROR
          ? 0
          : video.status === VIDEO_STATUS.UPLOADED || video.status === VIDEO_STATUS.READY
            ? 100
            : 50,
      error: video.upload_error || undefined,
      message: 'Status inferred',
    };

    res.json({ success: true, data: inferred });
  } catch (error: any) {
    logger.error('Error getting Drive import status:', error);
    res.status(500).json({ success: false, error: ERROR_MESSAGES.INTERNAL_ERROR });
  }
});

async function runImportJob(params: {
  userId: string;
  driveFileId: string;
  videoId: string;
  filename: string;
  fileMetadata: GoogleDriveFile;
  accessToken: string;
  refreshToken?: string;
}): Promise<void> {
  const { userId, driveFileId, videoId, filename, fileMetadata, accessToken, refreshToken } = params;
  const key = importKey(userId, driveFileId);

  const db = getDatabase();
  const tempVideoDir = path.join(UPLOAD_CONSTANTS.TEMP_UPLOAD_DIR, videoId);
  const tempFilePath = path.join(tempVideoDir, filename);

  try {
    if (!fs.existsSync(tempVideoDir)) {
      fs.mkdirSync(tempVideoDir, { recursive: true });
    }

    importProgress.set(key, {
      videoId,
      driveFileId,
      status: 'downloading',
      progress: 0,
      message: 'Downloading from Google Drive...',
    });

    const driveService = new GoogleDriveService(accessToken, refreshToken);

    await driveService.downloadFile(driveFileId, tempFilePath, (downloaded, total) => {
      const pct = total > 0 ? Math.round((downloaded / total) * 80) : 0;
      importProgress.set(key, {
        videoId,
        driveFileId,
        status: 'downloading',
        progress: pct,
        message: `Downloading: ${pct}%`,
      });
    });

    importProgress.set(key, {
      videoId,
      driveFileId,
      status: 'processing',
      progress: 85,
      message: 'Extracting metadata...',
    });

    let metadata: VideoMetadata;
    try {
      metadata = await extractVideoMetadata(tempFilePath);
    } catch {
      metadata = {
        duration: 0,
        width: 0,
        height: 0,
        frameRate: 30,
        frameCount: 0,
        mimeType: fileMetadata.mimeType,
        fileSize: fileMetadata.size,
      };
    }

    importProgress.set(key, {
      videoId,
      driveFileId,
      status: 'processing',
      progress: 92,
      message: 'Saving to storage...',
    });

    const storageAdapter = getStorageAdapter();
    const storagePath = await storageAdapter.upload(tempFilePath, `${userId}/${filename}`);

    await db.run(
      `UPDATE videos SET 
        path = ?,
        file_size_bytes = ?,
        mime_type = ?,
        duration_seconds = ?,
        width = ?,
        height = ?,
        frame_count = ?,
        status = ?,
        upload_error = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        storagePath,
        metadata.fileSize,
        metadata.mimeType,
        metadata.duration,
        metadata.width,
        metadata.height,
        metadata.frameCount,
        VIDEO_STATUS.UPLOADED,
        null,
        new Date().toISOString(),
        videoId,
      ]
    );

    fs.rmSync(tempVideoDir, { recursive: true, force: true });

    await fileQueue.enqueue({ videoId, userId, status: 'pending' });

    importProgress.set(key, {
      videoId,
      driveFileId,
      status: 'complete',
      progress: 100,
      message: 'Import complete',
    });

    setTimeout(() => importProgress.delete(key), 10 * 60 * 1000);
  } catch (error: any) {
    logger.error(`Drive import job failed (videoId=${videoId}):`, error);

    try {
      await db.run('UPDATE videos SET status = ?, upload_error = ?, updated_at = ? WHERE id = ?', [
        VIDEO_STATUS.ERROR,
        error.message || 'Drive import failed',
        new Date().toISOString(),
        videoId,
      ]);
    } catch (dbError) {
      logger.error('Failed to update video status after Drive import error:', dbError);
    }

    importProgress.set(key, {
      videoId,
      driveFileId,
      status: 'error',
      progress: 0,
      error: error.message || 'Import failed',
      message: 'Import failed',
    });

    if (fs.existsSync(tempVideoDir)) {
      fs.rmSync(tempVideoDir, { recursive: true, force: true });
    }
  }
}

export default router;
