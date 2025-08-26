import { NextResponse } from "next/server";
import { supabase } from "../../../supabaseClient";
import { generateJWT } from "../../../services/hikerApi";

// You should use a real email service in production
async function sendEmail(to: string, subject: string, text: string) {
  console.log(`Send email to ${to}: ${subject}\n${text}`);
  // Integrate with SendGrid, Resend, etc. here
}

export async function POST(req: Request) {
  const { email } = await req.json();
  // Find user by email
  const { data: user, error } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();
  if (error || !user) {
    // Always respond with success to avoid email enumeration
    return NextResponse.json({ success: true });
  }
  // Generate reset token (JWT, expires in 1 hour)
  const token = generateJWT({ user_id: user.id, email, type: "reset" });
  // Save token in DB (optional, for invalidation)
  await supabase
    .from("users")
    .update({ reset_token: token, reset_token_expires: new Date(Date.now() + 60 * 60 * 1000).toISOString() })
    .eq("id", user.id);
  // Send email with reset link
  const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/auth/reset-password?token=${token}`;
  await sendEmail(email, "Password Reset", `Reset your password: ${resetUrl}`);
  return NextResponse.json({ success: true });
}
