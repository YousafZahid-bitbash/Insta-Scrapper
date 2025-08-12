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
					<main className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
						<iframe
							src="https://my.spline.design/datatransfer-B46O3qI2ug1536NZ7iGcA3uL/"
							frameBorder="0"
							className="absolute inset-0 w-full h-full z-0"
							style={{ minHeight: '100vh', border: 0 }}
							allowFullScreen
							title="3D Scene"
						></iframe>
						<div className="relative z-10 w-full max-w-md p-8 space-y-6 bg-white/90 rounded shadow text-gray-900 backdrop-blur-md">
							<h1 className="text-2xl font-bold text-center text-gray-900">Login</h1>
							<form className="space-y-4" onSubmit={handleLogin}>
								<input
									type="email"
									placeholder="Email"
									className="w-full px-4 py-2 border rounded bg-gray-50 text-gray-900 placeholder-gray-400"
									value={email}
									onChange={e => setEmail(e.target.value)}
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
									{loading ? "Logging in..." : "Login"}
								</button>
							</form>
							{error && <div className="text-red-500 text-center">{error}</div>}
							{success && <div className="text-green-600 text-center">{success}</div>}
							<div className="text-center text-sm text-gray-700">
								Don&apos;t have an account?{' '}
								<Link href="/auth/signup" className="text-blue-600 hover:underline font-semibold">Sign Up</Link>
							</div>
						</div>
					</main>
			);
	
}
