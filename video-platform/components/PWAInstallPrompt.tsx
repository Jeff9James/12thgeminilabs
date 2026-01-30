'use client';

import { useEffect, useState } from 'react';
import { X, Download, Smartphone, Monitor, Share } from 'lucide-react';
import type { BeforeInstallPromptEvent } from '@/lib/pwa';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [platform, setPlatform] = useState<'desktop' | 'mobile' | 'ios'>('desktop');

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    
    if (isIOS) {
      setPlatform('ios');
    } else if (isMobile) {
      setPlatform('mobile');
    } else {
      setPlatform('desktop');
    }

    // Check if already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as any).standalone === true;
    
    if (isInstalled) {
      console.log('[PWA] App is already installed');
      return;
    }

    // Check if user dismissed the prompt recently
    const dismissedAt = localStorage.getItem('pwa-install-dismissed');
    if (dismissedAt) {
      const daysSinceDismissal = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissal < 7) {
        console.log('[PWA] Install prompt was dismissed recently');
        return;
      }
    }

    // Listen for beforeinstallprompt event (Chrome/Edge/Samsung)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      
      // Show prompt after 30 seconds
      setTimeout(() => {
        setShowPrompt(true);
      }, 30000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show manual instructions after 30 seconds
    if (isIOS) {
      setTimeout(() => {
        setShowPrompt(true);
      }, 30000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('[PWA] No deferred prompt available');
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User response: ${outcome}`);

    if (outcome === 'accepted') {
      setShowPrompt(false);
      localStorage.removeItem('pwa-install-dismissed');
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!showPrompt) {
    return null;
  }

  // iOS-specific instructions
  if (platform === 'ios') {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 z-50 animate-in slide-in-from-bottom duration-300">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Smartphone className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Install Gemini Files
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Add to your home screen for a better experience
            </p>
            <ol className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <Share className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Tap the <strong>Share</strong> button below</span>
              </li>
              <li className="flex items-start gap-2">
                <Download className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Select <strong>"Add to Home Screen"</strong></span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // Chrome/Edge/Samsung install prompt
  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-2xl p-6 z-50 animate-in slide-in-from-bottom duration-300">
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex items-start gap-4">
        <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
          {platform === 'mobile' ? (
            <Smartphone className="w-6 h-6 text-white" />
          ) : (
            <Monitor className="w-6 h-6 text-white" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white mb-2">
            Install Gemini Files
          </h3>
          <p className="text-sm text-blue-100 mb-4">
            Get quick access and work offline with our app
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-white text-blue-600 px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-colors"
            >
              <Download className="w-4 h-4 inline mr-2" />
              Install App
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2.5 rounded-lg font-semibold text-sm text-white hover:bg-white/10 transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="mt-4 pt-4 border-t border-white/20">
        <ul className="text-xs text-blue-100 space-y-1.5">
          <li>✓ Work offline</li>
          <li>✓ Faster load times</li>
          <li>✓ Access local files</li>
        </ul>
      </div>
    </div>
  );
}
