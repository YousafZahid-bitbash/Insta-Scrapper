"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../supabaseClient";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const router = useRouter();

	async function handleLogin(e: React.FormEvent) {
		e.preventDefault();
		setError("");
		setSuccess("");
		setLoading(true);

		// Call a Supabase function to check user credentials
		const { data, error } = await supabase.rpc("login_user_with_hash", {
			email,
			password,
		});

			setLoading(false);
			if (error) {
				setError(error.message);
			} else if (data && data[0]?.success) {
				setSuccess("Login successful!");
				setEmail("");
				setPassword("");
				// Store user id in localStorage for later use
				if (data[0]?.user_id) {
					localStorage.setItem("user_id", data[0].user_id);
				}
				router.push("/dashboard");
			} else {
				setError("Invalid credentials");
			}
	}

	return (
		<main className="min-h-screen w-full flex items-center justify-center bg-[#f9f6f2]">
					<div className="w-full max-w-md p-10 space-y-8 bg-white rounded-2xl shadow-lg border border-[#d4af37]">
						<h1 className="text-3xl font-serif font-semibold text-center text-gray-900 mb-2 tracking-tight" style={{fontFamily:'Georgia,serif'}}>Welcome Back</h1>
						<p className="text-center text-gray-600 mb-6 text-base">Sign in to your account</p>
				<form className="space-y-5" onSubmit={handleLogin}>
					<input
						type="email"
						placeholder="Email"
						className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10"
						value={email}
						onChange={e => setEmail(e.target.value)}
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
						{loading ? "Logging in..." : "Login"}
					</button>
				</form>
				{error && <div className="text-red-500 text-center text-sm mt-2">{error}</div>}
				{success && <div className="text-green-600 text-center text-sm mt-2">{success}</div>}
				<div className="text-center text-sm text-gray-700 mt-4">
					Don&apos;t have an account?{' '}
					<Link href="/auth/signup" className="text-blue-600 hover:underline font-semibold">Sign Up</Link>
				</div>
			</div>
		</main>
			);
	
}
