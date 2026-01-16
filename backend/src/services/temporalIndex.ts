import { getDatabase } from '../db/connection';
import { geminiService } from './gemini';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../utils/logger';
import { TemporalSegment, IndexingJob } from '../../../shared/types';

export interface SegmentAnalysis {
  segmentNumber: number;
  startTime: number;
  endTime: number;
  description: string;
  entities: string[];
  sceneType: string;
  confidence: number;
}

export class TemporalIndexService {
  private readonly DEFAULT_SEGMENT_DURATION = 30; // 30 seconds

  async startIndexing(videoId: string, userId: string): Promise<IndexingJob> {
    const db = getDatabase();
    
    try {
      // Get video details
      const video = await db.get('SELECT * FROM videos WHERE id = ? AND user_id = ?', [videoId, userId]);
      if (!video) {
        throw new Error('Video not found');
      }

      if (!video.duration_seconds || video.duration_seconds <= 0) {
        throw new Error('Video duration not available');
      }

      // Calculate number of segments
      const totalSegments = Math.ceil(video.duration_seconds / this.DEFAULT_SEGMENT_DURATION);
      
      // Create indexing job
      const jobId = uuidv4();
      await db.run(
        `INSERT INTO indexing_queue (
          id, video_id, user_id, status, progress, total_segments, 
          processed_segments, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          jobId,
          videoId,
          userId,
          'pending',
          0,
          totalSegments,
          0,
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      );

      // Start indexing in background
      this.processIndexingJob(jobId, videoId, userId).catch(error => {
        logger.error(`Indexing job ${jobId} failed:`, error);
      });

      return {
        id: jobId,
        videoId,
        userId,
        status: 'pending',
        progress: 0,
        totalSegments,
        processedSegments: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      logger.error('Error starting indexing:', error);
      throw error;
    }
  }

  private async processIndexingJob(jobId: string, videoId: string, userId: string): Promise<void> {
    const db = getDatabase();
    
    try {
      // Update job status to processing
      await db.run(
        'UPDATE indexing_queue SET status = ?, updated_at = ? WHERE id = ?',
        ['processing', new Date().toISOString(), jobId]
      );

      // Get video details
      const video = await db.get('SELECT * FROM videos WHERE id = ? AND user_id = ?', [videoId, userId]);
      if (!video) {
        throw new Error('Video not found');
      }

      const storageAdapter = getStorageAdapter();
      const videoFile = await storageAdapter.getFile(video.path);
      
      // Create temporary file for Gemini processing
      const tempDir = './tmp/indexing';
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFile = path.join(tempDir, `${videoId}_temp.mp4`);
      await storageAdapter.download(video.path, tempFile);

      try {
        const totalSegments = Math.ceil(video.duration_seconds / this.DEFAULT_SEGMENT_DURATION);
        
        // Process each segment
        for (let i = 0; i < totalSegments; i++) {
          const startTime = i * this.DEFAULT_SEGMENT_DURATION;
          const endTime = Math.min((i + 1) * this.DEFAULT_SEGMENT_DURATION, video.duration_seconds);
          
          try {
            const analysis = await this.analyzeSegment(tempFile, startTime, endTime);
            
            // Save segment to database
            const segmentId = uuidv4();
            await db.run(
              `INSERT INTO temporal_index (
                id, video_id, user_id, segment_number, start_time, end_time,
                description, entities, scene_type, confidence, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                segmentId,
                videoId,
                userId,
                analysis.segmentNumber,
                analysis.startTime,
                analysis.endTime,
                analysis.description,
                JSON.stringify(analysis.entities),
                analysis.sceneType,
                analysis.confidence,
                new Date().toISOString(),
              ]
            );

            // Update progress
            const processedSegments = i + 1;
            const progress = Math.round((processedSegments / totalSegments) * 100);
            
            await db.run(
              'UPDATE indexing_queue SET progress = ?, processed_segments = ?, updated_at = ? WHERE id = ?',
              [progress, processedSegments, new Date().toISOString(), jobId]
            );

            logger.info(`Processed segment ${processedSegments}/${totalSegments} for video ${videoId}`);
          } catch (segmentError) {
            logger.error(`Error processing segment ${i + 1}:`, segmentError);
            // Continue with next segment
          }
        }

        // Mark job as complete
        await db.run(
          'UPDATE indexing_queue SET status = ?, progress = ?, updated_at = ? WHERE id = ?',
          ['complete', 100, new Date().toISOString(), jobId]
        );

