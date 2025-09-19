'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  adminOnly?: boolean;
}

export default function AuthGuard({ children, requireAuth = false, adminOnly = false }: AuthGuardProps) {
  const { loading, isAuthenticated, isAdmin, isBanned } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (requireAuth && !isAuthenticated) {
      router.replace('/auth/login');
      return;
    }

    if (adminOnly && (!isAuthenticated || !isAdmin)) {
      router.replace('/auth/login');
      return;
    }
  }, [loading, isAuthenticated, isAdmin, requireAuth, adminOnly, router]);

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
