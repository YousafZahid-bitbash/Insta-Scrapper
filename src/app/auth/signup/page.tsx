"use client";
import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../../supabaseClient";

export default function SignupPage() {
	const [email, setEmail] = useState("");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	async function handleSignup(e: React.FormEvent) {
		e.preventDefault();
		setError("");
		setSuccess("");
		setLoading(true);

		// Call a Supabase function to create user with hashed password
		const { error } = await supabase.rpc("create_user_with_hash", {
			email,
			password,
			username,
		});

		setLoading(false);
		if (error) {
			setError(error.message);
		} else {
			setSuccess("Account created! You can now log in.");
			setEmail("");
			setUsername("");
			setPassword("");
		}
	}

	return (
		<main className="min-h-screen w-full flex items-center justify-center bg-[#f9f6f2]">
					<div className="w-full max-w-md p-10 space-y-8 bg-white rounded-2xl shadow-lg border border-[#d4af37]">
						<h1 className="text-3xl font-serif font-semibold text-center text-gray-900 mb-2 tracking-tight" style={{fontFamily:'Georgia,serif'}}>Create Account</h1>
						<p className="text-center text-gray-600 mb-6 text-base">Sign up to get started</p>
				<form className="space-y-5" onSubmit={handleSignup}>
					<input
						type="email"
						placeholder="Email"
						className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10"
						value={email}
						onChange={e => setEmail(e.target.value)}
						required
					/>
					<input
						type="text"
						placeholder="Username"
						className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10"
						value={username}
						onChange={e => setUsername(e.target.value)}
						required
					/>
					<input
						type="password"
						placeholder="Password"
						className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10"
						value={password}
						onChange={e => setPassword(e.target.value)}
						required
						minLength={6}
					/>
					<button
						type="submit"
						className="w-full bg-black text-white py-3 rounded-lg font-semibold text-lg shadow hover:bg-gray-900 transition disabled:opacity-60"
						disabled={loading}
					>
						{loading ? "Signing up..." : "Sign Up"}
					</button>
				</form>
				{error && <div className="text-red-500 text-center text-sm mt-2">{error}</div>}
				{success && <div className="text-green-600 text-center text-sm mt-2">{success}</div>}
				<div className="text-center text-sm text-gray-700 mt-4">
					Already have an account?{' '}
					<Link href="/auth/login" className="text-blue-600 hover:underline font-semibold">Login</Link>
				</div>
			</div>
		</main>
	);
}
