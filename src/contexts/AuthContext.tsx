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
  logout: () => Promise<void>;
  checkBanStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [banCheckInterval, setBanCheckInterval] = useState<NodeJS.Timeout | null>(null);
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

  // Function to handle user logout and cleanup
  const handleUserLogout = async () => {
    try {
      // Call logout API to clear server-side session
      await fetch('/api/logout', { 
        method: 'POST', 
        credentials: 'include' 
      });
    } catch (error) {
      console.error('[AuthContext] Error during logout:', error);
    } finally {
      // Clear client-side state regardless of API call success
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setIsBanned(false);
      
      // Clear localStorage
      localStorage.removeItem('user_id');
      localStorage.removeItem('is_admin');
      
      // Clear any existing ban check interval
      if (banCheckInterval) {
        clearInterval(banCheckInterval);
        setBanCheckInterval(null);
      }
      
      // Redirect to login with ban flag
      router.replace('/auth/login?banned=true');
    }
  };

  // Function to check ban status immediately
  const checkBanStatus = async () => {
    if (!isAuthenticated || isAdmin) return false; // Don't check for admins
    
    try {
      const res = await fetch('/api/me', { 
        credentials: 'include',
        cache: 'no-store'
      });
      
      if (!res.ok) {
        const err = await res.json();
        if (err.error === 'Account suspended') {
          console.log('[AuthContext] User banned detected, logging out...');
          await handleUserLogout();
          return true; // User was banned
        }
      }
      return false; // User is not banned
    } catch (error) {
      console.error('[AuthContext] Error checking ban status:', error);
      return false;
    }
  };

  // Function to start periodic ban checking for authenticated users
  const startBanCheck = () => {
    if (banCheckInterval) return; // Already running
    
    const interval = setInterval(async () => {
      await checkBanStatus();
    }, 30000); // Check every 30 seconds
    
    setBanCheckInterval(interval);
  };

  // Function to stop ban checking
  const stopBanCheck = () => {
    if (banCheckInterval) {
      clearInterval(banCheckInterval);
      setBanCheckInterval(null);
    }
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

  // Start/stop ban checking based on authentication status
  useEffect(() => {
    if (isAuthenticated && !isAdmin && !isBanned) {
      startBanCheck();
    } else {
      stopBanCheck();
    }
    
    // Cleanup on unmount
    return () => {
      stopBanCheck();
    };
  }, [isAuthenticated, isAdmin, isBanned]);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated,
      isAdmin,
      isBanned,
      refetchUser,
      logout: handleUserLogout,
      checkBanStatus
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
