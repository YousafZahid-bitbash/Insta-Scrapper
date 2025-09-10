'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  adminOnly?: boolean;
}

export default function AuthGuard({ children, requireAuth = false, adminOnly = false }: AuthGuardProps) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  // user state is not used, so remove it
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/me');
        if (res.ok) {
          const userData = await res.json();
          // setUser(userData); // user is not used
          setIsAuthenticated(true);
          setIsAdmin(!!userData.is_admin);
          setIsBanned(false);
        } else {
          const err = await res.json();
          if (err.error === 'Account suspended') {
            setIsBanned(true);
          }
          setIsAuthenticated(false);
          setIsAdmin(false);
          // setUser(null); // user is not used
        }
      } catch (error) {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setIsBanned(false);
  // setUser(null); // user is not used
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [adminOnly]);

  useEffect(() => {
    if (loading) return;

    // If user is banned, redirect to login with banned flag
    if (isBanned) {
      router.replace('/auth/login?banned=true');
      return;
    }

    if (requireAuth && !isAuthenticated) {
      router.replace('/auth/login');
      return;
    }

    if (adminOnly && (!isAuthenticated || !isAdmin)) {
      router.replace('/auth/login');
      return;
    }
  }, [loading, isAuthenticated, isAdmin, isBanned, requireAuth, adminOnly, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isBanned) {
    return null; // Will redirect to login with banned flag
  }

  if (requireAuth && !isAuthenticated) {
    return null; // Will redirect
  }

  if (adminOnly && (!isAuthenticated || !isAdmin)) {
    return null; // Will redirect
  }

  return <>{children}</>;
}
