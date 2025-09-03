import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/supabaseClient';
import { requireAdmin } from '@/utils/adminAuth';

async function getUserStats(_req: NextRequest) {
  try {
    // Get total users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get active users
    const { count: activeUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get admin users (temporary: count as 0 until is_admin column exists)
    const adminUsers = 0;

    // Get users registered today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // Get users with login in last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { count: activeWeekUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('last_login', weekAgo.toISOString());

    // Get total coins in system
    const { data: coinsData } = await supabase
      .from('users')
      .select('coins');

    const totalCoins = coinsData?.reduce((sum, user) => sum + (user.coins || 0), 0) || 0;

    // Get recent users
    const { data: recentUsers } = await supabase
      .from('users')
      .select('id, email, username, created_at, coins, last_login')
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        adminUsers: adminUsers || 0,
        todayUsers: todayUsers || 0,
        activeWeekUsers: activeWeekUsers || 0,
        totalCoins
      },
      recentUsers: recentUsers || []
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = requireAdmin(getUserStats);
