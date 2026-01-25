import { createContext, useContext } from 'react';
import { User } from '@shared/types';

// SIMPLIFIED: Demo mode - no authentication required
// All users share a single demo user account

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (idToken: string, accessToken?: string) => Promise<void>;
  loginWithCode: (code: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo user that matches the backend
const DEMO_USER: User = {
  id: 'demo-user-id',
  email: 'demo@example.com',
  name: 'Demo User',
  googleId: 'demo-google-id',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // In demo mode, always return authenticated with demo user
  // No loading state, no API calls, instant access
  
  const login = async () => {
    console.log('[Auth] Demo mode - no login required');
  };

  const loginWithCode = async () => {
    console.log('[Auth] Demo mode - no login required');
  };

  const logout = () => {
    console.log('[Auth] Demo mode - logout is no-op');
  };

  const refreshToken = async () => {
    console.log('[Auth] Demo mode - no token refresh needed');
  };

  return (
    <AuthContext.Provider
      value={{
        user: DEMO_USER,
        isAuthenticated: true,
        isLoading: false,
        login,
        loginWithCode,
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