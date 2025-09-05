import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../supabaseClient';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function verifyAdminToken(token: string): Promise<{ userId: string; isAdmin: boolean }> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    const { data: user, error } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', decoded.userId)
      .single();

    if (error || !user || !user.is_admin) {
      throw new Error('Unauthorized');
    }

    return { userId: decoded.userId, isAdmin: true };
  } catch (error) {
    throw new Error('Unauthorized');
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get token from cookies or Authorization header
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify admin access
    await verifyAdminToken(token);

    const body = await request.json();
    const { userId, isActive } = body;

    if (!userId || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Missing userId or isActive field' }, { status: 400 });
    }

    // Update user status in database
    const { data, error } = await supabase
      .from('users')
      .update({ 
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, username, email, is_active')
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Send notification email for both ban and unban actions
    if (data.email && data.username) {
      try {
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

        if (!emailResponse.ok) {
          console.error(`Failed to send ${!isActive ? 'ban' : 'unban'} notification email:`, await emailResponse.text());
          // Don't fail the operation if email fails
        } else {
          console.log(`${!isActive ? 'Ban' : 'Unban'} notification email sent successfully`);
        }
      } catch (emailError) {
        console.error(`Error sending ${!isActive ? 'ban' : 'unban'} notification email:`, emailError);
        // Don't fail the operation if email fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `User ${isActive ? 'unbanned' : 'banned'} successfully`,
      user: data
    });

  } catch (error) {
    console.error('Toggle user status error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
