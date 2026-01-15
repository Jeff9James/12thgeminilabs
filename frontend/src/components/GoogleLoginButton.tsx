import React from 'react';
import { GoogleLogin, GoogleLoginResponse, GoogleLoginResponseOffline } from '@react-oauth/google';
import { useAuth } from '../hooks/useAuth';
import './GoogleLoginButton.css';

interface GoogleLoginButtonProps {
  onSuccess?: (user: any) => void;
  onError?: (error: any) => void;
}

export function GoogleLoginButton({ onSuccess, onError }: GoogleLoginButtonProps) {
  const { login } = useAuth();

  const handleSuccess = async (response: GoogleLoginResponse | GoogleLoginResponseOffline) => {
    try {
      if ('credential' in response) {
        // Successful login
        const idToken = response.credential;
        // Get access token if available (for Google Drive integration)
        const accessToken = (response as any).access_token;
        
        await login(idToken, accessToken);
        onSuccess?.(response);
      } else {
        // This handles the case where Google returns an offline response
        console.log('Google login response:', response);
        onError?.(new Error('Google login returned offline response'));
      }
    } catch (error) {
      console.error('Login failed:', error);
      onError?.(error);
    }
  };

  const handleError = (error: any) => {
    console.error('Google login error:', error);
    onError?.(error);
  };

  return (
    <div className="google-login-container">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        useOneTap={false}
        theme="outline"
        size="large"
        text="signin_with"
        shape="rectangular"
        logo_alignment="left"
        width="300"
      />
    </div>
  );
}