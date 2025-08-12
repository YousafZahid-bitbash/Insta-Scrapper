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
		<main className="flex min-h-screen items-center justify-center bg-gray-50">
			<div className="w-full max-w-md p-8 space-y-6 bg-white rounded shadow text-gray-900">
				<h1 className="text-2xl font-bold text-center text-gray-900">Sign Up</h1>
				<form className="space-y-4" onSubmit={handleSignup}>
					<input
						type="email"
						placeholder="Email"
						className="w-full px-4 py-2 border rounded bg-gray-50 text-gray-900 placeholder-gray-400"
						value={email}
						onChange={e => setEmail(e.target.value)}
						required
					/>
					<input
						type="text"
						placeholder="Username"
						className="w-full px-4 py-2 border rounded bg-gray-50 text-gray-900 placeholder-gray-400"
						value={username}
						onChange={e => setUsername(e.target.value)}
						required
					/>
					<input
						type="password"
						placeholder="Password"
						className="w-full px-4 py-2 border rounded bg-gray-50 text-gray-900 placeholder-gray-400"
						value={password}
						onChange={e => setPassword(e.target.value)}
						required
						minLength={6}
					/>
					<button
						type="submit"
						className="w-full bg-black text-white py-2 rounded font-semibold disabled:opacity-60"
						disabled={loading}
					>
						{loading ? "Signing up..." : "Sign Up"}
					</button>
				</form>
				{error && <div className="text-red-500 text-center">{error}</div>}
				{success && <div className="text-green-600 text-center">{success}</div>}
				<div className="text-center text-sm text-gray-700">
					Already have an account?{' '}
					<Link href="/auth/login" className="text-blue-600 hover:underline font-semibold">Login</Link>
				</div>
			</div>
		</main>
	);
}
