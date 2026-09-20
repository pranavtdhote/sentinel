'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserRole } from '@/lib/types/database';

export interface AuthUser {
  sub: string;
  email: string;
  role: UserRole;
  groups: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  signIn: async () => ({ success: false }),
  signOut: async () => {},
  refreshToken: async () => false,
});

const TOKEN_KEY = 'sentinel_id_token';
const ACCESS_TOKEN_KEY = 'sentinel_access_token';
const REFRESH_TOKEN_KEY = 'sentinel_refresh_token';
const USER_KEY = 'sentinel_user';
const LEGACY_TOKEN_KEY = 'sentinel_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Clear all auth tokens from browser storage
  const clearSession = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(LEGACY_TOKEN_KEY);
    }
    setUser(null);
    setToken(null);
  }, []);

  // Refresh token mechanism
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!storedRefreshToken) return false;

    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });

      if (!res.ok) {
        clearSession();
        return false;
      }

      const body = await res.json();
      if (body.success && body.data?.idToken) {
        const newIdToken = body.data.idToken;
        localStorage.setItem(TOKEN_KEY, newIdToken);
        localStorage.setItem(LEGACY_TOKEN_KEY, newIdToken);
        if (body.data.accessToken) {
          localStorage.setItem(ACCESS_TOKEN_KEY, body.data.accessToken);
        }
        setToken(newIdToken);
        return true;
      }

      clearSession();
      return false;
    } catch {
      clearSession();
      return false;
    }
  }, [clearSession]);

  // Initial session hydration and verification
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }

      const storedToken = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      if (!storedToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      // Populate preliminary state from cache for fast initial paint
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (isMounted) {
            setUser(parsed);
            setToken(storedToken);
          }
        } catch {
          // ignore corrupted cache
        }
      }

      // Verify token with backend
      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (res.ok) {
          const body = await res.json();
          if (body.success && body.data && isMounted) {
            const verifiedUser: AuthUser = {
              sub: body.data.userId?.replace(/^usr-/, '') || 'unknown',
              email: body.data.email,
              role: body.data.role,
              groups: [body.data.role],
            };
            setUser(verifiedUser);
            setToken(storedToken);
            localStorage.setItem(USER_KEY, JSON.stringify(verifiedUser));
          }
        } else if (res.status === 401) {
          // Try refreshing token
          const refreshed = await refreshToken();
          if (!refreshed && isMounted) {
            clearSession();
          }
        }
      } catch (e) {
        console.warn('Network error during auth verification:', e);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [clearSession, refreshToken]);

  // Sign In function
  const signIn = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const body = await res.json();

      if (!res.ok || !body.success) {
        setIsLoading(false);
        return {
          success: false,
          error: body.error?.message || 'Authentication failed. Check credentials.',
        };
      }

      const { idToken, accessToken, refreshToken: newRefreshToken, user: authenticatedUser } = body.data;

      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, idToken);
        localStorage.setItem(LEGACY_TOKEN_KEY, idToken);
        if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        if (newRefreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
        localStorage.setItem(USER_KEY, JSON.stringify(authenticatedUser));
      }

      setUser(authenticatedUser);
      setToken(idToken);
      setIsLoading(false);

      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return {
        success: false,
        error: err?.message || 'Unable to connect to Sentinel authentication service.',
      };
    }
  };

  // Sign Out function
  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } finally {
      clearSession();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        token,
        isAuthenticated: Boolean(user && token),
        isLoading,
        signIn,
        signOut,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
