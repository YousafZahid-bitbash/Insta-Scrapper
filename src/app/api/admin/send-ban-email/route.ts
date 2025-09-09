import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { BanUnbanEmailTemplate } from '../../../../components/BanUnbanEmailTemplate';
import { supabase } from '../../../../supabaseClient';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET || 'your-secret-key';

// Initialize Resend only if API key is available
let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

async function verifyAdminToken(token: string): Promise<{ userId: string; isAdmin: boolean }> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { user_id: string };
    
    const { data: user, error } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', decoded.user_id)
      .single();

    if (error || !user || !user.is_admin) {
      throw new Error('Unauthorized');
    }

    return { userId: decoded.user_id, isAdmin: true };
  } catch (error) {
    throw new Error('Unauthorized');
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📧 [SendBanEmail] Starting ban email process...');
    
    // Get token from cookies or Authorization header
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    console.log('📧 [SendBanEmail] Token found:', token ? 'YES' : 'NO');
    
    if (!token) {
      console.log('❌ [SendBanEmail] No token provided');
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify admin access
    console.log('📧 [SendBanEmail] Verifying admin token...');
    await verifyAdminToken(token);
    console.log('✅ [SendBanEmail] Admin verification successful');

    const body = await request.json();
    console.log('📧 [SendBanEmail] Request body:', body);
    const { userId, username, email, isBanned } = body;

    if (!userId || !username || !email || typeof isBanned !== 'boolean') {
      console.log('❌ [SendBanEmail] Missing required fields - userId:', userId, 'username:', username, 'email:', email, 'isBanned:', isBanned);
      return NextResponse.json({ 
        error: 'Missing required fields: userId, username, email, isBanned' 
      }, { status: 400 });
    }

    // Check if Resend API key is configured
    console.log('📧 [SendBanEmail] Checking Resend configuration...');
    console.log('  - RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
    console.log('  - Resend instance:', !!resend);
    
    if (!process.env.RESEND_API_KEY || !resend) {
      console.error('❌ [SendBanEmail] RESEND_API_KEY not configured');
      return NextResponse.json({ 
        error: 'Email service not configured' 
      }, { status: 500 });
    }


    // Send notification email using new template
    const actionDate = new Date().toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const subject = isBanned
      ? 'Account Suspension Notification - InstaScrapper'
      : 'Account Reactivated - InstaScrapper';
    const supportEmail = 'support@bitbash.dev';
    console.log('📧 [SendBanEmail] Preparing email:');
    console.log('  - Subject:', subject);
    console.log('  - To:', email);
    console.log('  - Is banned:', isBanned);
    const { data, error } = await resend.emails.send({
      from: 'InstaScrapper <onboarding@bitbash.dev>',
      to: [email],
      subject,
      react: BanUnbanEmailTemplate({ username, isBanned, actionDate, supportEmail }),
    });

    console.log('📧 [SendBanEmail] Resend API response:');
    console.log('  - Data:', data);
    console.log('  - Error:', error);

    if (error) {
      console.error('❌ [SendBanEmail] Resend error:', error);
      return NextResponse.json({ 
        error: 'Failed to send email notification',
        details: error 
      }, { status: 500 });
    }

    console.log('✅ [SendBanEmail] Email sent successfully!');
    return NextResponse.json({ 
      success: true, 
      message: `${isBanned ? 'Ban' : 'Unban'} notification email sent successfully`,
      emailId: data?.id
    });

  } catch (error) {
    console.error('❌ [SendBanEmail] Send ban email error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      console.log('❌ [SendBanEmail] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
