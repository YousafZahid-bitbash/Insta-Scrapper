import { NextResponse } from "next/server";
import { supabase } from "../../../supabaseClient";
import { generateJWT } from "../../../services/hikerApi";

export async function POST(req: Request) {
	try {
		const { email, password } = await req.json();
		
		// Call Supabase RPC to verify password
		const { data, error } = await supabase.rpc("login_user_with_hash", {
			email,
			password,
		});
		
		if (error || !data || !data[0]?.success) {
			return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
		}
		
		// Generate JWT
		const user = data[0];
		
		// Get user details including admin status
		const { data: userDetails, error: userError } = await supabase
			.from('users')
			.select('email, is_admin')
			.eq('id', user.user_id)
			.single();
		
		if (userError) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}
		
		// Update last_login timestamp after successful authentication
		await supabase
			.from('users')
			.update({ last_login: new Date().toISOString() })
			.eq('id', user.user_id);
		
		const token = await generateJWT({ user_id: user.user_id, email: userDetails.email });
		
		// Set cookie
		const response = NextResponse.json({ 
			success: true, 
			user_id: user.user_id,
			is_admin: userDetails.is_admin 
		});
		response.cookies.set("token", token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 24 * 7, // 1 week
		});
		
		return response;
	} catch {
		return NextResponse.json({ error: "Server error" }, { status: 500 });
	}
}
