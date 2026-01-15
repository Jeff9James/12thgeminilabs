import { exec } from 'child_process';
import * as fs from 'fs';
import { promisify } from 'util';
import { VideoMetadataResult } from './storage';
import logger from '../utils/logger';

const execAsync = promisify(exec);

export async function extractVideoMetadata(filePath: string): Promise<VideoMetadataResult> {
  // Check if ffprobe is available
  const ffprobeAvailable = await checkFfprobeAvailability();
  
  if (!ffprobeAvailable) {
    logger.warn('ffprobe not available, using fallback metadata extraction');
    return extractFallbackMetadata(filePath);
  }

  try {
    const { stdout, stderr } = await execAsync(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`
    );

    const data = JSON.parse(stdout);
    const videoStream = data.streams.find((s: any) => s.codec_type === 'video');

    if (!videoStream) {
      throw new Error('No video stream found in file');
    }

    const format = data.format;
    
    // Calculate frame count from duration and frame rate
    const duration = parseFloat(videoStream.duration) || parseFloat(format.duration) || 0;
    const frameRate = eval(videoStream.r_frame_rate) || 30;
    const frameCount = Math.round(duration * frameRate);

    const result: VideoMetadataResult = {
      duration,
      width: parseInt(videoStream.width, 10) || 0,
      height: parseInt(videoStream.height, 10) || 0,
      frameRate,
      frameCount,
      mimeType: getMimeType(format.format_name),
      fileSize: parseInt(format.size, 10) || 0,
    };

    logger.info(`Extracted metadata: ${result.width}x${result.height}, ${result.duration}s, ${result.frameCount} frames`);
    return result;
  } catch (error) {
    logger.error('Failed to extract video metadata with ffprobe:', error);
    return extractFallbackMetadata(filePath);
  }
}

async function checkFfprobeAvailability(): Promise<boolean> {
  try {
    await execAsync('ffprobe -version');
    return true;
  } catch {
    return false;
  }
}

function extractFallbackMetadata(filePath: string): VideoMetadataResult {
  const stats = fs.statSync(filePath);
  
  return {
    duration: 0,
    width: 0,
    height: 0,
    frameRate: 30,
    frameCount: 0,
    mimeType: getMimeType(filePath),
    fileSize: stats.size,
  };
}

function getMimeType(formatName: string | string[]): string {
  const formats = Array.isArray(formatName) ? formatName : [formatName];
  
  for (const fmt of formats) {
    const mimeType = mapFormatToMimeType(fmt);
    if (mimeType) return mimeType;
  }
  
  return 'video/mp4';
}

function mapFormatToMimeType(format: string): string | null {
  const formatMap: Record<string, string> = {
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    webm: 'video/webm',
    matroska: 'video/x-matroska',
    mkv: 'video/x-matroska',
  };

  return formatMap[format.toLowerCase()] || null;
}

import * as path from 'path';

export function isValidVideoFile(filePath: string): boolean {
  const supportedExtensions = ['.mp4', '.mov', '.avi', '.webm'];
  const ext = path.extname(filePath).toLowerCase();
  return supportedExtensions.includes(ext);
}
