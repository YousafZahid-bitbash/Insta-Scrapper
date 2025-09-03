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
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return null;
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.NEXT_PUBLIC_JWT_SECRET!) as JWTUserPayload;
    
    // Check if user exists and is admin
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, is_admin')
      .eq('id', decoded.user_id)
      .eq('is_active', true)
      .eq('is_admin', true)
      .single();

    if (error || !user) {
      return null;
    }

    return {
      user_id: user.id,
      email: user.email,
      is_admin: user.is_admin
    };
  } catch (error) {
    console.error('Admin verification error:', error);
    return null;
  }
}

export function requireAdmin(handler: (req: NextRequest, admin: AdminUser) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const admin = await verifyAdminToken(req);
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return handler(req, admin);
  };
}
