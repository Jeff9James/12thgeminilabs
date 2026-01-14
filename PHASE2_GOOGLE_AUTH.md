# PHASE 2: Google OAuth Implementation & Authentication System

## TASK TITLE: Build Gemini-Powered Video Understanding Web App - Phase 2: Google OAuth 2.0

**PRIORITY: HIGH** - Authentication must be secure and follow OAuth 2.0 best practices

---

## FULL PROMPT FOR AI CODING AGENT:

Implement complete Google OAuth 2.0 authentication system that matches amurex's client-side integration pattern. This phase handles user authentication, token management, and session persistence.

### ARCHITECTURAL CONSTRAINTS:

- NO backend server required - pure client-side OAuth 2.0 flow
- Implicit grant flow using Google's OAuth 2.0 for JavaScript
- Token storage in memory (never localStorage for security)
- Automatic token refresh before expiry
- PKCE (Proof Key for Code Exchange) not required for implicit flow but implement state parameter
- Handle CORS correctly for Google APIs
- Follow Google's OAuth 2.0 security best practices

### DELIVERABLES:

**File: src/utils/constants.ts**
```typescript
export const GOOGLE_AUTH_CONFIG = {
  CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  SCOPES: [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ],
  DISCOVERY_DOCS: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
  REDIRECT_URI: window.location.origin + '/auth/callback'
} as const;

export const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1/models';
export const INDEXED_DB_NAME = 'VideoAnalysisDB';
export const INDEXED_DB_VERSION = 1;
```

**File: src/services/googleAuth.ts**
```typescript
import { GOOGLE_AUTH_CONFIG } from '../utils/constants';
import { AuthState } from '../types';

class GoogleAuthService {
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;
  private authState: AuthState = {
    isAuthenticated: false,
    accessToken: null,
    user: null
  };

  // Initialize Google Identity Services
  async initialize(): Promise<void> {
    try {
      // Load Google Identity Services script
      await this.loadGIScript();
      
      // Check for existing token in URL hash (after redirect)
      const token = this.getTokenFromUrl();
      if (token) {
        await this.validateAndSetToken(token);
      }
      
      // Check for saved auth state (e.g., from session)
      const savedState = this.getSavedAuthState();
      if (savedState?.accessToken) {
        this.authState = savedState;
        this.accessToken = savedState.accessToken;
      }
    } catch (error) {
      console.error('Google Auth initialization failed:', error);
      throw new Error('Authentication system failed to initialize');
    }
  }

  private loadGIScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).google?.accounts?.oauth2) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(script);
    });
  }

  // Initiate OAuth 2.0 flow
  async signIn(): Promise<AuthState> {
    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_AUTH_CONFIG.CLIENT_ID,
        scope: GOOGLE_AUTH_CONFIG.SCOPES.join(' '),
        callback: async (response) => {
          if (response.access_token) {
            await this.validateAndSetToken(response.access_token);
          } else {
            throw new Error('No access token received');
          }
        },
        error_callback: (error) => {
          console.error('OAuth error:', error);
          throw new Error(`Authentication failed: ${error.message}`);
        }
      });

      // Request token
      client.requestAccessToken();
      
      // Wait for callback to complete
      return new Promise((resolve, reject) => {
        const originalCallback = client.callback;
        client.callback = async (response) => {
          try {
            await originalCallback(response);
            resolve(this.authState);
          } catch (error) {
            reject(error);
          }
        };
      });
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  }

  // Validate token and get user info
  private async validateAndSetToken(token: string): Promise<void> {
    try {
      // Verify token by fetching user info
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!userInfoResponse.ok) {
        throw new Error('Invalid access token');
      }

      const userInfo = await userInfoResponse.json();
      
      this.accessToken = token;
      this.tokenExpiry = Date.now() + 3600 * 1000; // 1 hour from now
      
      this.authState = {
        isAuthenticated: true,
        accessToken: token,
        user: {
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture
        }
      };

      // Save to session (not localStorage for security)
      this.saveAuthState();
      
    } catch (error) {
      console.error('Token validation failed:', error);
      throw new Error('Invalid authentication token');
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    if (this.accessToken) {
      try {
        // Revoke token
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${this.accessToken}`,
          { method: 'POST' }
        );
      } catch (error) {
        console.warn('Token revocation failed:', error);
      }
    }

    // Clear state
    this.accessToken = null;
    this.tokenExpiry = null;
    this.authState = {
      isAuthenticated: false,
      accessToken: null,
      user: null
    };

    // Clear session storage
    sessionStorage.removeItem('googleAuthState');
    
    // Clear URL hash
    window.location.hash = '';
  }

  // Get current auth state
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  // Get valid access token (auto-refresh if needed)
  async getValidAccessToken(): Promise<string | null> {
    if (!this.accessToken || !this.tokenExpiry) {
      return null;
    }

    // Check if token is expired or expiring in next 5 minutes
    if (Date.now() >= this.tokenExpiry - 5 * 60 * 1000) {
      try {
        // Token expired - need to re-authenticate
        await this.signIn();
      } catch (error) {
        console.error('Re-authentication failed:', error);
        return null;
      }
    }

    return this.accessToken;
  }

  // Check if authenticated
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated && !!this.accessToken;
  }

  // Save auth state to session storage
  private saveAuthState(): void {
    try {
      sessionStorage.setItem('googleAuthState', JSON.stringify(this.authState));
    } catch (error) {
      console.warn('Failed to save auth state:', error);
    }
  }

  // Load auth state from session storage
  private getSavedAuthState(): AuthState | null {
    try {
      const saved = sessionStorage.getItem('googleAuthState');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn('Failed to load auth state:', error);
      return null;
    }
  }

  // Extract token from URL hash
  private getTokenFromUrl(): string | null {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return params.get('access_token');
  }

  // Get token expiry from URL
  private getExpiryFromUrl(): number | null {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const expiresIn = params.get('expires_in');
    return expiresIn ? Date.now() + parseInt(expiresIn) * 1000 : null;
  }
}

