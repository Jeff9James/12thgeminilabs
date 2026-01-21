import React from 'react';
import { useAuth } from '../hooks/useAuth';
import './GoogleLoginButton.css';

interface GoogleLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export function GoogleLoginButton({ onSuccess, onError }: GoogleLoginButtonProps) {
  const { login } = useAuth();

  // Log component mount and window.google availability
  React.useEffect(() => {
    console.log('[Google Auth] Component mounted');
    console.log('[Google Auth] window.google available:', !!window.google);
    console.log('[Google Auth] window.google.accounts available:', !!window.google?.accounts);
    console.log('[Google Auth] VITE_GOOGLE_CLIENT_ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID || 'NOT_SET');
  }, []);

  const handleSuccess = async (response: { credential: string }) => {
    try {
      const idToken = response.credential;
      console.log('[Google Auth] Received idToken from Google (length:', idToken.length, ')');
      console.log('[Google Auth] Calling backend with idToken...');
      await login(idToken);
      console.log('[Google Auth] Login successful, calling onSuccess callback');
      onSuccess?.();
    } catch (error) {
      console.error('[Google Auth] Backend login failed:', error);
      onError?.(error);
    }
  };

  const handleError = (error?: unknown) => {
    console.error('[Google Auth] Google login error');
    if (error) {
      console.error('[Google Auth] Error details:', error);
    }
    onError?.(new Error('Google login failed'));
  };

  return (
    <div className="google-login-container">
      <button
        type="button"
        className="google-login-btn"
        onClick={() => {
          console.log('[Google Auth] Button clicked');
          const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
          console.log('[Google Auth] Using client_id:', clientId || 'NOT_SET');

          // Initialize Google OAuth manually
          if (window.google?.accounts) {
            try {
              console.log('[Google Auth] Initializing Google accounts...');
              window.google.accounts.id.initialize({
                client_id: clientId,
                callback: handleSuccess,
                auto_select: false,
                cancel_on_tap_outside: true,
              });
              console.log('[Google Auth] Google accounts initialized successfully');
              console.log('[Google Auth] Showing Google prompt/popup...');

              window.google.accounts.id.prompt((notification) => {
                console.log('[Google Auth] Google prompt notification:', notification.getMomentType());
                if (notification.isNotDisplayed()) {
                  console.error('[Google Auth] Google prompt not displayed');
                  handleError(new Error('Google prompt not displayed'));
                } else if (notification.isSkippedMoment()) {
                  console.warn('[Google Auth] Google prompt was skipped');
                  handleError(new Error('Google prompt was skipped'));
                } else if (notification.isDismissedMoment()) {
                  console.warn('[Google Auth] Google prompt was dismissed by user');
                  handleError(new Error('Google prompt was dismissed'));
                }
              });
            } catch (error) {
              console.error('[Google Auth] Google initialization error:', error);
              handleError(error);
            }
          } else {
            console.error('[Google Auth] window.google.accounts not available');
            console.error('[Google Auth] Make sure Google Script is loaded before using this component');
            handleError(new Error('Google accounts not available'));
          }
        }}
      >
        <svg className="google-icon" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span>Continue with Google</span>
      </button>
    </div>
  );
}

// Add Google type declaration
interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
}

interface GoogleNotification {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  isDismissedMoment: () => boolean;
  getMomentType: () => string;
}

interface GoogleAccounts {
  id: {
    initialize: (config: {
      client_id: string;
      callback: (response: GoogleCredentialResponse) => void;
      auto_select?: boolean;
      cancel_on_tap_outside?: boolean;
    }) => void;
    prompt: (callback: (notification: GoogleNotification) => void) => void;
  };
}

declare global {
  interface Window {
    google?: {
      accounts: GoogleAccounts;
    };
  }
}
