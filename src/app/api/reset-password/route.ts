import { NextResponse } from "next/server";
import { supabase } from "../../../supabaseClient";
import { verifyJWT } from "../../../services/hikerApi";

export async function POST(req: Request) {
  const { token, password } = await req.json();
  if (!token || !password) {
    return NextResponse.json({ error: "Missing token or password" }, { status: 400 });
  }
  // Verify token
  const payload = verifyJWT(token);
  if (!payload || (typeof payload !== "object") || (payload as any).type !== "reset") {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }
  // Find user by id and token
  const { user_id, email } = payload as any;
  const { data: user, error } = await supabase
    .from("users")
    .select("id, reset_token, reset_token_expires")
    .eq("id", user_id)
    .eq("reset_token", token)
    .single();
  if (error || !user) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }
  // Check token expiry
  if (new Date(user.reset_token_expires) < new Date()) {
    return NextResponse.json({ error: "Token expired" }, { status: 400 });
  }
  // Update password using Supabase RPC (bcrypt hash)
  const { error: updateError } = await supabase.rpc("update_user_password_with_hash", {
    user_id,
    password,
  });
  if (updateError) {
    return NextResponse.json({ error: "Error updating password" }, { status: 500 });
  }
  // Invalidate token
  await supabase
    .from("users")
    .update({ reset_token: null, reset_token_expires: null })
    .eq("id", user_id);
  return NextResponse.json({ success: true });
}
