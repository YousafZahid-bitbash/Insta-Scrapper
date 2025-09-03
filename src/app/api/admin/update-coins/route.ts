import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/supabaseClient';
import { requireAdmin } from '@/utils/adminAuth';

async function updateUserCoins(req: NextRequest) {
  try {
    const { userId, coins, action } = await req.json();

    if (!userId || typeof coins !== 'number') {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    const updateData: { coins: number } = { coins: 0 };

    if (action === 'set') {
      // Set absolute value
      updateData.coins = coins;
    } else if (action === 'add') {
      // Add to current balance
      const { data: user } = await supabase
        .from('users')
        .select('coins')
        .eq('id', userId)
        .single();

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      updateData.coins = (user.coins || 0) + coins;
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "set" or "add"' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, email, username, coins')
      .single();

    if (error) {
      console.error('Error updating user coins:', error);
      return NextResponse.json(
        { error: 'Failed to update user coins' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'User coins updated successfully',
      user: data
    });
  } catch (error) {
    console.error('Admin update coins error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = requireAdmin(updateUserCoins);
