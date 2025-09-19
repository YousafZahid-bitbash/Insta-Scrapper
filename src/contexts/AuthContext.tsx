'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  username: string;
  is_admin: boolean;
  coins: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const router = useRouter();

  const fetchUser = async (retryCount = 0) => {
    if (isFetching) return; // Prevent multiple simultaneous calls
    
    setIsFetching(true);
    try {
      const res = await fetch('/api/me', { 
        credentials: 'include',
        cache: 'no-store', // Ensure fresh data
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        setIsAuthenticated(true);
        setIsAdmin(!!userData.is_admin);
        setIsBanned(false);
        console.log('[AuthContext] Successfully authenticated user:', userData.email);
      } else {
        const err = await res.json();
        console.log('[AuthContext] Authentication failed:', res.status, err);
        
        // If it's a 401 and we haven't retried yet, wait a bit and retry once
        if (res.status === 401 && retryCount === 0) {
          console.log('[AuthContext] Retrying authentication in 100ms...');
          setIsFetching(false);
          setTimeout(() => fetchUser(1), 100);
          return;
        }
        
        if (err.error === 'Account suspended') {
          setIsBanned(true);
        }
        setUser(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('[AuthContext] Error fetching user:', error);
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setIsBanned(false);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const refetchUser = async () => {
    setLoading(true);
    await fetchUser();
  };

  useEffect(() => {
    fetchUser();
  }, []);

  // Handle banned users
  useEffect(() => {
    if (isBanned && !loading) {
      router.replace('/auth/login?banned=true');
    }
  }, [isBanned, loading, router]);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated,
      isAdmin,
      isBanned,
      refetchUser
    }}>
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
