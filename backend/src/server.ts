import express, { Application } from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config, validateEnv } from './utils/env';
import { initDatabase } from './db/connection';
import logger from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestIdMiddleware } from './middleware/requestId';
import { authRateLimit, apiRateLimit } from './middleware/rateLimit';
import { metricsService } from './services/metrics';

// Routes
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import videosRouter from './routes/videos';
import analysisRouter from './routes/analysis';
import searchRouter from './routes/search';
import googleDriveRouter from './routes/googleDrive';
import chatRouter from './routes/chat';

function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // CORS configuration
  app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Request ID middleware
  app.use(requestIdMiddleware);

  // Compression middleware (gzip)
  app.use(compression());

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Request logging and metrics
  app.use((req, res, next) => {
    const startTime = Date.now();
    
    metricsService.incrementActiveRequest();
    logger.info(`${req.method} ${req.url}`, {
      requestId: req.id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Log response
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      metricsService.decrementActiveRequest();
      metricsService.incrementApiCall(req.method, req.route?.path || req.path);
      
      logger.info(`${req.method} ${req.url} ${statusCode}`, {
        requestId: req.id,
        responseTime: `${responseTime}ms`,
      });

      // Log errors
      if (statusCode >= 500) {
        metricsService.incrementError('server_error');
      } else if (statusCode >= 400) {
        metricsService.incrementError('client_error');
      }
    });

    next();
  });

  // Health check (no rate limiting)
  app.use('/api/health', healthRouter);

  // Auth routes with rate limiting
  app.use('/api/auth', authRateLimit, authRouter);

  // Video routes with rate limiting
  app.use('/api/videos', apiRateLimit, videosRouter);
  
  // Analysis routes with rate limiting
  app.use('/api/videos', apiRateLimit, analysisRouter);

  // Chat and advanced features routes with rate limiting
  app.use('/api/videos', apiRateLimit, chatRouter);

  // Search routes with rate limiting
  app.use('/api/videos', apiRateLimit, searchRouter);

  // Google Drive routes with rate limiting
  app.use('/api/google-drive', apiRateLimit, googleDriveRouter);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler
  app.use(errorHandler);

  return app;
}

async function startServer(): Promise<void> {
  try {
    // Validate environment variables
    validateEnv();

    // Initialize database
    const db = initDatabase(config.databasePath);
    await db.connect();
    await db.initialize();

    // Create Express app
    const app = createApp();

    // Start server
    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Frontend URL: ${config.frontendUrl}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

export { createApp };
