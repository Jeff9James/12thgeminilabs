import React from 'react';
import { GoogleLogin, GoogleLoginResponse, GoogleLoginResponseOffline } from '@react-oauth/google';
import { useAuth } from '../hooks/useAuth';
import './GoogleLoginButton.css';

interface GoogleLoginButtonProps {
  onSuccess?: (response: GoogleLoginResponse | GoogleLoginResponseOffline) => void;
  onError?: (error: unknown) => void;
}

type GoogleLoginResponseWithAccessToken = GoogleLoginResponse & {
  access_token?: string;
};

export function GoogleLoginButton({ onSuccess, onError }: GoogleLoginButtonProps) {
  const { login } = useAuth();

  const handleSuccess = async (response: GoogleLoginResponse | GoogleLoginResponseOffline) => {
    try {
      if ('credential' in response) {
        const idToken = response.credential;
        const accessToken = (response as GoogleLoginResponseWithAccessToken).access_token;

        await login(idToken, accessToken);
        onSuccess?.(response);
        return;
      }

      console.log('Google login response:', response);
      onError?.(new Error('Google login returned offline response'));
    } catch (error) {
      console.error('Login failed:', error);
      onError?.(error);
    }
  };

  const handleError = (error: unknown) => {
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