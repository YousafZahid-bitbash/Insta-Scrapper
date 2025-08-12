"use client"
import { useEffect, useState } from "react";
import { FaUserFriends, FaUserPlus, FaIdBadge, FaHashtag, FaThumbsUp } from "react-icons/fa";
import Navbar from "@/components/Navbar";
import { supabase } from "../../../supabaseClient";
// import { useUser } from "@supabase/auth-helpers-react"; // Uncomment if using auth helpers
import Sidebar from "@/components/Sidebar";

import "../../globals.css";

const extractOptions = [
	{ label: "Followers/Followings", icon: <FaUserFriends />, value: "followers_followings" },
	{ label: "Likers", icon: <FaThumbsUp />, value: "likers" },
	{ label: "Hashtags", icon: <FaHashtag />, value: "hashtags" },
	{ label: "Posts", icon: <FaIdBadge />, value: "posts" },
	{ label: "Commenters", icon: <FaUserPlus />, value: "commenters" },
];

export default function NewExtractionsPage() {
	const [selected, setSelected] = useState("followers");
	const [input, setInput] = useState("");
	const [coins, setCoins] = useState<number>(0);

				useEffect(() => {
					async function fetchCoins() {
						const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
						console.log("[NewExtractions] userId from localStorage:", userId);
						if (userId) {
							try {
								const { data, error } = await supabase
									.from("users")
									.select("coins")
									.eq("id", userId)
									.single();
								console.log("[NewExtractions] Supabase coins query result:", { data, error });
								if (data && data.coins !== undefined) {
									setCoins(data.coins);
									console.log(`[NewExtractions] Coins set in state:`, data.coins);
								} else {
									console.log("[NewExtractions] No coins found for user");
								}
							} catch (err) {
								console.error("[NewExtractions] Error fetching coins:", err);
							}
						} else {
							console.log("[NewExtractions] No user_id in localStorage");
						}
					}
					fetchCoins();
				}, []);

		console.log("[NewExtractions] Rendering Navbar with coins:", coins);
		return (
			<div className="min-h-screen bg-[#f7f9fc] flex flex-col">
				<Navbar coins={coins} />
			<div className="flex flex-1 w-full">
				<div className="hidden md:block">
					<Sidebar />
				</div>
				<main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:p-8">
					<div className="w-full max-w-4xl">
						<h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">New Extract</h1>
						<p className="text-lg text-gray-500 mb-8">Choose what you want to extract</p>
						<div className="bg-white rounded-2xl shadow p-8">
							<div className="flex flex-wrap gap-2 mb-8">
											{extractOptions.map(opt => (
												<button
													key={opt.value}
										className={`flex items-center gap-2 px-6 py-3 rounded-md border transition font-medium text-base focus:outline-none ${selected === opt.value ? "bg-blue-50 border-blue-400 text-blue-700" : "bg-transparent border-gray-200 text-gray-500 hover:bg-gray-50"}`}
										onClick={() => setSelected(opt.value)}
										type="button"
									>
										<span className="text-lg">{opt.icon}</span>
										{opt.label}
									</button>
								))}
							</div>
							<form className="flex flex-col sm:flex-row items-center gap-4 mt-4">
								<span className="text-2xl text-gray-400">@</span>
								<input
									type="text"
									placeholder="Enter instagram user"
									className="flex-1 px-4 py-3 rounded-md border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
									value={input}
									onChange={e => setInput(e.target.value)}
								/>
								<button
									type="submit"
									className="px-8 py-3 rounded-md bg-blue-100 text-blue-400 font-semibold text-lg cursor-not-allowed"
									disabled
								>
									Extract
								</button>
							</form>
						</div>
					</div>
				</main>
			</div>
			
		</div>
	);
}
