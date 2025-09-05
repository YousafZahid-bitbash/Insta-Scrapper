"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../supabaseClient";

function getPasswordStrength(password: string) {
	let score = 0;
	if (password.length >= 8) score++;
	if (/[A-Z]/.test(password)) score++;
	if (/[a-z]/.test(password)) score++;
	if (/[0-9]/.test(password)) score++;
	if (/[^A-Za-z0-9]/.test(password)) score++;
	return score;
}

const strengthChecklist = [
	{ label: "8+ characters", test: (p: string) => p.length >= 8 },
	{ label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
	{ label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
	{ label: "Number", test: (p: string) => /[0-9]/.test(p) },
	{ label: "Special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function SignupPage() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const router = useRouter();

	// Check if user is already logged in
	useEffect(() => {
		const checkAuthStatus = () => {
			const userId = localStorage.getItem("user_id");
			if (userId) {
				// User is already logged in, redirect to dashboard
				console.log("User already logged in, redirecting to dashboard");
				router.push("/dashboard/new-extractions");
			}
		};

		checkAuthStatus();
	}, [router]);

	async function handleSignup(e: React.FormEvent) {
		e.preventDefault();
		setError("");
		setSuccess("");
		setLoading(true);
		// Replace with your actual signup logic
		console.log({ email, password, username: name });
		const { data, error } = await supabase.rpc("create_user_with_hash", {
			email,
			password,
			username: name,
		});
		setLoading(false);
		if (error) {
			// Check for unique constraint violation
			if (
				error.message?.toLowerCase().includes("duplicate key") ||
				error.message?.toLowerCase().includes("unique constraint")
			) {
				setError("Email or username already exists. Please choose a different one.");
			} else {
				setError(error.message);
			}
		} else if (data && data[0]?.success) {
			setSuccess("Signup successful! Please login.");
			setEmail("");
			setPassword("");
			setName("");
			setTimeout(() => router.push("/auth/login"), 1500);
		} else {
			setError("Signup failed");
		}
	}

	const strength = getPasswordStrength(password);

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
					onClick={() => (window.location.href = "/")}
					className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-black text-[#d4af37] text-2xl font-bold shadow-lg hover:bg-[#d4af37] hover:text-black transition-all duration-200 z-20"
				>
					&times;
				</button>
				{/* Card with fade-in motion */}
				<div className="w-full p-10 space-y-8 bg-white/95 rounded-2xl shadow-2xl border-2 border-[#d4af37] animate-fade-in">
					{/* Brand logo and headline */}
					<div className="flex flex-col items-center mb-4">
						<div className="w-14 h-14 rounded-full bg-black flex items-center justify-center mb-2 border-2 border-[#d4af37] shadow-lg">
							<span className="text-3xl font-bold text-[#d4af37]">IS</span>
						</div>
						<span className="text-lg font-semibold text-gray-900 tracking-tight font-sans">
							Create Your Account
						</span>
						<span className="text-sm text-gray-500 font-light">
							Luxury Instagram Data Platform
						</span>
					</div>
					<form className="space-y-6" onSubmit={handleSignup} autoComplete="off">
						<div className="relative">
							<input
								type="text"
								id="name"
								className="peer w-full px-4 pt-6 pb-2 border border-gray-200 rounded-lg bg-gray-50 text-black placeholder-transparent focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] transition-shadow"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
								autoComplete="name"
								aria-label="Name"
							/>
							<label
								htmlFor="name"
								className="absolute left-4 top-2 text-gray-500 text-sm transition-all peer-focus:text-[#d4af37] peer-focus:top-1 peer-focus:text-base peer-placeholder-shown:top-4 peer-placeholder-shown:text-base pointer-events-none font-sans"
							>
								Name
							</label>
						</div>
						<div className="relative">
							<input
								type="email"
								id="email"
								className="peer w-full px-4 pt-6 pb-2 border border-gray-200 rounded-lg bg-gray-50 text-black placeholder-transparent focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] transition-shadow"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								autoComplete="email"
								aria-label="Email"
							/>
							<label
								htmlFor="email"
								className="absolute left-4 top-2 text-gray-500 text-sm transition-all peer-focus:text-[#d4af37] peer-focus:top-1 peer-focus:text-base peer-placeholder-shown:top-4 peer-placeholder-shown:text-base pointer-events-none font-sans"
							>
								Email
							</label>
						</div>
						<div className="relative">
							<input
								type="password"
								id="password"
								className={`peer w-full px-4 pt-6 pb-2 border border-gray-200 rounded-lg bg-gray-50 text-black placeholder-transparent focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] transition-shadow ${
									strength >= 3 ? "ring-2 ring-[#d4af37]" : ""
								}`}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								minLength={6}
								autoComplete="new-password"
								aria-label="Password"
							/>
							<label
								htmlFor="password"
								className="absolute left-4 top-2 text-gray-500 text-sm transition-all peer-focus:text-[#d4af37] peer-focus:top-1 peer-focus:text-base peer-placeholder-shown:top-4 peer-placeholder-shown:text-base pointer-events-none font-sans"
							>
								Password
							</label>
							{/* Password strength indicator */}
							<div className="mt-2 flex flex-col gap-1">
								<div className="flex gap-2 items-center">
									<span
										className={`w-3 h-3 rounded-full ${
											strength === 0
												? "bg-gray-300"
												: strength <= 2
												? "bg-red-400"
												: strength === 3
												? "bg-yellow-400"
												: strength >= 4
												? "bg-green-500"
												: ""
										}`}
									></span>
									<span className="text-xs text-gray-500">
										Password strength
									</span>
								</div>
								<ul className="text-xs text-gray-500 flex flex-col gap-1">
									{strengthChecklist.map((item) => (
										<li key={item.label} className="flex items-center gap-2">
											<span
												className={`w-2 h-2 rounded-full ${
													item.test(password)
														? "bg-[#d4af37]"
														: "bg-gray-300"
												}`}
											></span>
											{item.label}
										</li>
									))}
								</ul>
							</div>
						</div>
						<button
							type="submit"
							className="w-full bg-black text-white py-3 rounded-lg font-bold text-lg shadow-lg hover:bg-[#d4af37] hover:text-black hover:shadow-gold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#d4af37] disabled:opacity-60 animate-fade-in"
							disabled={loading}
							aria-label="Sign Up"
						>
							{loading ? "Signing up..." : "Sign Up"}
						</button>
					</form>
					{error && (
						<div className="text-red-500 text-center text-sm mt-2 animate-fade-in">
							{error}
						</div>
					)}
					{success && (
						<div className="text-green-600 text-center text-sm mt-2 animate-fade-in">
							{success}
						</div>
					)}
				</div>
				<div className="text-center text-sm text-gray-300 mt-6">
					Already have an account?{" "}
					<Link
						href="/auth/login"
						className="text-[#d4af37] hover:text-black font-semibold transition-colors underline underline-offset-2"
					>
						Login
					</Link>
				</div>
			</div>
			<style jsx global>{`
				@keyframes fade-in {
					from {
						opacity: 0;
						transform: translateY(20px);
					}
					to {
						opacity: 1;
						transform: none;
					}
				}
				.animate-fade-in {
					animation: fade-in 0.8s cubic-bezier(0.4, 0, 0.2, 1) both;
				}
				.hover\:shadow-gold:hover {
					box-shadow: 0 0 16px 2px #d4af37;
				}
			`}</style>
		</main>
	);
}
