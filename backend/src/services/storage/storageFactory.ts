import { config } from '../../utils/env';
import { StorageProvider } from './types';
import { LocalStorageProvider } from './localStorage';
import { FirebaseStorageProvider } from './firebaseStorage';
import logger from '../../utils/logger';

let storageProvider: StorageProvider | null = null;

export async function createStorageProvider(): Promise<StorageProvider> {
  if (storageProvider) {
    return storageProvider;
  }

  if (config.videoStorageType === 'firebase') {
    if (!config.firebaseProjectId || !config.firebaseClientEmail || !config.firebasePrivateKey) {
      throw new Error('Firebase configuration is incomplete. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY');
    }

    const provider = new FirebaseStorageProvider(
      config.firebaseProjectId,
      config.firebaseClientEmail,
      config.firebasePrivateKey,
      config.firebaseBucket || `${config.firebaseProjectId}.appspot.com`
    );

    await provider.initialize();
    storageProvider = provider;
    logger.info('Using Firebase storage provider');
  } else {
    const provider = new LocalStorageProvider(config.videoStoragePath);
    await provider.initialize();
    storageProvider = provider;
    logger.info('Using local storage provider');
  }

  return storageProvider;
}

export function getStorageProvider(): StorageProvider {
  if (!storageProvider) {
    throw new Error('Storage provider not initialized. Call createStorageProvider() first.');
  }
  return storageProvider;
}

export function getStorageType(): 'local' | 'firebase' {
  return config.videoStorageType;
}
