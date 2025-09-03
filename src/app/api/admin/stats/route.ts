import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/supabaseClient';
import { requireAdmin } from '@/utils/adminAuth';

async function getUserStats(_req: NextRequest) {
  try {
    console.log('📊 [Admin Stats] Starting stats calculation...');
    
    // Get total users (exclude admin users)
    console.log('📊 [Admin Stats] Getting total users...');
    const { count: totalUsers, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_admin', false);

    if (usersError) {
      console.error('📊 [Admin Stats] Error getting total users:', usersError);
    }

    // Get active users (exclude admin users)
    console.log('📊 [Admin Stats] Getting active users...');
    const { count: activeUsers, error: activeError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('is_admin', false);

    if (activeError) {
      console.error('📊 [Admin Stats] Error getting active users:', activeError);
    }

    // Get admin users
    console.log('📊 [Admin Stats] Getting admin users...');
    const { count: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_admin', true);

    if (adminError) {
      console.error('📊 [Admin Stats] Error getting admin users:', adminError);
      console.log('📊 [Admin Stats] This might be because is_admin column does not exist');
    }

    // Get users registered today (exclude admin users)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())
      .eq('is_admin', false);

    // Get users with login in last 7 days (exclude admin users)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { count: activeWeekUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('last_login', weekAgo.toISOString())
      .eq('is_admin', false);

    // Get total coins in system (exclude admin users)
    const { data: coinsData } = await supabase
      .from('users')
      .select('coins')
      .eq('is_admin', false);

    const totalCoins = coinsData?.reduce((sum, user) => sum + (user.coins || 0), 0) || 0;

    // Get recent users (exclude admin users)
    const { data: recentUsers } = await supabase
      .from('users')
      .select('id, email, username, created_at, coins, last_login, is_active')
      .eq('is_admin', false)
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
