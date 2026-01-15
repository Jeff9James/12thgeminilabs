import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { apiClient } from '../services/api';
import { User } from '../../shared/types';

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

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        // Check if token needs refresh
        if (isTokenExpiringSoon(token) && refreshToken) {
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
          if (refreshToken) {
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
  };

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

  const login = async (idToken: string, accessToken?: string) => {
    try {
      const response = await apiClient.post<{ 
        user: User; 
        token: string; 
        refreshToken: string; 
      }>('/auth/google-callback', { 
        idToken, 
        accessToken 
      });

      if (response.success && response.data) {
        setUser(response.data.user);
        
        // Store tokens in localStorage
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}