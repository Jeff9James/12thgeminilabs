export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  idToken: string;
  accessToken?: string;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  googleId: string;
  picture?: string;
  quotaUsed?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (idToken: string, accessToken?: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  clearError: () => void;
}
