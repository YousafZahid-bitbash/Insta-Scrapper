"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
// import { supabase } from "../../../supabaseClient";

function LoginForm() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const router = useRouter();
	const searchParams = useSearchParams();

	// Check if user is already logged in and handle banned message
		useEffect(() => {
			// Check if user was redirected due to being banned
			const banned = searchParams?.get('banned');
			if (banned === 'true') {
				setError("Your account has been suspended. Please contact support for assistance.");
				// Clear any stored user data
				localStorage.clear();
				sessionStorage.clear();
				return; // Don't check auth status if banned
			}

			// Only redirect if user is truly authenticated (not just localStorage)
			const userId = localStorage.getItem("user_id");
			if (userId) {
				// Prevent repeated redirects
				if (window.location.pathname !== '/dashboard/new-extractions') {
					console.log("User already logged in, redirecting to dashboard");
					router.push("/dashboard/new-extractions");
				}
			}
		}, [router, searchParams]);

	async function handleLogin(e: React.FormEvent) {
		e.preventDefault();
			setError("");
			setSuccess("");
			setLoading(true);
			try {
				const res = await fetch("/api/login", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ email, password }),
				});
				setLoading(false);
				const result = await res.json();
				if (!res.ok) {
					setError(result.error || "Invalid credentials");
					return;
				}
				setEmail("");
				setPassword("");
				if (result.user_id) {
					localStorage.setItem("user_id", result.user_id);
					// Redirect based on admin status
					if (result.is_admin) {
						router.push("/admin");
					} else {
						router.push("/dashboard/new-extractions");
					}
				}
			} catch {
				setLoading(false);
				setError("Server error");
			}
	}

	return (
		<main className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
			{/* Gold abstract accents */}
			<div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-[#d4af37]/40 to-transparent rounded-full blur-2xl opacity-60 animate-fade-in" />
			<div className="absolute bottom-0 right-0 w-56 h-56 bg-gradient-to-tr from-[#d4af37]/30 to-transparent rounded-full blur-3xl opacity-50 animate-fade-in" />
			<div className="w-full max-w-md p-0 flex flex-col items-center justify-center z-10">
				{/* Close button */}
				<button
					type="button"
					aria-label="Close"
					onClick={() => window.location.href = "/"}
					className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-black text-white text-4xl font-bold shadow-lg hover:bg-[#d4af37] hover:text-black transition-all duration-200 z-20"
				>
					&times;
				</button>
				{/* Card with fade-in motion */}
				<div className="w-full p-10 space-y-8 bg-white/95 rounded-2xl shadow-2xl border-2 border-[#d4af37] animate-fade-in">
					{/* Brand logo and tagline */}
					<div className="flex flex-col items-center mb-4">
						<div className="w-14 h-14 rounded-full bg-black flex items-center justify-center mb-2 border-2 border-[#d4af37] shadow-lg">
							<span className="text-3xl font-bold text-[#d4af37]">IS</span>
						</div>
						<span className="text-lg font-semibold text-gray-900 tracking-tight font-sans">Welcome to InstaScraper</span>
						<span className="text-sm text-gray-500 font-light">Luxury Instagram Data Platform</span>
					</div>
					<h1 className="text-3xl font-bold text-center text-black mb-2 tracking-tight font-sans">Sign In</h1>
					<form className="space-y-6" onSubmit={handleLogin} autoComplete="off">
						<div className="relative">
							<input
								type="email"
								id="email"
								className="peer w-full px-4 pt-6 pb-2 border border-gray-200 rounded-lg bg-gray-50 text-black placeholder-transparent focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] transition-shadow"
								value={email}
								onChange={e => setEmail(e.target.value)}
								required
								autoComplete="email"
								aria-label="Email"
							/>
							<label htmlFor="email" className="absolute left-4 top-2 text-gray-500 text-sm transition-all peer-focus:text-[#d4af37] peer-focus:top-1 peer-focus:text-base peer-placeholder-shown:top-4 peer-placeholder-shown:text-base pointer-events-none font-sans">Email</label>
						</div>
						<div className="relative">
							<input
								type="password"
								id="password"
								className="peer w-full px-4 pt-6 pb-2 border border-gray-200 rounded-lg bg-gray-50 text-black placeholder-transparent focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] transition-shadow"
								value={password}
								onChange={e => setPassword(e.target.value)}
								required
								minLength={6}
								autoComplete="current-password"
								aria-label="Password"
							/>
							<label htmlFor="password" className="absolute left-4 top-2 text-gray-500 text-sm transition-all peer-focus:text-[#d4af37] peer-focus:top-1 peer-focus:text-base peer-placeholder-shown:top-4 peer-placeholder-shown:text-base pointer-events-none font-sans">Password</label>
							<div className="text-right mt-1">
								<Link href="/auth/forgot-password" className="text-[#d4af37] hover:text-black text-xs font-medium transition-colors">Forgot password?</Link>
							</div>
						</div>
						<button
							type="submit"
							className="w-full bg-black text-white py-3 rounded-lg font-bold text-lg shadow-lg hover:bg-[#d4af37] hover:text-black hover:shadow-gold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#d4af37] disabled:opacity-60 animate-fade-in"
							disabled={loading}
							aria-label="Login"
						>
							{loading ? "Logging in..." : "Login"}
						</button>
					</form>
					{error && <div className="text-red-500 text-center text-sm mt-2 animate-fade-in">{error}</div>}
					{success && <div className="text-green-600 text-center text-sm mt-2 animate-fade-in">{success}</div>}
					<div className="text-center text-sm text-gray-700 mt-4">
						Don&apos;t have an account?{' '}
						<Link href="/auth/signup" className="text-[#d4af37] hover:text-black font-semibold transition-colors underline underline-offset-2">Sign Up</Link>
					</div>
				</div>
			</div>
			<style jsx global>{`
				@keyframes fade-in {
					from { opacity: 0; transform: translateY(20px); }
					to { opacity: 1; transform: none; }
				}
				.animate-fade-in {
					animation: fade-in 0.8s cubic-bezier(0.4,0,0.2,1) both;
				}
				.hover\:shadow-gold:hover {
					box-shadow: 0 0 16px 2px #d4af37;
				}
			`}</style>
		</main>
	);
}

export default function LoginPage() {
	return (
		<Suspense fallback={
			<main className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black">
				<div className="text-white">Loading...</div>
			</main>
		}>
			<LoginForm />
		</Suspense>
	);
}
