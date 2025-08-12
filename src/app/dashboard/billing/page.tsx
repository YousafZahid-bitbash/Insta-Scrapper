"use client";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import { supabase } from "../../../supabaseClient";

const deals = [
  { coins: 10000, price: 100 },
  { coins: 20000, price: 200 },
  { coins: 30000, price: 290 },
  { coins: 40000, price: 380 },
];

export default function BillingPage() {
  const [coins, setCoins] = useState<number>(0);

  useEffect(() => {
    async function fetchCoins() {
      const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
      if (userId) {
        const { data, error } = await supabase
          .from("users")
          .select("coins")
          .eq("id", userId)
          .single();
        if (data && data.coins !== undefined) setCoins(data.coins);
      }
    }
    fetchCoins();
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f9fc] flex flex-col">
      <Navbar coins={coins} />
      <div className="flex flex-1 w-full">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <main className="flex-1 flex flex-col items-center justify-center p-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Billing</h1>
          <p className="text-lg text-gray-600 mb-8">Manage your coins and purchase more to keep extracting data!</p>
          <div className="mb-8 flex flex-col items-center">
            <span className="text-lg text-gray-700">Current Coins</span>
            <span className="text-4xl font-bold text-yellow-500 flex items-center gap-2 mt-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="32" height="32" className="inline-block"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-13h2v2h-2V7zm0 4h2v6h-2v-6z"/></svg>
              {coins}
            </span>
          </div>
          <button className="mb-8 px-8 py-3 rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-bold text-lg shadow-lg hover:scale-105 transition-transform">Get Coins</button>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-4xl">
            {deals.map((deal, idx) => (
              <div key={deal.coins} className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center border-2 border-yellow-400 hover:border-yellow-600 transition-all hover:scale-105">
                <span className="text-3xl font-extrabold text-yellow-500 mb-2">{deal.coins.toLocaleString()} Coins</span>
                <span className="text-lg text-gray-700 mb-4">Perfect for {deal.coins / 1000}k+ extractions</span>
                <span className="text-2xl font-bold text-gray-900 mb-6">${deal.price}</span>
                <button className="w-full px-6 py-3 rounded bg-yellow-500 text-white font-semibold text-lg shadow hover:bg-yellow-600 transition">Buy Now</button>
              </div>
            ))}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
