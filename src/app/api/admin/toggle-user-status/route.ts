import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../supabaseClient';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET || 'your-secret-key';

async function verifyAdminToken(token: string): Promise<{ userId: string; isAdmin: boolean }> {
  try {
    console.log('🔐 [VerifyAdminToken] Verifying JWT token...');
    const decoded = jwt.verify(token, JWT_SECRET) as { user_id: string };
    console.log('🔐 [VerifyAdminToken] JWT decoded successfully, user_id:', decoded.user_id);
    
    const { data: user, error } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', decoded.user_id)
      .single();

    console.log('🔐 [VerifyAdminToken] Database query result:');
    console.log('  - Error:', error);
    console.log('  - User:', user);

    if (error || !user || !user.is_admin) {
      console.log('❌ [VerifyAdminToken] Authorization failed');
      throw new Error('Unauthorized');
    }

    console.log('✅ [VerifyAdminToken] Admin verification successful');
    return { userId: decoded.user_id, isAdmin: true };
  } catch (error) {
    console.error('❌ [VerifyAdminToken] Token verification failed:', error);
    throw new Error('Unauthorized');
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [ToggleUserStatus] Starting user status toggle...');
    
    // Get token from cookies or Authorization header
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    console.log('🔍 [ToggleUserStatus] Token found:', token ? 'YES' : 'NO');
    
    if (!token) {
      console.log('❌ [ToggleUserStatus] No token provided');
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify admin access
    console.log('🔍 [ToggleUserStatus] Verifying admin token...');
    await verifyAdminToken(token);
    console.log('✅ [ToggleUserStatus] Admin verification successful');

    const body = await request.json();
    console.log('🔍 [ToggleUserStatus] Request body:', body);
    const { userId, isActive } = body;

    if (!userId || typeof isActive !== 'boolean') {
      console.log('❌ [ToggleUserStatus] Invalid parameters - userId:', userId, 'isActive:', isActive);
      return NextResponse.json({ error: 'Missing userId or isActive field' }, { status: 400 });
    }

    // Update user status in database
    console.log('🔍 [ToggleUserStatus] Updating user status in database...');
    console.log('  - User ID:', userId);
    console.log('  - Setting is_active to:', isActive);
    
    const { data, error } = await supabase
      .from('users')
      .update({ 
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, username, email, is_active')
      .single();

    console.log('🔍 [ToggleUserStatus] Database update result:');
    console.log('  - Error:', error);
    console.log('  - Data:', data);

    if (error) {
      console.error('❌ [ToggleUserStatus] Database error:', error);
      return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 });
    }

    if (!data) {
      console.log('❌ [ToggleUserStatus] User not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('✅ [ToggleUserStatus] User status updated successfully');
    console.log('  - User data:', {
      id: data.id,
      username: data.username,
      email: data.email,
      is_active: data.is_active
    });

    // Send notification email for both ban and unban actions
    if (data.email && data.username) {
      try {
        console.log('📧 [ToggleUserStatus] Sending notification email...');
        console.log('  - Email:', data.email);
        console.log('  - Username:', data.username);
        console.log('  - Is banned (will be sent):', !isActive);
        console.log('  - Email API URL:', `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/send-ban-email`);
        
        // Call the send-ban-email API endpoint
        const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/send-ban-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            userId: data.id,
            username: data.username,
            email: data.email,
            isBanned: !isActive // isBanned is true when isActive is false
          })
        });

        console.log('📧 [ToggleUserStatus] Email API response status:', emailResponse.status);
        
        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error(`❌ [ToggleUserStatus] Failed to send ${!isActive ? 'ban' : 'unban'} notification email:`, errorText);
          // Don't fail the operation if email fails
        } else {
          const emailResult = await emailResponse.json();
          console.log(`✅ [ToggleUserStatus] ${!isActive ? 'Ban' : 'Unban'} notification email sent successfully`);
          console.log('  - Email result:', emailResult);
        }
      } catch (emailError) {
        console.error(`❌ [ToggleUserStatus] Error sending ${!isActive ? 'ban' : 'unban'} notification email:`, emailError);
        // Don't fail the operation if email fails
      }
    } else {
      console.log('⚠️ [ToggleUserStatus] Skipping email notification - missing email or username');
      console.log('  - Email:', data.email);
      console.log('  - Username:', data.username);
    }

    console.log('✅ [ToggleUserStatus] Operation completed successfully');
    return NextResponse.json({ 
      success: true, 
      message: `User ${isActive ? 'unbanned' : 'banned'} successfully`,
      user: data
    });

  } catch (error) {
    console.error('❌ [ToggleUserStatus] Toggle user status error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      console.log('❌ [ToggleUserStatus] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
