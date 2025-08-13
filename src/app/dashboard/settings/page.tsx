"use client";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { supabase } from "../../../supabaseClient";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // ...existing code...
//   const 
// [stripeConnected, setStripeConnected] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
      console.log("[Settings] userId from localStorage:", userId);
      if (userId) {
        const { data, error } = await supabase
          .from("users")
          .select("id, email, username")
          .eq("id", userId)
          .single();
        console.log("[Settings] Supabase user query result:", { data, error });
        if (data) {
          setUser(data);
        //   setStripeConnected(!!data.stripe_account_id);
        } else {
          console.log("[Settings] No user found for id:", userId);
        }
        if (error) {
         console.error("[Settings] Supabase error:", JSON.stringify(error, null, 2));
        }
      } else {
        console.log("[Settings] No user_id in localStorage");
      }
      setLoading(false);
    }
    fetchUser();
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f9fc] flex flex-col">
      <Navbar />
      <div className="flex flex-1 w-full">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:p-16">
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
    </div>
  );
}
