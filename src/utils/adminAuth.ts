import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabase } from '@/supabaseClient';
import { type JWTUserPayload } from '@/services/hikerApi';

export interface AdminUser {
  user_id: string;
  email: string;
  is_admin: boolean;
}

export async function verifyAdminToken(request: NextRequest): Promise<AdminUser | null> {
  try {
    console.log('🔍 [AdminAuth] Starting admin verification...');
    
    const token = request.cookies.get('token')?.value;
    console.log('🔍 [AdminAuth] Token found:', token ? 'YES' : 'NO');
    
    if (!token) {
      console.log('❌ [AdminAuth] No token found in cookies');
      return null;
    }

    // Verify JWT
    console.log('🔍 [AdminAuth] Verifying JWT token...');
    const decoded = jwt.verify(token, process.env.NEXT_PUBLIC_JWT_SECRET!) as JWTUserPayload;
    console.log('🔍 [AdminAuth] JWT decoded successfully, user_id:', decoded.user_id);
    console.log('🔍 [AdminAuth] JWT email:', decoded.email);
    
    // Check if user exists and is admin
    console.log('🔍 [AdminAuth] Querying database for user...');
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, is_admin')
      .eq('id', decoded.user_id)
      .eq('is_active', true)
      .eq('is_admin', true)
      .single();

    console.log('🔍 [AdminAuth] Database query result:');
    console.log('  - Error:', error);
    console.log('  - User data:', user);

    if (error) {
      console.log('❌ [AdminAuth] Database error:', error);
      return null;
    }

    if (!user) {
      console.log('❌ [AdminAuth] User not found or not admin');
      
      // Let's also check what the user actually looks like in the database
      const { data: userCheck, error: checkError } = await supabase
        .from('users')
        .select('id, email, is_admin, is_active')
        .eq('id', decoded.user_id)
        .single();
      
      console.log('🔍 [AdminAuth] User check (without admin filter):');
      console.log('  - Error:', checkError);
      console.log('  - User data:', userCheck);
      
      return null;
    }

    console.log('✅ [AdminAuth] Admin verification successful');
    return {
      user_id: user.id,
      email: user.email,
      is_admin: user.is_admin
    };
  } catch (error) {
    console.error('❌ [AdminAuth] Admin verification error:', error);
    return null;
  }
}

export function requireAdmin(handler: (req: NextRequest, admin: AdminUser) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    console.log('🔒 [RequireAdmin] Checking admin access for:', req.url);
    
    const admin = await verifyAdminToken(req);
    
    if (!admin) {
      console.log('❌ [RequireAdmin] Admin access denied');
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    console.log('✅ [RequireAdmin] Admin access granted for:', admin.email);
    return handler(req, admin);
  };
}
