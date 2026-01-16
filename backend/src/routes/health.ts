import { Router, Request, Response } from 'express';
import { ApiResponse } from '../../../shared/types';
import { getDatabase } from '../db/connection';
import { metricsService } from '../services/metrics';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Check database connection
    const db = getDatabase();
    const dbResult = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM videos');
    
    const uptime = metricsService.getUptime();
    const metrics = metricsService.getMetrics();
    
    const response: ApiResponse<{
      status: string;
      timestamp: string;
      uptime: number;
      database: {
        status: string;
        videoCount: number;
      };
      metrics: {
        apiCalls: number;
        geminiCalls: number;
        errors: number;
        activeRequests: number;
      };
      memory: {
        used: number;
        total: number;
      };
    }> = {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime,
        database: {
          status: 'connected',
          videoCount: dbResult?.count || 0,
        },
        metrics: {
          apiCalls: metrics.apiCalls.total,
          geminiCalls: metrics.geminiCalls.total,
          errors: metrics.errors.total,
          activeRequests: metrics.requests.active,
        },
        memory: {
          used: process.memoryUsage().heapUsed / 1024 / 1024, // MB
          total: process.memoryUsage().heapTotal / 1024 / 1024, // MB
        },
      },
      message: 'Server is running and healthy',
    };

    const responseTime = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    res.json(response);
  } catch (error) {
    const response: ApiResponse<{ status: string; error: string }> = {
      success: false,
      data: {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      message: 'Health check failed',
    };
    res.status(503).json(response);
  }
});

// Detailed metrics endpoint (for monitoring)
router.get('/metrics', (req: Request, res: Response) => {
  const metrics = metricsService.getMetrics();
  const uptime = metricsService.getUptime();
  
  const response = {
    success: true,
    data: {
      uptime,
      startTime: new Date(Date.now() - uptime * 1000).toISOString(),
      ...metrics,
    },
  };
  
  res.json(response);
});

export default router;
