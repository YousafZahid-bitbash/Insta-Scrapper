"use client"
	
// import type { ExtractedUser } from "@/services/hikerApi";
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
	const [showCoinError, setShowCoinError] = useState(false);
	const [showSuccess, setShowSuccess] = useState(false);
	// const [stopRequested, setStopRequested] = useState(false);
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
	//Progress count
	const [progressCount, setProgressCount] = useState<number>(0);
	const [progressTotal, setProgressTotal] = useState<number>(0);
	
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
			<div className="sticky top-0 z-30 bg-gradient-to-br py-0 flex items-center justify-center px-0 w-full">
				
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
							postDateFrom: '',
							postDateTo: '',
							postType: 'any',
							postLikesMin: '',
							postLikesMax: '',
							postCommentsMin: '',
							postCommentsMax: '',
							postCaptionContains: '',
							postHashtagsContains: '',
							postLocation: '',
						})}
						selectedType={selected}
					/>
			<div className="flex flex-1 w-full">
				<div className="hidden md:block">
					<Sidebar />
				</div>
				<main className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:p-16 w-full">
					<div className="w-full max-w-4xl mx-auto">
						<div className="bg-white/90 rounded-3xl shadow-2xl p-12 border border-[#d4af37] mt-8 mb-8 relative">
							{/* Add Filters Button and controls moved below options */}
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
							<div className="flex gap-3 justify-center mb-6">
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
										// onClick={() => setStopRequested(true)}
									>
										Stop
									</button>
								)}
							</div>

							{/* {<FilterControls />} */}
							<form
								className="flex flex-col sm:flex-row items-center gap-4 mt-2 justify-center w-full"
								onSubmit={async e => {
									e.preventDefault();
														setResult(null);
														setError(null);
														if (coins <= 0) {
															setShowCoinError(true);
															setTimeout(() => setShowCoinError(false), 5000);
															return;
														}
														setLoading(true);
														try {
										const mod = await import("@/services/hikerApi");
										let filterOptions: Record<string, unknown> = {};
										if (selected === "posts") {
											filterOptions = {
												likesMin: filters.postLikesMin,
												likesMax: filters.postLikesMax,
												commentsMin: filters.postCommentsMin,
												commentsMax: filters.postCommentsMax,
												captionContains: filters.postCaptionContains,
												captionStopWords: filters.postCaptionStopWords,
												coinLimit: filters.coinLimit,
											};
											console.log("[Extraction API Call] method: posts, Usernames:", parsedTargets, "Filters:", filterOptions);
											setProgressCount(0);
											setProgressTotal(0);
											const apiResult = await mod.getUserPosts(
												{ target: parsedTargets, filters: filterOptions },
												(count: number) => {
													setProgressCount(count);
													setProgressTotal(prev => prev || count);
												}
											);
											const extractedPosts = Array.isArray(apiResult?.extractedPosts) ? apiResult.extractedPosts : [];
											setExtractedCount(extractedPosts.length);
										} else if (selected === "commenters") {
											filterOptions = {
												commentExcludeWords: filters.commentExcludeWords,
												commentStopWords: filters.commentStopWords,
												coinLimit: filters.coinLimit,
											};
											console.log("[Extraction API Call] method: commenters, URLs:", parsedTargets, "Filters:", filterOptions);
											setProgressCount(0);
											setProgressTotal(0);
											const apiResult = await mod.extractCommentersBulkV2(
												{ urls: parsedTargets, filters: filterOptions },
												(count: number) => {
													setProgressCount(count);
													setProgressTotal(prev => prev || count);
												}
											);
											const extractedUsers = Array.isArray(apiResult?.comments) ? apiResult.comments : [];
											setExtractedCount(extractedUsers.length);
										} else if (selected === "hashtags") {
											filterOptions = {
												coinLimit: filters.coinLimit,
												hashtagLimit: filters.hashtagLimit,
											};
											// parsedTargets is array of hashtags
											console.log("[Extraction API Call] method: hashtags, Hashtags:", parsedTargets, "Filters:", filterOptions);
											setProgressCount(0);
											setProgressTotal(0);
											const apiResult = await mod.extractHashtagClipsBulkV2(
												{ hashtags: parsedTargets, filters: filterOptions },
												(count: number) => {
													setProgressCount(count);
													setProgressTotal(prev => prev || count);
												}
											);
											const extractedClips = Array.isArray(apiResult?.clips) ? apiResult.clips : [];
											setExtractedCount(extractedClips.length);
										} else if (selected === "followers" || selected === "followings") {
											filterOptions = {
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
											console.log("[Extraction API Call] method:", selected, "Usernames:", parsedTargets, "Filters:", filterOptions);
											const apiFn = selected === "followers" ? mod.userFollowersChunkGqlByUsername : mod.userFollowingChunkGqlByUsername;
											setProgressCount(0);
											setProgressTotal(0);
											const apiResult = (await apiFn(
												{ target: parsedTargets, filters: filterOptions },
												(count: number) => {
													setProgressCount(count);
													// If you know the total, set it here. Otherwise, fallback to previous logic:
													setProgressTotal(prev => prev || count); // This will set total to first count, update if you have a better estimate
												}
											)) as { filteredFollowers?: unknown[] };
											const extractedUsers = Array.isArray(apiResult?.filteredFollowers) ? apiResult.filteredFollowers : [];
											setExtractedCount(extractedUsers.length);
										} else if (selected === "likers") {
											filterOptions = {
												coinLimit: filters.coinLimit,
											};
											console.log("[Extraction API Call] method: likers, URLs:", parsedTargets, "Filters:", filterOptions);
											setProgressCount(0);
											setProgressTotal(0);
											const apiResult = await mod.mediaLikersBulkV1(
												{ urls: parsedTargets, filters: filterOptions },
												(count: number) => {
													setProgressCount(count);
													setProgressTotal(prev => prev || count);
												}
											);
											const extractedUsers = Array.isArray(apiResult?.filteredLikers) ? apiResult.filteredLikers : [];
											setExtractedCount(extractedUsers.length);
										}
									} catch (err) {
										setError(String(err));
									}
									  setLoading(false);
									  setShowSuccess(true);
									  setTimeout(() => setShowSuccess(false), 5000);
								}}
							>
								<div className="flex w-full gap-4 items-start">
									<textarea
										rows={6}
										className="flex-1 px-5 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d4af37] font-serif text-lg shadow-sm resize-y"
										placeholder={
											selected === "followers" || selected === "followings" || selected === "posts"
												? "Enter each username on a unique line\n@johndoe\n@janedoe"
												: selected === "likers"
													? "Add the URL of the Instagram post (e.g. https://instagram.com/p/CA2aJYrg6cZ/)"
													: selected === "hashtags"
														? "Enter hashtags, one word per line (without the # sign):\ntravel\nsunset\nfood"
														: "Paste targets here (one per line):\n@username, username, post URL, #hashtag, word..."
										}
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
							{showCoinError && (
								<div className="fixed bottom-90 left-1/2 transform -translate-x-1/2 bg-gray-900 border border-[#bfa233] rounded-2xl p-6 shadow-2xl flex flex-col items-center z-50 animate-fade-in" style={{ minWidth: 600 }}>
									<div className="flex items-center gap-3 mb-4">
										<svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-[#d4af37]"><circle cx="12" cy="12" r="10" strokeWidth="2"/><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01"/></svg>
										<span className="text-2xl font-extrabold text-[#d4af37] drop-shadow">Insufficient Coin Balance</span>
									</div>
									<div className="text-lg text-white mb-4 text-center font-medium drop-shadow" style={{ textShadow: '0 1px 6px #222' }}>
										You need more coins to start extraction.<br/>Please refill your balance to continue.
									</div>
									<div className="flex items-center gap-2 mb-6">
										<span className="text-base text-[#f7f9fc] font-semibold">Current coins:</span>
										<span className="font-extrabold text-xl text-[#d4af37] bg-[#222] px-4 py-2 rounded-full border-2 border-[#d4af37] shadow-lg">{coins}</span>
									</div>
									<button
										className="px-8 py-3 rounded-2xl bg-gradient-to-r from-[#d4af37] via-[#222] to-black text-white font-extrabold text-lg shadow-lg hover:scale-105 transition-all font-serif border-2 border-[#d4af37]"
										style={{ letterSpacing: '0.03em' }}
										onClick={() => window.location.href = "/dashboard/billing"}
									>
										Get Coins
									</button>
								</div>
							)}
							{/* Progress bar at the bottom, only visible when loading */}
							{loading && (
								<div className="w-full flex flex-col items-center gap-4 mt-8">
									<div className="w-full max-w-md flex flex-col items-center">
										<span className="font-bold text-lg text-[#bfa233] mb-2 tracking-wide">
											Extracted: {progressCount} {
												selected === "followers" || selected === "followings" || selected === "likers"
													? "users"
													: selected === "commenters"
														? "comments"
														: selected === "hashtags"
															? "hashtags"
															: selected === "posts"
																? "posts"
																: "items"
											}
										</span>
										<div className="w-full bg-gray-200 rounded-full h-6 shadow-inner overflow-hidden">
											<div
												className="bg-gradient-to-r from-[#d4af37] via-[#bfa233] to-[#f7f9fc] h-6 rounded-full transition-all duration-300"
												style={{ width: `${progressTotal ? Math.min(100, (progressCount / progressTotal) * 100) : 0}%` }}
											></div>
										</div>
										<span className="text-xs text-gray-500 mt-1">Please wait while we collect your data.</span>
									</div>
								</div>
							)}
							{showSuccess && (
								<div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white border-2 border-[#d4af37] rounded-2xl p-6 shadow-lg flex flex-col items-center z-50 animate-fade-in">
									<div className="text-xl font-bold text-[#bfa233] mb-2">Extraction Completed!</div>
									<button
										className="px-8 py-3 rounded-xl bg-[#d4af37] text-white font-bold text-lg shadow hover:bg-[#bfa233] transition font-serif"
										onClick={() => window.location.href = "/dashboard/your-extractions"}
									>
										View Extraction
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
