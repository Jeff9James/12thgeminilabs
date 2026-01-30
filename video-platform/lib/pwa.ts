// PWA utilities for service worker registration and install prompts

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Register service worker
export function registerServiceWorker(): Promise<ServiceWorkerRegistration | undefined> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('[PWA] Service workers not supported');
    return Promise.resolve(undefined);
  }

  return navigator.serviceWorker
    .register('/sw.js')
    .then((registration) => {
      console.log('[PWA] Service worker registered:', registration.scope);

      // Check for updates every hour
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New service worker available');
              // Notify user about update
              if (window.confirm('New version available! Reload to update?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        }
      });

      return registration;
    })
    .catch((error) => {
      console.error('[PWA] Service worker registration failed:', error);
      return undefined;
    });
}

// Unregister service worker (for development)
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (registration) {
    return registration.unregister();
  }
  return false;
}

// Check if app is installed
export function isAppInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check if running as installed PWA
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // Check for iOS standalone mode
  if ((window.navigator as any).standalone === true) {
    return true;
  }
  
  return false;
}

// Get install prompt state
export function canShowInstallPrompt(): boolean {
  return !isAppInstalled() && typeof window !== 'undefined';
}

// PWA capabilities detection
export interface PWACapabilities {
  serviceWorker: boolean;
  pushNotifications: boolean;
  fileSystemAccess: boolean;
  periodicBackgroundSync: boolean;
  badging: boolean;
  sharing: boolean;
  fileHandling: boolean;
}

export function detectPWACapabilities(): PWACapabilities {
  if (typeof window === 'undefined') {
    return {
      serviceWorker: false,
      pushNotifications: false,
      fileSystemAccess: false,
      periodicBackgroundSync: false,
      badging: false,
      sharing: false,
      fileHandling: false,
    };
  }

  return {
    serviceWorker: 'serviceWorker' in navigator,
    pushNotifications: 'PushManager' in window,
    fileSystemAccess: 'showOpenFilePicker' in window,
    periodicBackgroundSync: 'periodicSync' in ServiceWorkerRegistration.prototype,
    badging: 'setAppBadge' in navigator,
    sharing: 'share' in navigator,
    fileHandling: 'launchQueue' in window,
  };
}

// Web Share API
export async function shareContent(data: {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}): Promise<boolean> {
  if (typeof window === 'undefined' || !('share' in navigator)) {
    console.log('[PWA] Web Share API not supported');
    return false;
  }

  try {
    await navigator.share(data);
    return true;
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('[PWA] Share failed:', error);
    }
    return false;
  }
}

// File System Access API detection
export function supportsFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
}

// Get display mode
export function getDisplayMode(): 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen' {
  if (typeof window === 'undefined') return 'browser';
  
  if (window.matchMedia('(display-mode: fullscreen)').matches) {
    return 'fullscreen';
  }
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return 'standalone';
  }
  if (window.matchMedia('(display-mode: minimal-ui)').matches) {
    return 'minimal-ui';
  }
  return 'browser';
}

// Listen for app install
export function onAppInstalled(callback: () => void): void {
  if (typeof window === 'undefined') return;
  
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed');
    callback();
  });
}

// Analytics for PWA events
export function trackPWAEvent(event: string, data?: Record<string, any>): void {
  console.log('[PWA Event]', event, data);
  // TODO: Integrate with your analytics service
}
