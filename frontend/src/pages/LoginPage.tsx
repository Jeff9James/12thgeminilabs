import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { GoogleLoginButton } from '../components/GoogleLoginButton';
import { useAuth } from '../hooks/useAuth';
import './LoginPage.css';

function LoginPage() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  if (!authLoading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleGoogleSuccess = async () => {
    setError('');
    setIsLoading(true);

    try {
      navigate('/');
    } catch (err) {
      const errorMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(errorMessage || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = (error: unknown) => {
    console.error('Google login failed:', error);
    setError('Google authentication failed. Please try again.');
  };

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="bg-gradient gradient-1" />
        <div className="bg-gradient gradient-2" />
        <div className="bg-gradient gradient-3" />
      </div>

      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="logo">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h1>Video AI Platform</h1>
            <p>AI-powered video understanding using Google's Gemini</p>
          </div>

          {error && (
            <div className="error-message">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="login-content">
            <GoogleLoginButton
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
            />

            {isLoading && (
              <div className="loading-indicator">
                <div className="loading-spinner" />
                <p>Signing you in...</p>
              </div>
            )}
          </div>

          <div className="login-footer">
            <p>By signing in, you agree to our</p>
            <p>
              <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
            </p>
          </div>

          <div className="features-preview">
            <div className="feature">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Semantic Search</span>
            </div>
            <div className="feature">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>AI Analysis</span>
            </div>
            <div className="feature">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Video Chat</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
