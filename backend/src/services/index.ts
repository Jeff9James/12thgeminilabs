import { config } from '../utils/env';
import { StorageAdapter } from './storage';
import { localStorageAdapter } from './localStorage';
import { firebaseStorageAdapter } from './firebaseStorage';
import { STORAGE_TYPES } from '../../../shared/constants';
import logger from '../utils/logger';

let storageAdapter: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (storageAdapter) {
    return storageAdapter;
  }

  const storageType = config.videoStorageType;

  switch (storageType) {
    case STORAGE_TYPES.FIREBASE:
      logger.info('Using Firebase storage adapter');
      storageAdapter = firebaseStorageAdapter;
      break;
    case STORAGE_TYPES.LOCAL:
    default:
      logger.info('Using local storage adapter');
      storageAdapter = localStorageAdapter;
      break;
  }

  return storageAdapter;
}

export function isFirebaseConfigured(): boolean {
  return !!(
    config.firebaseProjectId &&
    config.firebaseClientEmail &&
    config.firebasePrivateKey
  );
}

// Export the new services
export { geminiService } from './gemini';
export { temporalIndexService } from './temporalIndex';
export { semanticSearchService } from './semanticSearch';
export { metricsService } from './metrics';
export { rateLimitService } from './rateLimit';
