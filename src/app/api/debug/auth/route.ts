import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabase } from '@/supabaseClient';
import { type JWTUserPayload } from '@/services/hikerApi';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({
        error: 'No token found',
        debug: 'User is not logged in'
      });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.NEXT_PUBLIC_JWT_SECRET!) as JWTUserPayload;
    
    // Get user details
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, is_admin, is_active')
      .eq('id', decoded.user_id)
      .single();

    if (error) {
      return NextResponse.json({
        error: 'Database error',
        debug: error.message,
        user_id: decoded.user_id
      });
    }

    if (!user) {
      return NextResponse.json({
        error: 'User not found',
        debug: 'User does not exist in database',
        user_id: decoded.user_id
      });
    }

    return NextResponse.json({
      debug: 'User authentication details',
      token_user_id: decoded.user_id,
      database_user: {
        id: user.id,
        email: user.email,
        is_admin: user.is_admin,
        is_active: user.is_active
      },
      is_admin_check: user.is_admin === true,
      is_active_check: user.is_active === true,
      can_access_admin: user.is_admin === true && user.is_active === true
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Token verification failed',
      debug: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
