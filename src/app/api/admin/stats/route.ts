import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/supabaseClient';
import { requireAdmin } from '@/utils/adminAuth';

async function getUserStats(_req: NextRequest) {
  try {
    console.log('📊 [Admin Stats] Starting comprehensive stats calculation...');
    
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

    // Get extraction statistics
    console.log('📊 [Admin Stats] Getting extraction statistics...');
    const { count: totalExtractions, error: extractionsError } = await supabase
      .from('extractions')
      .select('*', { count: 'exact', head: true });

    const { count: completedExtractions } = await supabase
      .from('extractions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    const { count: failedExtractions } = await supabase
      .from('extractions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed');

    const { count: runningExtractions } = await supabase
      .from('extractions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'running');

    // Get extraction types breakdown
    const { data: extractionTypes } = await supabase
      .from('extractions')
      .select('extraction_type, status')
      .eq('status', 'completed');

    const extractionTypeStats = extractionTypes?.reduce((acc: Record<string, number>, extraction) => {
      acc[extraction.extraction_type] = (acc[extraction.extraction_type] || 0) + 1;
      return acc;
    }, {}) || {};

    // Get revenue statistics from payments
    console.log('📊 [Admin Stats] Getting revenue statistics...');
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select('amount, status, created_at')
      .eq('status', 'completed');

    if (paymentsError) {
      console.error('📊 [Admin Stats] Error getting payments:', paymentsError);
    }

    const totalRevenue = paymentsData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    const totalPurchases = paymentsData?.length || 0;

    // Get revenue by month for the last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const { data: monthlyPayments } = await supabase
      .from('payments')
      .select('amount, created_at')
      .eq('status', 'completed')
      .gte('created_at', twelveMonthsAgo.toISOString())
      .order('created_at', { ascending: true });

    // Process monthly revenue data
    const monthlyRevenue = monthlyPayments?.reduce((acc: Record<string, number>, payment) => {
      const date = new Date(payment.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      acc[monthKey] = (acc[monthKey] || 0) + (payment.amount || 0);
      return acc;
    }, {}) || {};

    // Get recent users (exclude admin users)
    const { data: recentUsers } = await supabase
      .from('users')
      .select('id, email, username, created_at, coins, last_login, is_active')
      .eq('is_admin', false)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get recent extractions
    const { data: recentExtractions } = await supabase
      .from('extractions')
      .select('id, user_id, extraction_type, status, progress, coins_spent, requested_at')
      .order('requested_at', { ascending: false })
      .limit(10);

    // Get user growth data for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: userGrowthData } = await supabase
      .from('users')
      .select('created_at')
      .eq('is_admin', false)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    // Process daily user growth
    const dailyUserGrowth = userGrowthData?.reduce((acc: Record<string, number>, user) => {
      const date = new Date(user.created_at);
      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      acc[dayKey] = (acc[dayKey] || 0) + 1;
      return acc;
    }, {}) || {};

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        adminUsers: adminUsers || 0,
        todayUsers: todayUsers || 0,
        activeWeekUsers: activeWeekUsers || 0,
        totalCoins,
        totalExtractions: totalExtractions || 0,
        completedExtractions: completedExtractions || 0,
        failedExtractions: failedExtractions || 0,
        runningExtractions: runningExtractions || 0,
        totalRevenue,
        totalPurchases,
        extractionTypeStats
      },
      charts: {
        monthlyRevenue,
        dailyUserGrowth
      },
      recentUsers: recentUsers || [],
      recentExtractions: recentExtractions || []
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
