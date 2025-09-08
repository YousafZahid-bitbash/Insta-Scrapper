import { NextRequest, NextResponse } from 'next/server';

import { supabase } from '../../../supabaseClient';
import { verifyJWT } from '../../../services/hikerApi';

type JWTUserPayload = { user_id: string; email: string; [key: string]: any };

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify JWT and extract user_id

    let payload: JWTUserPayload | null = null;
    try {
      payload = await verifyJWT(token);
    } catch (err) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { user_id } = payload || {};
    if (!user_id) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }

    // Fetch user from DB
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, username, is_admin, is_active, coins')
      .eq('id', user_id)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If user is banned, treat as not authenticated
    if (!user.is_active) {
      return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
    }

    // Return user info (never send password hash)
    return NextResponse.json({
      id: user.id,
      email: user.email,
      username: user.username,
      is_admin: user.is_admin,
      coins: user.coins,
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
