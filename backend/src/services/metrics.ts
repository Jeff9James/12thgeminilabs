import logger from '../utils/logger';

interface Metrics {
  apiCalls: {
    total: number;
    byEndpoint: Record<string, number>;
    byMethod: Record<string, number>;
  };
  geminiCalls: {
    total: number;
    successful: number;
    failed: number;
    byModel: Record<string, number>;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
  };
  requests: {
    active: number;
    total: number;
  };
}

class MetricsService {
  private static instance: MetricsService;
  private metrics: Metrics;
  private startTime: Date;

  private constructor() {
    this.startTime = new Date();
    this.metrics = {
      apiCalls: {
        total: 0,
        byEndpoint: {},
        byMethod: {},
      },
      geminiCalls: {
        total: 0,
        successful: 0,
        failed: 0,
        byModel: {},
      },
      errors: {
        total: 0,
        byType: {},
      },
      requests: {
        active: 0,
        total: 0,
      },
    };
  }

  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  incrementApiCall(method: string, endpoint: string): void {
    this.metrics.apiCalls.total++;
    this.metrics.apiCalls.byMethod[method] = (this.metrics.apiCalls.byMethod[method] || 0) + 1;
    this.metrics.apiCalls.byEndpoint[endpoint] = (this.metrics.apiCalls.byEndpoint[endpoint] || 0) + 1;
  }

  incrementGeminiCall(model: string, success: boolean): void {
    this.metrics.geminiCalls.total++;
    if (success) {
      this.metrics.geminiCalls.successful++;
    } else {
      this.metrics.geminiCalls.failed++;
    }
    this.metrics.geminiCalls.byModel[model] = (this.metrics.geminiCalls.byModel[model] || 0) + 1;
  }

  incrementError(errorType: string): void {
    this.metrics.errors.total++;
    this.metrics.errors.byType[errorType] = (this.metrics.errors.byType[errorType] || 0) + 1;
  }

  incrementActiveRequest(): void {
    this.metrics.requests.active++;
    this.metrics.requests.total++;
  }

  decrementActiveRequest(): void {
    this.metrics.requests.active = Math.max(0, this.metrics.requests.active - 1);
  }

  getMetrics(): Metrics {
    return { ...this.metrics };
  }

  getUptime(): number {
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }

  logMetrics(): void {
    logger.info('Current Metrics:', {
      uptime: `${this.getUptime()}s`,
      apiCalls: this.metrics.apiCalls.total,
      geminiCalls: this.metrics.geminiCalls.total,
      errors: this.metrics.errors.total,
      activeRequests: this.metrics.requests.active,
    });
  }

  resetMetrics(): void {
    this.metrics = {
      apiCalls: {
        total: 0,
        byEndpoint: {},
        byMethod: {},
      },
      geminiCalls: {
        total: 0,
        successful: 0,
        failed: 0,
        byModel: {},
      },
      errors: {
        total: 0,
        byType: {},
      },
      requests: {
        active: 0,
        total: 0,
      },
    };
    this.startTime = new Date();
    logger.info('Metrics reset');
  }
}

export const metricsService = MetricsService.getInstance();
