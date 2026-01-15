import { spawn } from 'child_process';
import { promisify } from 'util';
import { VideoMetadata } from '../../../shared/types';
import logger from '../../utils/logger';

interface FFProbeResult {
  format?: {
    duration?: number;
    format_name?: string;
    size?: number;
    bit_rate?: number;
  };
  streams?: Array<{
    codec_name?: string;
    width?: number;
    height?: number;
    r_frame_rate?: string;
    duration?: number;
    nb_frames?: string;
  }>;
}

export class MetadataExtractor {
  private ffprobePath: string;

  constructor(ffprobePath: string = 'ffprobe') {
    this.ffprobePath = ffprobePath;
  }

  async extractMetadata(videoPath: string): Promise<VideoMetadata | null> {
    return new Promise((resolve) => {
      const ffprobe = spawn(this.ffprobePath, [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        videoPath,
      ]);

      let stdout = '';
      let stderr = '';

      ffprobe.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          logger.warn(`ffprobe exited with code ${code}. stderr: ${stderr}`);
          // Return null but don't fail - metadata extraction is optional
          resolve(null);
          return;
        }

        try {
          const result: FFProbeResult = JSON.parse(stdout);
          const videoStream = result.streams?.find(
            (s) => s.codec_name && ['h264', 'h265', 'hevc', 'av1', 'mpeg4', 'vp9', 'vp8'].includes(s.codec_name)
          ) || result.streams?.[0];

          if (!videoStream) {
            logger.warn('No video stream found in file');
            resolve(null);
            return;
          }

          const frameRate = this.parseFrameRate(videoStream.r_frame_rate);
          const frameCount = videoStream.nb_frames
            ? parseInt(videoStream.nb_frames, 10)
            : undefined;

          const metadata: VideoMetadata = {
            duration: videoStream.duration
              ? parseFloat(videoStream.duration)
              : result.format?.duration
              ? parseFloat(result.format.duration)
              : 0,
            width: videoStream.width || 0,
            height: videoStream.height || 0,
            frameRate,
            frameCount: frameCount || Math.floor(frameRate * (videoStream.duration || result.format?.duration || 0)),
            format: result.format?.format_name || 'unknown',
            codec: videoStream.codec_name || 'unknown',
            bitrate: result.format?.bit_rate ? parseInt(result.format.bit_rate, 10) : undefined,
          };

          logger.info(`Extracted metadata: ${JSON.stringify(metadata)}`);
          resolve(metadata);
        } catch (error) {
          logger.error('Failed to parse ffprobe output:', error);
          resolve(null);
        }
      });
    });
  }

  private parseFrameRate(frameRateString: string | undefined): number {
    if (!frameRateString) return 0;

    const parts = frameRateString.split('/');
    if (parts.length === 2) {
      const numerator = parseFloat(parts[0]);
      const denominator = parseFloat(parts[1]);
      if (denominator !== 0) {
        return numerator / denominator;
      }
    }

    return parseFloat(frameRateString) || 0;
  }

  isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const ffprobe = spawn(this.ffprobePath, ['-version']);

      ffprobe.on('close', (code) => {
        resolve(code === 0);
      });

      ffprobe.on('error', () => {
        resolve(false);
      });
    });
  }
}

export const metadataExtractor = new MetadataExtractor();
