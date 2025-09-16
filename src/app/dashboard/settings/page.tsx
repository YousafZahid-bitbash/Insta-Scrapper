
"use client";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";


export default function SettingsPage() {
  type User = { id: string; email: string; username: string };
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [coins, setCoins] = useState<number>(0);
  // ...existing code...
//   const 
// [stripeConnected, setStripeConnected] = useState(false);

  useEffect(() => {
    // Set page title
    document.title = "Settings | Scrapper Glass";
  }, []);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) throw new Error("Not authenticated");
        const user = await res.json();
        setUser(user);
        if (user && typeof user.coins === "number") setCoins(user.coins);
      } catch {
        setUser(null);
        setCoins(0);
      }
      setLoading(false);
    }
    fetchUser();
  }, []);

  return (
    
    <div className="min-h-screen bg-[#f7f9fc] flex flex-col">
      <Navbar coins={coins} />
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:p-16 md:ml-64">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-12 border border-[#d4af37] mt-8 mb-8 relative">
            <h1 className="text-3xl font-serif font-bold text-center mb-8 text-gray-900 tracking-tight">Settings</h1>
            {loading ? (
              <div className="text-center text-lg text-gray-500">Loading user details...</div>
            ) : user ? (
              <>
                <div className="mb-8 text-center">
                  <div className="text-lg font-serif text-gray-700 mb-2">Name: <span className="font-bold text-gray-900">{user.username || "-"}</span></div>
                  <div className="text-lg font-serif text-gray-700 mb-2">Email: <span className="font-bold text-gray-900">{user.email}</span></div>
                 </div>
                <div className="mb-8 text-center">
                  {/* Update Password feature removed */}
                </div>
                {/* Password modal removed */}
              </>
            ) : (
              <div className="text-center text-lg text-red-500">User not found.</div>
            )}
          </div>
        </main>
    </div>
  );
}