        logger.info(`Indexing completed for video ${videoId}`);
      } finally {
        // Clean up temporary file
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    } catch (error) {
      // Mark job as error
      await db.run(
        'UPDATE indexing_queue SET status = ?, error_message = ?, updated_at = ? WHERE id = ?',
        ['error', error.message, new Date().toISOString(), jobId]
      );
      throw error;
    }
  }

  private async analyzeSegment(videoFile: string, startTime: number, endTime: number): Promise<SegmentAnalysis> {
    const prompt = `
      Analyze this video segment from ${startTime} to ${endTime} seconds and provide:
      1. A detailed description of what's happening in this segment
      2. Key entities visible (people, objects, animals, etc.)
      3. Scene type/category (indoor, outdoor, action, dialogue, nature, etc.)
      4. Confidence score (0-1) for this analysis
      
      Format your response as JSON:
      {
        "description": "detailed description of the segment",
        "entities": ["entity1", "entity2", "entity3"],
        "sceneType": "scene category",
        "confidence": 0.95
      }
      
      Focus on identifying specific moments, actions, and objects that could be useful for searching.
    `;

    try {
      // Use Gemini to analyze the video with temporal context
      const result = await geminiService.analyzeVideoSegment(videoFile, startTime, endTime, prompt);
      
      // Try to parse JSON response
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            segmentNumber: Math.floor(startTime / this.DEFAULT_SEGMENT_DURATION) + 1,
            startTime,
            endTime,
            description: parsed.description || 'Segment description not available',
            entities: parsed.entities || [],
            sceneType: parsed.sceneType || 'unknown',
            confidence: parsed.confidence || 0.8,
          };
        }
      } catch (parseError) {
        logger.warn('Could not parse JSON response, using fallback');
      }

      // Fallback response
      return {
        segmentNumber: Math.floor(startTime / this.DEFAULT_SEGMENT_DURATION) + 1,
        startTime,
        endTime,
        description: result.substring(0, 200) + (result.length > 200 ? '...' : ''),
        entities: [],
        sceneType: 'unknown',
        confidence: 0.5,
      };
    } catch (error) {
      logger.error('Error analyzing segment:', error);
      throw error;
    }
  }

  async getIndexingStatus(jobId: string): Promise<IndexingJob | null> {
    const db = getDatabase();
    
    const job = await db.get(
      'SELECT * FROM indexing_queue WHERE id = ?',
      [jobId]
    );

    if (!job) {
      return null;
    }

    return {
      id: job.id,
      videoId: job.video_id,
      userId: job.user_id,
      status: job.status,
      progress: job.progress,
      totalSegments: job.total_segments,
      processedSegments: job.processed_segments,
      errorMessage: job.error_message,
      createdAt: new Date(job.created_at),
      updatedAt: new Date(job.updated_at),
    };
  }

  async getIndexingStatusByVideo(videoId: string, userId: string): Promise<IndexingJob | null> {
    const db = getDatabase();
    
    const job = await db.get<any>(
      'SELECT * FROM indexing_queue WHERE video_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1',
      [videoId, userId]
    );

    if (!job) {
      return null;
    }

    return {
      id: job.id,
      videoId: job.video_id,
      userId: job.user_id,
      status: job.status,
      progress: job.progress,
      totalSegments: job.total_segments,
      processedSegments: job.processed_segments,
      errorMessage: job.error_message,
      createdAt: new Date(job.created_at),
      updatedAt: new Date(job.updated_at),
    };
  }

  async isVideoIndexed(videoId: string, userId: string): Promise<boolean> {
    const db = getDatabase();
    
    const result = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM temporal_index WHERE video_id = ? AND user_id = ?',
      [videoId, userId]
    );

    return result && result.count > 0;
  }

  async deleteVideoIndex(videoId: string, userId: string): Promise<void> {
    const db = getDatabase();
    
    await db.run(
      'DELETE FROM temporal_index WHERE video_id = ? AND user_id = ?',
      [videoId, userId]
    );
    
    // Also delete any indexing jobs for this video
    await db.run(
      'DELETE FROM indexing_queue WHERE video_id = ? AND user_id = ?',
      [videoId, userId]
    );
  }

  async getVideoSegments(videoId: string, userId: string): Promise<TemporalSegment[]> {
    const db = getDatabase();
    
    const segments = await db.all<any>(
      'SELECT * FROM temporal_index WHERE video_id = ? AND user_id = ? ORDER BY segment_number',
      [videoId, userId]
    );

    return segments.map(segment => ({
      id: segment.id,
      videoId: segment.video_id,
      userId: segment.user_id,
      segmentNumber: segment.segment_number,
      startTime: segment.start_time,
      endTime: segment.end_time,
      description: segment.description,
      entities: segment.entities,
      sceneType: segment.scene_type,
      confidence: segment.confidence,
      createdAt: new Date(segment.created_at),
    }));
  }
}

export const temporalIndexService = new TemporalIndexService();