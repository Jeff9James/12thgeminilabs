'use client';

import { useEffect } from 'react';
import { registerServiceWorker, onAppInstalled, trackPWAEvent, getDisplayMode, detectPWACapabilities } from '@/lib/pwa';

export default function PWAInitializer() {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    console.log('[PWA] Initializing...');

    // Detect and log PWA capabilities
    const capabilities = detectPWACapabilities();
    console.log('[PWA] Capabilities:', capabilities);
    trackPWAEvent('pwa_capabilities_detected', capabilities);

    // Log display mode
    const displayMode = getDisplayMode();
    console.log('[PWA] Display mode:', displayMode);
    trackPWAEvent('pwa_display_mode', { mode: displayMode });

    // Register service worker
    registerServiceWorker()
      .then((registration) => {
        if (registration) {
          console.log('[PWA] Service worker registered successfully');
          trackPWAEvent('pwa_service_worker_registered');
        }
      })
      .catch((error) => {
        console.error('[PWA] Service worker registration failed:', error);
        trackPWAEvent('pwa_service_worker_failed', { error: error.message });
      });

    // Listen for app installation
    onAppInstalled(() => {
      console.log('[PWA] App was installed');
      trackPWAEvent('pwa_installed');
      
      // Optional: Show a welcome message
      setTimeout(() => {
        alert('✅ Gemini Files installed successfully! You can now access the app from your home screen.');
      }, 1000);
    });

    // Listen for online/offline status
    const handleOnline = () => {
      console.log('[PWA] App is online');
      trackPWAEvent('pwa_online');
    };

    const handleOffline = () => {
      console.log('[PWA] App is offline');
      trackPWAEvent('pwa_offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // This component doesn't render anything
  return null;
}
