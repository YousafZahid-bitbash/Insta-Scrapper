
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../supabaseClient';
import crypto from 'crypto';

// You should use a real email service in production
async function sendEmail(to: string, subject: string, text: string) {
  console.log(`Send email to ${to}: ${subject}\n${text}`);
  // Integrate with SendGrid, Resend, etc. here
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

  // Send email (pseudo-code, replace with your email logic)
  const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/auth/reset-password?token=${token}`;
  await sendEmail(email, "Password Reset", `Reset your password: ${resetUrl}`);

  return NextResponse.json(genericMsg);
}
