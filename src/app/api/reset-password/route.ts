import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../supabaseClient';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const { token, newPassword } = await req.json();
  if (!token || !newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  // Find valid, unused, unexpired token
  const { data: reset, error } = await supabase
    .from('password_resets')
    .select('id, user_id, expires_at, used')
    .eq('token', token)
    .single();

  if (error || !reset || reset.used || new Date(reset.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 400 });
  }

  // Hash new password
  const salt = bcrypt.genSaltSync(10);
  const password_hash = bcrypt.hashSync(newPassword, salt);

  // Update user's password
  const { error: userError } = await supabase
    .from('users')
    .update({ password_hash })
    .eq('id', reset.user_id);

  if (userError) {
    return NextResponse.json({ error: 'Failed to update password.' }, { status: 500 });
  }

  // Mark token as used
  await supabase
    .from('password_resets')
    .update({ used: true })
    .eq('id', reset.id);

  return NextResponse.json({ success: true });
}
