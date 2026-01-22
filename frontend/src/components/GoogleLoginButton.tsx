import React from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../hooks/useAuth';
import './GoogleLoginButton.css';

interface GoogleLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export function GoogleLoginButton({ onSuccess, onError }: GoogleLoginButtonProps) {
  const { login } = useAuth();

  const handleSuccess = async (response: CredentialResponse) => {
    try {
      if (!response.credential) {
        throw new Error('No credential received from Google');
      }

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

  const handleError = () => {
    console.error('[Google Auth] Google login error');
    onError?.(new Error('Google login failed'));
  };

  return (
    <div className="google-login-container">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        use_fedcm_for_prompt={true}
        theme="outline"
        size="large"
        shape="rectangular"
        width="100%"
        text="continue_with"
      />
    </div>
  );
}
