"use client"
import { useEffect, useState } from "react";
import { FaUserFriends, FaUserPlus, FaIdBadge, FaHashtag, FaThumbsUp } from "react-icons/fa";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/Sidebar";
import "../../globals.css";
import { FilterPanel, FiltersState } from "@/components/FilterPanel";



const extractOptions = [
	{ label: "Followers", icon: <FaUserFriends />, value: "followers" },
	{ label: "Followings", icon: <FaUserPlus />, value: "following" },
	{ label: "Likers", icon: <FaThumbsUp />, value: "likers" },
	{ label: "Hashtags", icon: <FaHashtag />, value: "hashtags" },
	{ label: "Posts", icon: <FaIdBadge />, value: "posts" },
	{ label: "Commenters", icon: <FaUserPlus />, value: "commenters" },
];

export default function NewExtractionsPage() {
	const router = useRouter();
	const [showCoinError, setShowCoinError] = useState(false);
		const [showSuccess, setShowSuccess] = useState(false);
		const [extractionId, setExtractionId] = useState<string | null>(null);
		const [polling, setPolling] = useState(false);
	// const [stopRequested, setStopRequested] = useState(false);
	// Multi-404 modal state
	// const [multi404Modal, setMulti404Modal] = useState<{ show: boolean; message: string; failedUser: string; remaining: string[]; retryFn: (() => void) | null }>({ show: false, message: '', failedUser: '', remaining: [], retryFn: null });
	const [selected, setSelected] = useState("followers");
	const [targetsInput, setTargetsInput] = useState("");
	// const [coinLimit, setCoinLimit] = useState<number>(0);
		const [coins, setCoins] = useState<number>(0);
		const [userId, setUserId] = useState<string | null>(null);
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
			async function checkAuthAndFetchCoins() {
				try {
					const res = await fetch("/api/me");
					if (!res.ok) throw new Error("Not authenticated");
					const user = await res.json();
					if (user && typeof user.coins === "number") setCoins(user.coins);
					if (user && user.id) setUserId(user.id);
				} catch {
					// Not authenticated, redirect to login
					router.replace("/auth/login");
				}
			}
			checkAuthAndFetchCoins();
		}, [router]);

	useEffect(() => {
		if (!polling || !extractionId) return;
			const poll = async () => {
				try {
					const res = await fetch(`/api/extractions/status?id=${extractionId}`);
					if (!res.ok) throw new Error('Failed to fetch extraction status');
					const data = await res.json();
					// Update progress if available
					if (data.progress !== undefined) {
						setProgressCount(data.progress);
					}
					if (data.status === 'completed') {
						setShowSuccess(true);
						setPolling(false);
						setProgressCount(data.progress || progressCount); // Final progress count
					} else if (data.status === 'failed') {
						setError('Extraction failed.');
						setPolling(false);
					}
				} catch (err) {
					setError(String(err));
					setPolling(false);
				}
			};
			const interval = setInterval(poll, 2000); // Poll every 2 seconds for better UX
			return () => clearInterval(interval);
	}, [polling, extractionId, progressCount]);

	// Helper: parse targets from textarea
	const parsedTargets = targetsInput.split(/\r?\n/).map(t => t.trim()).filter(Boolean);
	// const estimatedCoins = parsedTargets.length;

	// Progress bar calculation
	// const processedCount = progress.filter(p => p.status === "Done" || p.status === "Error").length;
	// const totalCount = parsedTargets.length;
	// Removed unused percent

	console.log("[NewExtractions] Rendering Navbar with coins:", coins);
	return (
		<div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
			<Navbar coins={coins} />
			
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
			
			{/* Fixed Sidebar */}
			<div className="hidden md:block">
				<Sidebar />
			</div>
			
			<main className="flex-1 p-6 lg:p-8 md:ml-64"> {/* Add left margin for fixed sidebar */}
					<div className="max-w-5xl mx-auto">
						{/* Header Section */}
						<div className="text-center mb-8">
							<h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent mb-4">
								New Extraction
							</h1>
							<p className="text-lg text-gray-600 max-w-2xl mx-auto">
								Extract valuable data from Instagram with precision and advanced filtering options
							</p>
						</div>

						{/* Main Content Container */}
						<div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
							{/* Extraction Options */}
							<div className="p-8 border-b border-gray-100">
								<h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
									Choose Extraction Type
								</h2>
								<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
									{extractOptions.map(opt => (
										<button
											key={opt.value}
											className={`group relative p-2 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
												selected === opt.value 
													? "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300 shadow-sm" 
													: "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
											}`}
											onClick={() => setSelected(opt.value)}
											type="button"
										>
											<div className="flex flex-row items-center gap-3">
												<div className={`p-3 rounded-lg transition-colors ${
													selected === opt.value 
														? "bg-gradient-to-r from-amber-400 to-yellow-500 text-white" 
														: "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
												}`}>
													<span className="text-2xl">{opt.icon}</span>
												</div>
												<span className={`font-semibold text-sm ${
													selected === opt.value ? "text-amber-700" : "text-gray-700"
												}`}>
													{opt.label}
												</span>
											</div>
										</button>
									))}
								</div>
							</div>

							{/* Controls Section */}
							<div className="p-4 border-b border-gray-100 bg-gray-50/50">
								<div className="flex flex-wrap gap-3 justify-center mb-6">
									<button
										type="button"
										className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-white px-6 py-3 rounded-lg font-semibold shadow-sm transition-all duration-200"
										onClick={() => setFilterOpen(true)}
									>
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
										</svg>
										Add Filters
									</button>
									<button
										type="button"
										className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
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
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
										</svg>
										Clear Filters
									</button>
									{loading && (
										<button
											type="button"
											className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold border border-red-300 bg-red-500 text-white hover:bg-red-600 transition-all duration-200"
										>
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9l6 6m0-6l-6 6" />
											</svg>
											Stop
										</button>
									)}
								</div>
							</div>

							{/* Form Section */}
							<div className="p-8">
								<form
									className="space-y-6"
													onSubmit={async e => {
														e.preventDefault();
														setResult(null);
														setError(null);
														// Check coin balance
														if (coins <= 0) {
															setShowCoinError(true);
															setTimeout(() => setShowCoinError(false), 5000);
															return;
														}
														// Check coin limit filter
														const coinLimitNum = Number(filters.coinLimit);
														if (filters.coinLimit && (!Number.isFinite(coinLimitNum) || coinLimitNum <= 0 || coinLimitNum > coins)) {
															if (coinLimitNum <= 0) {
																setError(`Coin limit must be greater than 0.`);
															} else if (coinLimitNum > coins) {
																setError(`Coin limit cannot exceed your current coin balance (${coins}).`);
															}
															return;
														}
														setLoading(true);
														try {
															// Call your backend API to create a new extraction job
															const response = await fetch('/api/extractions/create', {
																method: 'POST',
																headers: { 'Content-Type': 'application/json' },
																body: JSON.stringify({
																	user_id: userId,
																	type: selected,
																	targets: parsedTargets,
																	filters,
																}),
															});
															if (!response.ok) throw new Error('Failed to start extraction job');
															const data = await response.json();
															if (!data.id) throw new Error('No extraction job ID returned');
															setExtractionId(data.id);
															setPolling(true);
														} catch (err) {
															setError(String(err));
														}
														setLoading(false);
													}}
	// Poll extraction job status
	
							>
								{/* Coin Limit Input */}
								<div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
									<div className="flex items-center gap-3 mb-4">
										<div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center">
											<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
											</svg>
										</div>
										<div>
											<label htmlFor="coinLimit" className="block text-sm font-semibold text-gray-800">
												Coin Limit (Optional)
											</label>
											<p className="text-xs text-gray-600">
												Set a maximum number of coins to spend on this extraction
											</p>
										</div>
									</div>
									<div className="flex items-center gap-4">
										<input
											type="number"
											id="coinLimit"
											placeholder={`Enter limit (Current: ${coins})`}
											className="flex-1 px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all duration-200"
											value={filters.coinLimit}
											onChange={e => setFilters({ ...filters, coinLimit: e.target.value })}
											min={0}
										/>
										<div className="flex items-center gap-2 text-sm">
											<span className="text-gray-600">Available:</span>
											<span className="font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-lg">{coins}</span>
										</div>
									</div>
								</div>

								{/* Target Input Section */}
								<div className="space-y-4">
									<div className="flex items-center gap-3">
										<div className="w-8 h-8 rounded-lg bg-gradient-to-r from-gray-400 to-gray-600 flex items-center justify-center">
											<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
											</svg>
										</div>
										<div>
											<h3 className="text-lg font-semibold text-gray-800">Target Input</h3>
											<p className="text-sm text-gray-600">
												{selected === "followers" || selected === "following" || selected === "posts"
													? "Enter Instagram usernames (one per line)"
													: selected === "likers"
														? "Enter Instagram post URLs"
														: selected === "hashtags"
															? "Enter hashtag keywords (without # symbol)"
															: "Enter your targets (one per line)"
												}
											</p>
										</div>
									</div>
									<textarea
										rows={8}
										className="w-full px-4 py-4 rounded-lg border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all duration-200 resize-none"
										placeholder={
											selected === "followers" || selected === "following" || selected === "posts"
												? "Enter each username on a unique line:\n@johndoe\n@janedoe\n@instagram"
												: selected === "likers"
													? "Add Instagram post URLs:\nhttps://instagram.com/p/CA2aJYrg6cZ/\nhttps://instagram.com/p/CB3bKZsh7dA/"
													: selected === "hashtags"
														? "Enter hashtags (one per line):\ntravel\nsunset\nfood\nphotography"
														: selected === "commenters"
															? "Add Instagram post URLs:\nhttps://instagram.com/p/CA2aJYrg6cZ/"
															: "Paste targets here (one per line)"
										}
										value={targetsInput}
										onChange={e => setTargetsInput(e.target.value)}
										required
									/>
									<div className="flex items-center justify-between text-sm text-gray-500">
										<span>
											{parsedTargets.length} {parsedTargets.length === 1 ? 'target' : 'targets'} entered
										</span>
										{targetsInput && (
											<button
												type="button"
												onClick={() => setTargetsInput('')}
												className="text-red-500 hover:text-red-700 font-medium"
											>
												Clear all
											</button>
										)}
									</div>
								</div>

								{/* Submit Button */}
								<div className="flex justify-center pt-4">
									<button
										type="submit"
										className="group relative px-12 py-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
										disabled={loading || !targetsInput}
									>
										{loading ? (
											<>
												<svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
													<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
													<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
												</svg>
												Extracting...
											</>
										) : (
											<>
												<svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
												</svg>
												Start Extraction
											</>
										)}
									</button>
								</div>
							</form>

							{/* Error Message */}
							{error && (
								<div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
									<div className="flex items-center gap-3">
										<svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
										</svg>
										<span className="text-red-700 font-medium">{error}</span>
									</div>
								</div>
							)}

							{/* Progress Section */}
							{loading && (
								<div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
									<div className="text-center space-y-4">
										<h3 className="text-lg font-semibold text-gray-800">Extraction in Progress</h3>
										<div className="space-y-2">
											<div className="flex justify-between text-sm">
												<span className="text-gray-600">
													{progressTotal > 0 ? (
														<>Extracted: {progressCount.toLocaleString()} / {progressTotal.toLocaleString()} {
															selected === "followers" || selected === "following" || selected === "likers"
																? "users"
																: selected === "commenters"
																	? "comments"
																	: selected === "hashtags"
																		? "posts"
																		: selected === "posts"
																			? "posts"
																			: "items"
														}</>
													) : (
														<>Extracted: {progressCount.toLocaleString()} {
															selected === "followers" || selected === "following" || selected === "likers"
																? "users"
																: selected === "commenters"
																	? "comments"
																	: selected === "hashtags"
																		? "posts"
																		: selected === "posts"
																			? "posts"
																			: "items"
														}</>
													)}
												</span>
												<span className="text-gray-600 font-medium">
													{progressTotal > 0 
														? `${Math.min(100, Math.round((progressCount / progressTotal) * 100))}%`
														: 'Processing...'
													}
												</span>
											</div>
											{progressTotal > 0 ? (
												<div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
													<div
														className="bg-gradient-to-r from-blue-400 to-indigo-500 h-3 rounded-full transition-all duration-500 ease-out"
														style={{ width: `${Math.min(100, (progressCount / progressTotal) * 100)}%` }}
													></div>
												</div>
											) : (
												<div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
													<div className="bg-gradient-to-r from-blue-400 to-indigo-500 h-3 rounded-full animate-pulse w-full"></div>
												</div>
											)}
										</div>
										{progressTotal > 0 ? (
											<p className="text-sm text-gray-600">
												Estimated {progressTotal.toLocaleString()} total items. Please wait while we collect your data...
											</p>
										) : (
											<p className="text-sm text-gray-600">
												Calculating total... Please wait while we collect your data...
											</p>
										)}
									</div>
								</div>
							)}
						</div>
						</div>
					</div>
				</main>

			{/* Modern Coin Error Modal */}
			{showCoinError && (
				<>
					<div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
						<div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform animate-bounce-in">
							<div className="text-center">
								<div className="w-16 h-16 bg-gradient-to-r from-red-400 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
									<svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
									</svg>
								</div>
								<h3 className="text-2xl font-bold text-gray-900 mb-2">Insufficient Coins</h3>
								<p className="text-gray-600 mb-6">
									You need more coins to start this extraction. Please purchase more coins to continue.
								</p>
								<div className="flex items-center justify-center gap-2 mb-6">
									<span className="text-gray-500">Current balance:</span>
									<span className="font-bold text-2xl text-red-600 bg-red-50 px-4 py-2 rounded-lg border border-red-200">{coins}</span>
								</div>
								<div className="flex gap-3">
									<button
										className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-white font-semibold rounded-lg transition-all duration-200"
										onClick={() => window.location.href = "/dashboard/billing"}
									>
										Get Coins
									</button>
									<button
										className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all duration-200"
										onClick={() => setShowCoinError(false)}
									>
										Cancel
									</button>
								</div>
							</div>
						</div>
					</div>
				</>
			)}

			{/* Modern Success Modal */}
			{showSuccess && (
				<>
					<div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
						<div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform animate-bounce-in">
							<div className="text-center">
								<div className="w-16 h-16 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
									<svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
									</svg>
								</div>
								<h3 className="text-2xl font-bold text-gray-900 mb-2">Extraction Complete!</h3>
								<p className="text-gray-600 mb-6">
									Your Instagram data has been successfully extracted. You can now view and download your results.
								</p>
								<div className="flex gap-3">
									<button
										className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-white font-semibold rounded-lg transition-all duration-200"
										onClick={() => window.location.href = "/dashboard/your-extractions"}
									>
										View Results
									</button>
									<button
										className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all duration-200"
										onClick={() => setShowSuccess(false)}
									>
										Close
									</button>
								</div>
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
