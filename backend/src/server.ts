import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config, validateEnv } from './utils/env';
import { initDatabase } from './db/connection';
import { videoService } from './services/videoService';
import { queueService } from './services/queue';
import { createStorageProvider } from './services/storage';
import logger from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Routes
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import videosRouter from './routes/videos';

function createApp(): Application {
  const app = express();

  // Middleware
  app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Request logging
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
  });

  // Health check
  app.use('/api/health', healthRouter);

  // Auth routes
  app.use('/api/auth', authRouter);

  // Video routes
  app.use('/api/videos', videosRouter);

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

    // Initialize services
    logger.info('Initializing services...');
    
    await videoService.initialize();
    await queueService.initialize();
    await createStorageProvider();
    
    logger.info('All services initialized');

    // Create Express app
    const app = createApp();

    // Start server
    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Frontend URL: ${config.frontendUrl}`);
      logger.info(`Video Storage: ${config.videoStorageType}`);
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
