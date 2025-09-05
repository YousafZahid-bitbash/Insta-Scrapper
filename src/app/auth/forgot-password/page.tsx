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
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <form className="bg-white p-8 rounded shadow w-full max-w-md" onSubmit={handleSubmit}>
        <h1 className="text-2xl font-bold mb-4">Forgot Password</h1>
        <input
          type="email"
          className="w-full p-2 border rounded mb-4"
          placeholder="Enter your email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <button
          type="submit"
          className="w-full bg-black text-white py-2 rounded"
          disabled={loading}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
        {message && <div className="mt-4 text-center text-sm text-gray-700">{message}</div>}
      </form>
    </main>
  );
}
