"use client"
import { useEffect, useState } from "react";

import { FaUserFriends, FaUserPlus, FaIdBadge, FaHashtag, FaThumbsUp } from "react-icons/fa";
import Navbar from "@/components/Navbar";
import Shimmer from "@/components/Shimmer";
import { supabase } from "../../../supabaseClient";
import Sidebar from "@/components/Sidebar";
import "../../globals.css";
import { userFollowersChunkGqlByUsername, userFollowingChunkGqlByUsername } from "@/services/hikerApi";

const extractOptions = [
	{ label: "Followers", icon: <FaUserFriends />, value: "followers" },
	{ label: "Followings", icon: <FaUserPlus />, value: "followings" },
	{ label: "Likers", icon: <FaThumbsUp />, value: "likers" },
	{ label: "Hashtags", icon: <FaHashtag />, value: "hashtags" },
	{ label: "Posts", icon: <FaIdBadge />, value: "posts" },
	{ label: "Commenters", icon: <FaUserPlus />, value: "commenters" },
];

export default function NewExtractionsPage() {
	 const [selected, setSelected] = useState("followers");
	 const [input, setInput] = useState("");
	 const [coins, setCoins] = useState<number>(0);
	const [result, setResult] = useState<unknown>(null);
	 const [loading, setLoading] = useState(false);
	 const [error, setError] = useState<string | null>(null);
	const [extractedCount, setExtractedCount] = useState<number>(0);

				 useEffect(() => {
					 async function fetchCoins() {
						 const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
						 if (userId) {
							 try {
										const { data } = await supabase
											.from("users")
											.select("coins")
											.eq("id", userId)
											.single();
										if (data && data.coins !== undefined) {
											setCoins(data.coins);
										}
									} catch {
										// ignore
									}
						 }
					 }
					 fetchCoins();
				 }, []);

		console.log("[NewExtractions] Rendering Navbar with coins:", coins);
			 return (
				 <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f7f9fc] via-[#e3e6f3] to-[#ddc26a]">
					 <Navbar coins={coins} />
					 <div className="flex flex-1 w-full">
						 <div className="hidden md:block">
							 <Sidebar />
						 </div>
						 <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:p-16">
							 <div className="w-full max-w-4xl mx-auto">
								 <div className="bg-white/90 rounded-3xl shadow-2xl p-12 border border-[#d4af37] mt-8 mb-8 relative">
									 <h1 className="text-3xl sm:text-4xl font-serif font-bold text-center mb-4 text-gray-900 tracking-tight">New Extraction</h1>
									 <p className="text-lg text-gray-600 mb-8 text-center">Choose what you want to extract from Instagram</p>
									 <div className="flex flex-wrap gap-3 mb-10 justify-center">
										 {extractOptions.map(opt => (
											 <button
												 key={opt.value}
												 className={`flex items-center gap-2 px-7 py-3 rounded-xl border-2 transition font-semibold text-base focus:outline-none shadow-sm ${selected === opt.value ? "bg-[#d4af37]/10 border-[#d4af37] text-[#bfa233]" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}
												 onClick={() => setSelected(opt.value)}
												 type="button"
											 >
												 <span className="text-xl">{opt.icon}</span>
												 {opt.label}
											 </button>
										 ))}
									 </div>
									 <form
										 className="flex flex-col sm:flex-row items-center gap-4 mt-2 justify-center"
										 onSubmit={async e => {
											 e.preventDefault();
											 setResult(null);
											 setError(null);
											 setLoading(true);
											 setExtractedCount(0);
											 try {
												 let data;
												 if (selected === "followers") {
													 data = await userFollowersChunkGqlByUsername(input);
												 } else if (selected === "followings") {
													 data = await userFollowingChunkGqlByUsername(input);
												 } else {
													 setError("Extraction for this option is not implemented yet.");
													 setLoading(false);
													 return;
												 }
												 setResult(data);
												 setExtractedCount(Array.isArray(data) ? data.length : 0);
												 // Update coins after extraction
												 const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
												 if (userId) {
													 const { data: coinData } = await supabase
														 .from("users")
														 .select("coins")
														 .eq("id", userId)
														 .single();
													 if (coinData && coinData.coins !== undefined) {
														 setCoins(coinData.coins);
													 }
												 }
											 } catch (err) {
												 if (err && typeof err === 'object' && 'message' in err) {
													 setError((err as { message?: string }).message || "Extraction failed");
												 } else {
													 setError("Extraction failed");
												 }
											 }
											 setLoading(false);
										 }}
									 >
										 <span className="text-2xl text-gray-400 font-serif">@</span>
										 <input
											 type="text"
											 placeholder="Enter Instagram username"
											 className="flex-1 px-5 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d4af37] font-serif text-lg shadow-sm"
											 value={input}
											 onChange={e => setInput(e.target.value)}
											 required
										 />
										 <button
											 type="submit"
											 className="px-10 py-3 rounded-xl bg-[#d4af37] text-white font-bold text-lg shadow hover:bg-[#bfa233] transition font-serif"
											 disabled={loading || !input}
										 >
											 {loading ? "Extracting..." : "Extract"}
										 </button>
									 </form>
									 {loading && (
										 <div className="mt-10 flex flex-col items-center">
											 <Shimmer className="w-full h-32 mb-4" />
											 <Shimmer className="w-2/3 h-6 mb-2 mx-auto" />
											 <Shimmer className="w-1/2 h-6 mx-auto" />
											 <div className="mt-4 text-lg font-semibold text-[#bfa233]">Extracting... {extractedCount > 0 ? `${extractedCount} users extracted` : ""}</div>
										 </div>
									 )}
									 {error && <div className="text-red-500 mt-4 text-center font-semibold">{error}</div>}
									 {typeof result === 'object' && result !== null && !loading && (
										 <div className="mt-10 bg-gray-50 border-2 border-gray-200 rounded-2xl p-8 shadow flex flex-col items-center">
											 <div className="text-xl font-bold text-[#bfa233] mb-2">Extraction Complete!</div>
											 <div className="text-lg text-gray-900 mb-4">Total users extracted: <span className="font-bold">{extractedCount}</span></div>
											 <button
												 className="px-8 py-3 rounded-xl bg-[#d4af37] text-white font-bold text-lg shadow hover:bg-[#bfa233] transition font-serif"
												 onClick={() => window.location.href = "/dashboard/your-extractions"}
											 >
												 View Your Extractions
											 </button>
										 </div>
									 )}
								 </div>
							 </div>
						 </main>
					 </div>
				 </div>
			);
}