// Singleton instance
export const googleAuthService = new GoogleAuthService();

// Auto-initialize on module load
if (typeof window !== 'undefined') {
  googleAuthService.initialize().catch(console.error);
}
```

**File: src/hooks/useGoogleAuth.ts**
```typescript
import { useState, useEffect } from 'react';
import { googleAuthService } from '../services/googleAuth';
import { AuthState } from '../types';

export const useGoogleAuth = () => {
  const [authState, setAuthState] = useState<AuthState>(() => 
    googleAuthService.getAuthState()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to auth state changes
    const checkAuth = async () => {
      try {
        const state = googleAuthService.getAuthState();
        setAuthState(state);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication error');
      }
    };

    // Check auth on mount
    checkAuth();

    // Set up periodic token refresh check (every minute)
    const interval = setInterval(() => {
      if (googleAuthService.isAuthenticated()) {
        googleAuthService.getValidAccessToken().catch(() => {
          // Token invalid - update state
          setAuthState(googleAuthService.getAuthState());
        });
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const signIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const state = await googleAuthService.signIn();
      setAuthState(state);
      return state;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);
      await googleAuthService.signOut();
      setAuthState(googleAuthService.getAuthState());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign out failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getValidToken = async () => {
    try {
      return await googleAuthService.getValidAccessToken();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Token validation failed');
      return null;
    }
  };

  return {
    authState,
    loading,
    error,
    signIn,
    signOut,
    getValidToken,
    isAuthenticated: authState.isAuthenticated
  };
};
```

**File: src/components/Auth/GoogleOAuthButton.tsx**
```typescript
import React from 'react';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';

interface GoogleOAuthButtonProps {
  className?: string;
  variant?: 'signin' | 'signout';
}

export const GoogleOAuthButton: React.FC<GoogleOAuthButtonProps> = ({
  className = '',
  variant = 'signin'
}) => {
  const { signIn, signOut, authState, loading, error } = useGoogleAuth();

  const handleClick = async () => {
    try {
      if (variant === 'signin' && !authState.isAuthenticated) {
        await signIn();
      } else if (variant === 'signout' && authState.isAuthenticated) {
        await signOut();
      }
    } catch (err) {
      console.error('OAuth operation failed:', err);
    }
  };

  if (loading) {
    return (
      <button
        disabled
        className={`flex items-center justify-center px-4 py-2 bg-gray-200 rounded-lg ${className}`}
      >
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
        Loading...
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`flex items-center justify-center px-4 py-2 rounded-lg transition-all duration-200 ${
          variant === 'signin'
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-gray-600 hover:bg-gray-700 text-white'
        } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <img
          src="https://www.google.com/favicon.ico"
          alt="Google"
          className="w-5 h-5 mr-2"
        />
        {variant === 'signin' ? 'Sign in with Google' : 'Sign out'}
      </button>
      
      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
      
      {authState.isAuthenticated && authState.user && (
        <div className="mt-3 flex items-center text-sm text-gray-600">
          <img
            src={authState.user.picture}
            alt={authState.user.name}
            className="w-6 h-6 rounded-full mr-2"
          />
          <span>{authState.user.name}</span>
        </div>
      )}
    </div>
  );
};

export default GoogleOAuthButton;
```

**File: src/components/Auth/AuthContext.tsx**
```typescript
import React, { createContext, useContext, ReactNode } from 'react';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import { AuthState } from '../../types';

interface AuthContextType {
  authState: AuthState;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<AuthState>;
  signOut: () => Promise<void>;
  getValidToken: () => Promise<string | null>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useGoogleAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};
```

### ACCEPTANCE CRITERIA FOR PHASE 2:

1. ✅ Google Identity Services loads successfully
2. ✅ Sign in button initiates OAuth 2.0 popup
3. ✅ User can authenticate and receives access token
4. ✅ User profile (email, name, picture) is fetched and stored
5. ✅ Access token validated on each API call
6. ✅ Sign out revokes token and clears session
7. ✅ Auth state persists across page reloads (sessionStorage)
8. ✅ Error handling for failed authentication attempts
9. ✅ No tokens exposed in localStorage (security requirement)
10. ✅ TypeScript compiles with zero errors
11. ✅ Component renders without errors in dev mode
12. ✅ OAuth flow works in production build
13. ✅ Google Drive scope properly requested
14. ✅ Token auto-refresh before expiry (re-authentication prompt)
15. ✅ CSP headers configured for Google domains in index.html

### TESTING CHECKLIST:

```bash
# Run these commands to verify:
norm run dev # Start dev server

# Manual tests:
# 1. Click Sign in with Google button
# 2. Complete OAuth flow
# 3. Verify user profile displays
# 4. Check access token is stored in memory (not localStorage)
# 5. Refresh page - verify still authenticated
# 6. Click Sign out - verify token revoked
# 7. Attempt to get Google Drive files - verify token works
```

### SECURITY REQUIREMENTS:

- Sessions expire after 1 hour (Google's default)
- HTTPS required in production (OAuth requirement)
- State parameter implemented to prevent CSRF
- Token revocation on sign out
- No sensitive data in browser storage
- Error messages don't leak token information
- Content Security Policy configured for accounts.google.com

### DEPENDENCIES ADDED:

- google-auth-library-browser (if needed for advanced features)
- No additional dependencies beyond Phase 1