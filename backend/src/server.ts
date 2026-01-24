import express, { Application, Request } from 'express';
import cors, { type CorsOptionsDelegate } from 'cors';
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

  // Request ID middleware
  // (Placed early so that preflight/OPTIONS requests also get an ID and can be correlated in logs)
  app.use(requestIdMiddleware);

  // Trust proxy - Required for Railway and other proxy environments
  app.set('trust proxy', 1);

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
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
  }));

  const normalizeOrigin = (urlOrOrigin: string): string => {
    const trimmed = urlOrOrigin.trim().replace(/\/+$/, '');
    if (!trimmed) return trimmed;

    const hasProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed);
    const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|$)/.test(trimmed);
    const candidate = hasProtocol ? trimmed : `${isLocal ? 'http' : 'https'}://${trimmed}`;

    try {
      return new URL(candidate).origin;
    } catch {
      return trimmed;
    }
  };

  const configuredFrontendOrigin = normalizeOrigin(config.frontendUrl);
  const nodeEnv = config.nodeEnv || 'development';

  const alternateFrontendOrigin = (() => {
    try {
      const url = new URL(configuredFrontendOrigin);
      const hostname = url.hostname;

      if (hostname.endsWith('.vercel.app')) return null;
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') return null;

      if (hostname.startsWith('www.')) {
        url.hostname = hostname.replace(/^www\./, '');
        return url.origin;
      }

      url.hostname = `www.${hostname}`;
      return url.origin;
    } catch {
      return null;
    }
  })();

  const additionalAllowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
    .map(normalizeOrigin);

  const allowedOrigins = new Set<string>([
    configuredFrontendOrigin,
    ...(alternateFrontendOrigin ? [alternateFrontendOrigin] : []),
    ...additionalAllowedOrigins,
    'https://accounts.google.com',
    'https://gsi.gstatic.com',
  ]);

  // If we're deployed on Vercel, allow preview deployments (e.g. <project>-<hash>.vercel.app)
  const vercelPreviewBase = (() => {
    try {
      const { hostname } = new URL(configuredFrontendOrigin);
      if (!hostname.endsWith('.vercel.app')) return null;
      const base = hostname.replace(/\.vercel\.app$/, '');
      return base || null;
    } catch {
      return null;
    }
  })();

  const isAllowedOrigin = (origin: string): boolean => {
    if (allowedOrigins.has(origin)) return true;

    // Allow localhost during development
    if (nodeEnv !== 'production') {
      if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(origin)) {
        return true;
      }
    }

    // Allow Vercel preview origins for the same project
    if (vercelPreviewBase) {
      try {
        const { protocol, hostname } = new URL(origin);
        if (protocol !== 'https:') return false;
        if (!hostname.endsWith('.vercel.app')) return false;
        return hostname === `${vercelPreviewBase}.vercel.app` || hostname.startsWith(`${vercelPreviewBase}-`);
      } catch {
        return false;
      }
    }

    return false;
  };

  const shouldLogCors = (req: Request): boolean => {
    // Always log auth endpoints + all preflight requests (OPTIONS)
    return req.method === 'OPTIONS' || req.path.startsWith('/api/auth');
  };

  // CORS configuration
  // Uses FRONTEND_URL (config.frontendUrl) for the primary allowed origin.
  // Also supports:
  // - CORS_ALLOWED_ORIGINS (comma-separated)
  // - Vercel preview deployments for the same project
  // - https://accounts.google.com (needed by Google Identity Services in some modes)
  const corsOptionsDelegate: CorsOptionsDelegate<Request> = (req, callback) => {
    const requestOriginHeader = req.header('Origin');
    const requestOrigin = requestOriginHeader ? normalizeOrigin(requestOriginHeader) : undefined;

    const allowed = requestOrigin ? isAllowedOrigin(requestOrigin) : true;

    if (shouldLogCors(req)) {
      // eslint-disable-next-line no-console
      console.log('[CORS] Incoming request', {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        origin: requestOriginHeader || null,
        normalizedOrigin: requestOrigin || null,
        configuredFrontendOrigin,
        frontendOriginMatches: requestOrigin ? requestOrigin === configuredFrontendOrigin : false,
        allowed,
        allowedOrigins: Array.from(allowedOrigins),
        vercelPreviewBase,
      });
    }

    callback(null, {
      origin: allowed && requestOrigin ? requestOrigin : false,
      credentials: true,
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      exposedHeaders: ['X-Request-ID'],
      optionsSuccessStatus: 204,
      maxAge: 86400,
    });
  };

  // Log CORS response headers (especially useful for debugging preflight failures)
  app.use((req, res, next) => {
    if (!shouldLogCors(req)) {
      next();
      return;
    }

    res.on('finish', () => {
      // eslint-disable-next-line no-console
      console.log('[CORS] Response', {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        origin: req.header('Origin') || null,
        accessControlAllowOrigin: res.getHeader('access-control-allow-origin') || null,
        accessControlAllowCredentials: res.getHeader('access-control-allow-credentials') || null,
        accessControlAllowMethods: res.getHeader('access-control-allow-methods') || null,
        accessControlAllowHeaders: res.getHeader('access-control-allow-headers') || null,
      });
    });

    next();
  });

  app.use(cors(corsOptionsDelegate));
  app.options('*', cors(corsOptionsDelegate));

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
    // Log startup initiation
    console.log('========================================');
    console.log('SERVER STARTUP - INITIALIZING');
    console.log('========================================');

    // Log environment variable presence (sanitized)
    const envKeys = Object.keys(process.env);
    const relevantKeys = envKeys.filter(k =>
      k.includes('GEMINI') ||
      k.includes('JWT') ||
      k.includes('GOOGLE') ||
      k.includes('DATABASE') ||
      k.includes('FRONTEND') ||
      k.includes('VIDEO') ||
      k.includes('FIREBASE') ||
      k.includes('NODE') ||
      k.includes('PORT') ||
      k.includes('DEBUG')
    );

    console.log('Environment variables detected:', relevantKeys.length);
    console.log('Environment variable keys:', relevantKeys);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('PORT:', process.env.PORT);
    console.log('RAILWAY_ENVIRONMENT_ID:', process.env.RAILWAY_ENVIRONMENT_ID ? 'present' : 'absent');

    // Phase 1: Environment validation
    console.log('');
    console.log('Phase 1: Validating environment variables...');
    validateEnv();
    console.log('✓ Environment variables validated');

    // Phase 2: Database initialization
    console.log('');
    console.log('Phase 2: Initializing database...');
    const db = initDatabase(config.databasePath);
    console.log('✓ Database initialized');
    console.log('  - Database path:', config.databasePath);

    console.log('  - Connecting to database...');
    await db.connect();
    console.log('✓ Database connected');

    console.log('  - Running database migrations...');
    await db.initialize();
    console.log('✓ Database migrations completed');

    // Phase 3: Creating Express app
    console.log('');
    console.log('Phase 3: Creating Express application...');
    const app = createApp();
    console.log('✓ Express app created');

    // Phase 4: Starting server
    console.log('');
    console.log('Phase 4: Starting HTTP server...');
    console.log('  - Binding to port:', config.port);
    console.log('  - Node version:', process.version);
    console.log('  - Platform:', process.platform);
    console.log('  - Architecture:', process.arch);
    console.log('  - PID:', process.pid);
    console.log('  - Memory usage:', JSON.stringify(process.memoryUsage(), null, 2));
    console.log('  - Working directory:', process.cwd());

    const server = app.listen(config.port, () => {
      const timestamp = new Date().toISOString();
      console.log('========================================');
      console.log('✓ SERVER STARTED SUCCESSFULLY');
      console.log('========================================');
      console.log('Timestamp:', timestamp);
      console.log('Port:', config.port);
      console.log('Environment:', config.nodeEnv);
      console.log('Frontend URL:', config.frontendUrl);
      console.log('Process ID:', process.pid);
      console.log('Node version:', process.version);
      console.log('Memory usage:', JSON.stringify({
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
        external: Math.round(process.memoryUsage().external / 1024 / 1024) + ' MB',
      }, null, 2));
      console.log('========================================');
      console.log('✓ Server is ready to accept requests');
      console.log('✓ Health check endpoint: /api/health');
      console.log('========================================');

      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Frontend URL: ${config.frontendUrl}`);
    });

    // Log when server starts listening
    server.on('listening', () => {
      console.log('✓ Server socket is listening');
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error('Server error:', error);
      if (error instanceof Error) {
        console.error('  - Code:', error.message);
        console.error('  - Stack:', error.stack);
      }
      process.exit(1);
    });

    // Log periodic heartbeat (every 30 seconds) to show server is running
    setInterval(() => {
      const uptime = process.uptime();
      const mem = process.memoryUsage();
      console.log(`[HEARTBEAT] Server alive - Uptime: ${Math.round(uptime)}s, Memory: ${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(mem.heapTotal / 1024 / 1024)}MB`);
    }, 30000);
  } catch (error) {
    console.error('========================================');
    console.error('FATAL STARTUP ERROR');
    console.error('========================================');
    console.error('Error details:');
    console.error('  - Message:', error instanceof Error ? error.message : String(error));
    console.error('  - Type:', error instanceof Error ? error.name : typeof error);
    console.error('  - Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    console.error('========================================');

    logger.error('Failed to start server:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle SIGTERM (Railway uses this to stop containers)
process.on('SIGTERM', () => {
  console.log('========================================');
  console.log('SIGTERM RECEIVED - Graceful Shutdown');
  console.log('========================================');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Uptime:', process.uptime(), 'seconds');
  console.log('Memory usage:', JSON.stringify(process.memoryUsage(), null, 2));

  // Give logs time to flush before exit
  setTimeout(() => {
    console.log('Exiting gracefully...');
    process.exit(0);
  }, 1000);
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('========================================');
  console.log('SIGINT RECEIVED - Graceful Shutdown');
  console.log('========================================');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Uptime:', process.uptime(), 'seconds');

  // Give logs time to flush before exit
  setTimeout(() => {
    console.log('Exiting gracefully...');
    process.exit(0);
  }, 1000);
});

// Start the server
startServer();

export { createApp };
