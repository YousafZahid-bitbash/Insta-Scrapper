'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabaseClient';

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
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setIsAuthenticated(true);
          
          // Always check user status from database
          const { data: profile } = await supabase
            .from('users')
            .select('is_admin, is_active')
            .eq('id', session.user.id)
            .single();
          
          if (profile) {
            setIsAdmin(profile.is_admin || false);
            setIsBanned(!profile.is_active); // is_active = false means banned
            
            // If user is banned, sign them out immediately and clear localStorage
            if (!profile.is_active) {
              await supabase.auth.signOut();
              if (typeof window !== 'undefined') {
                localStorage.clear();
                sessionStorage.clear();
              }
              setIsAuthenticated(false);
              setIsAdmin(false);
              setIsBanned(true);
              return;
            }
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
        setIsAdmin(false);
        setIsBanned(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: unknown) => {
      if (event === 'SIGNED_IN' && session) {
        setIsAuthenticated(true);
      } else if (event === 'SIGNED_OUT') {
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
        setIsAuthenticated(false);
        setIsAdmin(false);
        setIsBanned(false);
      }
    });

    return () => subscription.unsubscribe();
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
