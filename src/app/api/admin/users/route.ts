import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/supabaseClient';
import { requireAdmin } from '@/utils/adminAuth';

async function getAllUsers(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '100'); // Increased default to 100
    const search = url.searchParams.get('search') || '';
    
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('users')
      .select(`
        id,
        email,
        username,
        coins,
        is_active,
        is_admin,
        created_at,
        updated_at,
        last_login
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Add search filter if provided
    if (search) {
      query = query.or(`email.ilike.%${search}%,username.ilike.%${search}%`);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (search) {
      countQuery = countQuery.or(`email.ilike.%${search}%,username.ilike.%${search}%`);
    }
    
    const { count: totalCount } = await countQuery;

    return NextResponse.json({
      users: users || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Admin get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = requireAdmin(getAllUsers);
