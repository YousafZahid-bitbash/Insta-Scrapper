"use client"
	
import type { ExtractedUser } from "@/services/hikerApi";
import { useEffect, useState } from "react";

import { FaUserFriends, FaUserPlus, FaIdBadge, FaHashtag, FaThumbsUp } from "react-icons/fa";
import Navbar from "@/components/Navbar";
// import Shimmer from "@/components/Shimmer";
import { supabase } from "../../../supabaseClient";
import Sidebar from "@/components/Sidebar";
import "../../globals.css";
// import { userFollowersChunkGqlByUsername, userFollowingChunkGqlByUsername } from "@/services/hikerApi";
import { FilterPanel, FiltersState } from "@/components/FilterPanel";

const extractOptions = [
	{ label: "Followers", icon: <FaUserFriends />, value: "followers" },
	{ label: "Followings", icon: <FaUserPlus />, value: "followings" },
	{ label: "Likers", icon: <FaThumbsUp />, value: "likers" },
	{ label: "Hashtags", icon: <FaHashtag />, value: "hashtags" },
	{ label: "Posts", icon: <FaIdBadge />, value: "posts" },
	{ label: "Commenters", icon: <FaUserPlus />, value: "commenters" },
];

export default function NewExtractionsPage() {
	const [stopRequested, setStopRequested] = useState(false);
	// Multi-404 modal state
	// const [multi404Modal, setMulti404Modal] = useState<{ show: boolean; message: string; failedUser: string; remaining: string[]; retryFn: (() => void) | null }>({ show: false, message: '', failedUser: '', remaining: [], retryFn: null });
	const [selected, setSelected] = useState("followers");
	const [targetsInput, setTargetsInput] = useState("");
	// const [coinLimit, setCoinLimit] = useState<number>(0);
	const [coins, setCoins] = useState<number>(0);
	const [result, setResult] = useState<unknown>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [extractedCount, setExtractedCount] = useState<number>(0);
	// const [progress, setProgress] = useState<{ status: string; target: string; error?: string }[]>([]);
	// Removed unused itemsCollected
	// const [coinsSpent, setCoinsSpent] = useState<number>(0);
	const [filterOpen, setFilterOpen] = useState(false);
	const [filters, setFilters] = useState<FiltersState>({
	extractPhone: false,
	extractEmail: false,
	extractLinkInBio: false,
	privacy: "doesn't matter",
	profilePicture: "doesn't matter",
	verifiedAccount: "doesn't matter",
	businessAccount: "doesn't matter",
	followersMin: '',
	followersMax: '',
	followingsMin: '',
	followingsMax: '',
	filterByName: '',
	filterByNameInBioContains: '',
	filterByNameInBioStop: '',
	coinLimit: '',
	});

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

	// Helper: parse targets from textarea
	const parsedTargets = targetsInput.split(/\r?\n/).map(t => t.trim()).filter(Boolean);
	// const estimatedCoins = parsedTargets.length;

	// Progress bar calculation
	// const processedCount = progress.filter(p => p.status === "Done" || p.status === "Error").length;
	// const totalCount = parsedTargets.length;
	// Removed unused percent

	console.log("[NewExtractions] Rendering Navbar with coins:", coins);
	return (
		<div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f7f9fc] via-[#e3e6f3] to-[#dae0ed]">
			<Navbar coins={coins} />
			<div className="sticky top-0 z-30 bg-gradient-to-br border-b border-[#d4af37]/20 py-3 flex items-center justify-between px-6">
				<h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#bfa233] tracking-tight">New Extraction</h1>
				<div className="flex gap-2">
					<button
					type="button"
					className="bg-[#d4af37] hover:bg-[#bfa233] text-white px-6 py-2 rounded-xl font-bold shadow"
					onClick={() => setFilterOpen(true)}
					>
					Add Filters
					</button>
					<button
					type="button"
					className="px-6 py-2 rounded-xl font-bold border border-[#d4af37]/40 bg-transparent text-[#bfa233] hover:bg-[#f7f9fc]"
					onClick={() => setFilters({
						extractPhone: false,
						extractEmail: false,
						extractLinkInBio: false,
						privacy: "doesn't matter",
						profilePicture: "doesn't matter",
						verifiedAccount: "doesn't matter",
						businessAccount: "doesn't matter",
						followersMin: '',
						followersMax: '',
						followingsMin: '',
						followingsMax: '',
						filterByName: '',
						filterByNameInBioContains: '',
						filterByNameInBioStop: '',
						coinLimit: '',
					})}
					>
					Clear
					</button>
						{loading && (
							<button
								type="button"
								className="px-6 py-2 rounded-xl font-bold border border-red-400 bg-red-500 text-white hover:bg-red-600 ml-2"
								onClick={() => setStopRequested(true)}
							>
								Stop
							</button>
						)}
				</div>
			</div>
			<FilterPanel
				open={filterOpen}
				value={filters}
				onChange={setFilters}
				onClose={() => setFilterOpen(false)}
				reset={() => setFilters({
					extractPhone: false,
					extractEmail: false,
					extractLinkInBio: false,
					privacy: "doesn't matter",
					profilePicture: "doesn't matter",
					verifiedAccount: "doesn't matter",
					businessAccount: "doesn't matter",
					followersMin: '',
					followersMax: '',
					followingsMin: '',
					followingsMax: '',
					filterByName: '',
					filterByNameInBioContains: '',
					filterByNameInBioStop: '',
					coinLimit: '',
				})}
				/>
			<div className="flex flex-1 w-full">
				<div className="hidden md:block">
					<Sidebar />
				</div>
				<main className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:p-16 w-full">
					<div className="w-full max-w-4xl mx-auto">
						<div className="bg-white/90 rounded-3xl shadow-2xl p-12 border border-[#d4af37] mt-8 mb-8 relative">
							{/* Filter Option Button */}
							
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

							{/* {<FilterControls />} */}
							<form
								className="flex flex-col sm:flex-row items-center gap-4 mt-2 justify-center w-full"
										onSubmit={async e => {
											e.preventDefault();
											setResult(null);
											setError(null);
											setLoading(true);
											setStopRequested(false);
											setLoading(true);
											const filterOptions: Record<string, unknown> = {
												extractPhone: filters.extractPhone,
												extractEmail: filters.extractEmail,
												extractLinkInBio: filters.extractLinkInBio,
												privacy: filters.privacy,
												profilePicture: filters.profilePicture,
												verifiedAccount: filters.verifiedAccount,
												businessAccount: filters.businessAccount,
												followersMin: filters.followersMin,
												followersMax: filters.followersMax,
												followingsMin: filters.followingsMin,
												followingsMax: filters.followingsMax,
												filterByName: filters.filterByName,
												filterByNameInBioContains: filters.filterByNameInBioContains,
												filterByNameInBioStop: filters.filterByNameInBioStop,
												coinLimit: filters.coinLimit,
											};
											
											try {
												const mod = await import("@/services/hikerApi");
												if (selected === "followers" || selected === "followings") {
													console.log("[Extraction API Call] method:", selected, "Usernames:", parsedTargets, "Filters:", filterOptions);
													const apiFn = selected === "followers" ? mod.userFollowersChunkGqlByUsername : mod.userFollowingChunkGqlByUsername;
													const apiResult = (await apiFn({ target: parsedTargets, filters: filterOptions })) as { filteredFollowers?: ExtractedUser[] };
													const extractedUsers = Array.isArray(apiResult?.filteredFollowers) ? apiResult.filteredFollowers : [];
													setExtractedCount(extractedUsers.length);
												} else if (selected === "likers") {
													// For likers, parsedTargets are URLs
													console.log("[Extraction API Call] method: likers, URLs:", parsedTargets, "Filters:", filterOptions);
													const apiResult = await mod.mediaLikersBulkV1({ urls: parsedTargets, filters: filterOptions });
													const extractedUsers = Array.isArray(apiResult?.filteredLikers) ? apiResult.filteredLikers : [];
													setExtractedCount(extractedUsers.length);
												} else {
													// ...existing code for hashtags, posts, etc...
												}
											} catch (err) {
												setError(String(err));
											}
											setLoading(false);
												// For example, if you collect them in a variable, save them here
												// If the backend already saves after each target, you may not need to do anything
												// If you need to trigger a final save, do it here
												// Example: show a message or refresh extractions
												// window.location.href = "/dashboard/your-extractions";
											}
								// End of async onSubmit
							}
							>
								<div className="flex w-full gap-4 items-start">
									<textarea
										rows={6}
										className="flex-1 px-5 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d4af37] font-serif text-lg shadow-sm resize-y"
										placeholder={selected === "followers" || selected === "followings"
											? "Enter each username on a unique line\n@johndoe\n@janedoe"
											: selected === "likers"
												? "Add the URL of the Instagram post (e.g. https://instagram.com/p/CA2aJYrg6cZ/)"
												: "Paste targets here (one per line):\n@username, username, post URL, #hashtag, word..."}
										value={targetsInput}
										onChange={e => setTargetsInput(e.target.value)}
										required
									/>
								</div>
								<button
									type="submit"
									className="px-10 py-3 rounded-xl bg-[#d4af37] text-white font-bold text-lg shadow hover:bg-[#bfa233] transition font-serif mt-4"
									disabled={loading || !targetsInput}
								>
									{loading ? "Extracting..." : "Extract"}
								</button>
								
							</form>
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
