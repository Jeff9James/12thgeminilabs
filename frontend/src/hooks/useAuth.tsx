import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { apiClient } from '../services/api';
import { User } from '@shared/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (idToken: string, accessToken?: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if token needs refresh (within 5 minutes of expiry)
  const isTokenExpiringSoon = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      const timeUntilExpiry = payload.exp - now;
      return timeUntilExpiry < 300; // 5 minutes
    } catch {
      return true;
    }
  };

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    // Call backend logout to clear cookies
    apiClient.post('/auth/logout').catch(console.error);
  }, []);

  const refreshToken = async () => {
    try {
      const refreshTokenValue = localStorage.getItem('refreshToken');
      if (!refreshTokenValue) {
        logout();
        return;
      }

      const response = await apiClient.post<{ token: string }>('/auth/refresh', { 
        refreshToken: refreshTokenValue 
      });

      if (response.success && response.data) {
        localStorage.setItem('token', response.data.token);
        await checkAuth(); // Re-check auth with new token
      } else {
        logout();
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
    }
  };

  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const refreshTokenValue = localStorage.getItem('refreshToken');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        // Check if token needs refresh
        if (isTokenExpiringSoon(token) && refreshTokenValue) {
          await refreshToken();
          return;
        }

        setUser(JSON.parse(storedUser));
        
        // Verify token with backend
        const response = await apiClient.get<User>('/auth/me');
        if (response.success && response.data) {
          setUser(response.data);
          localStorage.setItem('user', JSON.stringify(response.data));
        } else {
          // Token is invalid, try to refresh
          if (refreshTokenValue) {
            await refreshToken();
          } else {
            logout();
          }
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logout]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (idToken: string, accessToken?: string) => {
    try {
      console.log('[Auth] login called with idToken (length:', idToken.length, ')');
      if (accessToken) {
        console.log('[Auth] accessToken provided (length:', accessToken.length, ')');
      }

      console.log('[Auth] Sending request to /auth/google-callback');
      const response = await apiClient.post<{
        user: User;
        token: string;
        refreshToken: string;
      }>('/auth/google-callback', {
        idToken,
        accessToken
      });

      console.log('[Auth] Backend response received');
      console.log('[Auth] Response success:', response.success);
      console.log('[Auth] Response data present:', !!response.data);

      if (response.success && response.data) {
        console.log('[Auth] Setting user in state:', response.data.user.email || response.data.user.id);
        setUser(response.data.user);

        // Store tokens in localStorage
        console.log('[Auth] Storing tokens in localStorage');
        console.log('[Auth] Token length:', response.data.token.length);
        console.log('[Auth] Refresh token length:', response.data.refreshToken.length);

        localStorage.setItem('token', response.data.token);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        console.log('[Auth] Login completed successfully');
      } else {
        console.error('[Auth] Backend response indicates failure');
        console.error('[Auth] Response success:', response.success);
        console.error('[Auth] Response data:', response.data);
        throw new Error('Backend login failed');
      }
    } catch (error) {
      console.error('[Auth] Login request failed');
      console.error('[Auth] Error:', error);

      // Log more details about the error
      if (error instanceof Error) {
        console.error('[Auth] Error message:', error.message);
        console.error('[Auth] Error stack:', error.stack);
      }

      // Check if it's a network error
      if (error && typeof error === 'object') {
        if ('message' in error) {
          console.error('[Auth] Error message:', error.message);
        }
        if ('code' in error) {
          console.error('[Auth] Error code:', error.code);
        }
        if ('status' in error) {
          console.error('[Auth] HTTP status:', error.status);
        }
        if ('response' in error) {
          const err = error as { response?: { data?: unknown; status?: number } };
          console.error('[Auth] Response data:', err.response?.data);
          console.error('[Auth] Response status:', err.response?.status);
        }
      }

      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}