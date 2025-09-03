import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabase } from '@/supabaseClient';
import { type JWTUserPayload } from '@/services/hikerApi';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 [Debug] Starting authentication debug...');
    
    const token = req.cookies.get('token')?.value;
    
    if (!token) {
      console.log('❌ [Debug] No token found');
      return NextResponse.json({
        error: 'No token found',
        debug: 'User is not logged in',
        cookies: Object.fromEntries(req.cookies.getAll().map(c => [c.name, c.value]))
      });
    }

    console.log('🔍 [Debug] Token found, length:', token.length);

    // Verify JWT
    const decoded = jwt.verify(token, process.env.NEXT_PUBLIC_JWT_SECRET!) as JWTUserPayload;
    console.log('🔍 [Debug] JWT decoded successfully');
    
    // Get user details
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, is_admin, is_active')
      .eq('id', decoded.user_id)
      .single();

    console.log('🔍 [Debug] Database query result:', { user, error });

    if (error) {
      console.log('❌ [Debug] Database error:', error);
      return NextResponse.json({
        error: 'Database error',
        debug: error.message,
        user_id: decoded.user_id,
        jwt_secret_exists: !!process.env.NEXT_PUBLIC_JWT_SECRET
      });
    }

    if (!user) {
      console.log('❌ [Debug] User not found');
      return NextResponse.json({
        error: 'User not found',
        debug: 'User does not exist in database',
        user_id: decoded.user_id,
        jwt_secret_exists: !!process.env.NEXT_PUBLIC_JWT_SECRET
      });
    }

    // Check if is_admin column exists
    const { data: columnCheck } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'users')
      .eq('column_name', 'is_admin');

    console.log('✅ [Debug] Debug completed successfully');
    
    return NextResponse.json({
      debug: 'User authentication details',
      token_user_id: decoded.user_id,
      database_user: {
        id: user.id,
        email: user.email,
        is_admin: user.is_admin,
        is_active: user.is_active
      },
      checks: {
        is_admin_check: user.is_admin === true,
        is_active_check: user.is_active === true,
        can_access_admin: user.is_admin === true && user.is_active === true,
        is_admin_column_exists: columnCheck && columnCheck.length > 0
      },
      environment: {
        jwt_secret_exists: !!process.env.NEXT_PUBLIC_JWT_SECRET,
        node_env: process.env.NODE_ENV
      }
    });

  } catch (error) {
    console.log('❌ [Debug] Token verification failed:', error);
    return NextResponse.json({
      error: 'Token verification failed',
      debug: error instanceof Error ? error.message : 'Unknown error',
      jwt_secret_exists: !!process.env.NEXT_PUBLIC_JWT_SECRET
    });
  }
}
