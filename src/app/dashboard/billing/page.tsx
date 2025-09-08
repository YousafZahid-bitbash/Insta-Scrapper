"use client";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Shimmer from "@/components/Shimmer";
import Sidebar from "@/components/Sidebar";
import { supabase } from "../../../supabaseClient";



type Deal = {
  id: number;
  coins: number;
  price: number;
  sale_price?: number | null;
  description?: string | null;
  active: boolean;
};

export default function BillingPage() {
  const [coins, setCoins] = useState<number>(0);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCoinsAndDeals() {
      try {
        // Fetch user info (including coins) from /api/me
        const res = await fetch("/api/me");
        if (!res.ok) throw new Error("Not authenticated");
        const user = await res.json();
        if (user && typeof user.coins === "number") setCoins(user.coins);
      } catch {
        setCoins(0);
      }
      try {
        // Fetch deals directly from Supabase
        const { data, error } = await supabase
          .from("deals")
          .select("id, coins, price, sale_price, description, active")
          .eq("active", true)
          .order("price", { ascending: true });
        if (!error && data) setDeals(data);
      } catch {}
      setLoading(false);
    }
    fetchCoinsAndDeals();
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f9fc] flex flex-col">
      <Navbar coins={coins} />
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:p-16 md:ml-64">
          <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl p-12 border border-[#d4af37] mt-8 mb-8 relative">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-[#d4af37] flex items-center justify-center shadow-lg border-4 border-white">
              <svg width="36" height="36" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M12 12.713l11.985-7.713A1 1 0 0023 4H1a1 1 0 00-.985 1.001L12 12.713z"/><path fill="#fff" d="M12 14.713l-12-7.713V20a1 1 0 001 1h22a1 1 0 001-1V7l-12 7.713z"/></svg>
            </div>
            <h1 className="text-4xl font-serif font-bold text-center mb-6 text-gray-900 tracking-tight" style={{fontFamily:'Georgia,serif'}}>Billing & Coins</h1>
            <p className="text-center text-gray-700 mb-8 text-lg font-light">Manage your coins and purchase more to keep extracting data. Enjoy classic elegance and premium service.</p>
            <div className="mb-8 flex flex-col items-center">
              <span className="text-lg font-serif text-gray-700">Current Coins</span>
              <span className="text-4xl font-bold text-[#d4af37] flex items-center gap-2 mt-2 font-serif">
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="32" height="32" className="inline-block"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-13h2v2h-2V7zm0 4h2v6h-2v-6z"/></svg>
                {coins}
              </span>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-4xl mx-auto">
                {[...Array(4)].map((_, i) => (
                  <Shimmer key={i} className="h-56 w-full mb-4 rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-4xl mx-auto">
                {deals.map(deal => (
                  <div key={deal.id} className="bg-[#fffbe6] rounded-2xl shadow-lg p-8 flex flex-col items-center border-2 border-[#d4af37] hover:border-[#bfa233] transition-all hover:scale-105">
                    <span className="text-3xl font-extrabold text-[#d4af37] mb-2 font-serif">{deal.coins.toLocaleString()} Coins</span>
                    <span className="text-lg text-gray-700 mb-4 font-light">{deal.description || `Enough for ${deal.coins / 1000}k+ extractions`}</span>
                    <span className="text-2xl font-bold text-gray-900 mb-2 font-serif">
                      {deal.sale_price ? (
                        <>
                          <span className="line-through text-gray-400 mr-2">${deal.price}</span>
                          ${deal.sale_price}
                        </>
                      ) : (
                        <>${deal.price}</>
                      )}
                    </span>
                    {deal.sale_price && <span className="text-sm text-green-600 font-semibold mb-4">On Sale!</span>}
                    <button 
                      className="w-full px-6 py-3 rounded bg-[#d4af37] text-white font-semibold text-lg shadow hover:bg-[#bfa233] transition font-serif"
                      onClick={() => {
                        const params = new URLSearchParams({
                          name: deal.description || deal.coins + ' Coins',
                          price: String(deal.sale_price || deal.price),
                          coins: String(deal.coins)
                        }).toString();
                        window.location.href = `/dashboard/purchase?${params}`;
                      }}
                    >Buy Now</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
    </div>
  );
}
