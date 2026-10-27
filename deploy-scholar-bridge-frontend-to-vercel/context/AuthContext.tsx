'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, User, UserRole, LoginRequest, SignupRequest } from '@/api/authApi';
import { axiosClient } from '@/api/axiosClient';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<User>;
  signup: (data: SignupRequest) => Promise<User>;
  logout: () => void;
  clearError: () => void;
  refreshUser: () => Promise<void>;
  isStudent: boolean;
  isFaculty: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'scholarbridge_token';
const USER_KEY = 'scholarbridge_user';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from localStorage on browser mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      if (storedToken && storedUser) {
        const parsedUser: User = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        axiosClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
    } catch (err) {
      console.error('Failed to restore auth session from storage', err);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = () => setError(null);

  const login = async (credentials: LoginRequest): Promise<User> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.login(credentials);
      const { token: receivedToken, user: receivedUser } = response;

      setToken(receivedToken);
      setUser(receivedUser);

      localStorage.setItem(TOKEN_KEY, receivedToken);
      localStorage.setItem(USER_KEY, JSON.stringify(receivedUser));

      axiosClient.defaults.headers.common['Authorization'] = `Bearer ${receivedToken}`;

      return receivedUser;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Login failed. Please check your credentials.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: SignupRequest): Promise<User> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.signup(data);
      const { token: receivedToken, user: receivedUser } = response;

      setToken(receivedToken);
      setUser(receivedUser);

      localStorage.setItem(TOKEN_KEY, receivedToken);
      localStorage.setItem(USER_KEY, JSON.stringify(receivedUser));

      axiosClient.defaults.headers.common['Authorization'] = `Bearer ${receivedToken}`;

      return receivedUser;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Registration failed. Please try again.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setError(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    delete axiosClient.defaults.headers.common['Authorization'];
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const updatedUser = await authApi.getMe();
      setUser(updatedUser);
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    } catch (err) {
      console.warn('Could not refresh user profile from server', err);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    error,
    login,
    signup,
    logout,
    clearError,
    refreshUser,
    isStudent: user?.role === 'STUDENT',
    isFaculty: user?.role === 'FACULTY',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
