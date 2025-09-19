
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../supabaseClient';
import crypto from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail(to: string, subject: string, text: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Scrapper Glass <support@scrapperglass.com>',
      to: [to],
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; color: #222;">
          <h2>Password Reset Request</h2>
          <p>You requested a password reset for your Scrapper Glass account.</p>
          <p>Click the link below to reset your password:</p>
          <p><a href="${text}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
          <p style="font-size: 12px; color: #888; margin-top: 32px;">Thank you,<br/>The Scrapper Glass Team</p>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
    
    console.log('Password reset email sent successfully:', data?.id);
    return true;
  } catch (error) {
    console.error('Exception sending password reset email:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  // Always return generic message for security
  const genericMsg = { message: 'If this email exists, a reset link will be sent.' };

  // Find user
  const { data: user } = await supabase
    .from('users')
    .select('id, is_active')
    .eq('email', email)
    .single();

  if (!user || !user.is_active) {
    return NextResponse.json(genericMsg);
  }

  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  // Store token in password_resets table
  await supabase.from('password_resets').insert({
    user_id: user.id,
    token,
    expires_at: expiresAt,
  });

  // Send email
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/reset-password?token=${token}`;
  await sendEmail(email, "Password Reset - Scrapper Glass", resetUrl);

  return NextResponse.json(genericMsg);
}
