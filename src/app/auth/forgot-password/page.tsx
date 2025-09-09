"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/request-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    const result = await res.json();
    if (res.ok) {
      setMessage("If your email exists, a reset link has been sent.");
    } else {
      setMessage(result.error || "Error sending reset link.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
      <form className="bg-white p-10 rounded-xl shadow-lg w-full max-w-md border border-gray-200" onSubmit={handleSubmit}>
        <h1 className="text-3xl font-extrabold mb-2 text-center text-gray-900">Forgot your password?</h1>
        <p className="mb-6 text-gray-600 text-center">Enter your email address and you will recieve a link to reset your password.</p>
        <input
          type="email"
          className="w-full p-3 border border-gray-300 rounded mb-4 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition"
          placeholder="Enter your email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <button
          type="submit"
          className="w-full bg-black hover:bg-gray-900 text-white py-2.5 rounded font-semibold transition disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
        {message && <div className="mt-4 text-center text-sm text-gray-700">{message}</div>}
      </form>
    </main>
  );
}
