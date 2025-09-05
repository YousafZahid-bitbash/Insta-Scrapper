"use client";
import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordContent() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams ? searchParams.get("token") : "";

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
    const res = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);
    const result = await res.json();
    if (res.ok) {
      setMessage("Password reset successful. You can now log in.");
      setTimeout(() => router.push("/auth/login"), 2000);
    } else {
      setMessage(result.error || "Error resetting password.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <form className="bg-white p-8 rounded shadow w-full max-w-md" onSubmit={handleSubmit}>
        <h1 className="text-2xl font-bold mb-4">Reset Password</h1>
        <input
          type="password"
          className="w-full p-2 border rounded mb-4"
          placeholder="Enter new password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded font-bold"
          disabled={loading}
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>
        {message && <p className="mt-4 text-center text-sm text-red-500">{message}</p>}
      </form>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
         