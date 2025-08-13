
"use client";
import HomeNavbar from "@/components/HomeNavbar";
import '@/app/globals.css';

import { useRef, useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";

type Deal = {
	id: number;
	coins: number;
	price: number;
	sale_price?: number | null;
	description?: string | null;
	active: boolean;
};


export default function PricingPage() {
	const [deals, setDeals] = useState<Deal[]>([]);
	const [loading, setLoading] = useState(true);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		async function fetchDeals() {
			const { data, error } = await supabase
				.from("deals")
				.select("id, coins, price, sale_price, description, active")
				.eq("active", true)
				.order("price", { ascending: true });
			if (!error && data) setDeals(data);
			setLoading(false);
		}
		fetchDeals();
			}, []);

	const scenes = [
		{
			id: 'deals',
			content: (
				<section className="h-screen w-full flex flex-col items-center justify-center bg-[#222] text-white transition-all duration-700">
					<div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl p-12 border border-[#d4af37] relative">
						<div className="absolute -top-8 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-[#d4af37] flex items-center justify-center shadow-lg border-4 border-white">
							<svg width="36" height="36" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M12 12.713l11.985-7.713A1 1 0 0023 4H1a1 1 0 00-.985 1.001L12 12.713z"/><path fill="#fff" d="M12 14.713l-12-7.713V20a1 1 0 001 1h22a1 1 0 001-1V7l-12 7.713z"/></svg>
						</div>
						<h1 className="text-4xl font-serif font-bold text-center mb-6 text-gray-900 tracking-tight" style={{fontFamily:'Georgia,serif'}}>Pricing & Deals</h1>
						<p className="text-center text-gray-700 mb-8 text-lg font-light">Unlock powerful Instagram data extraction with our coin-based system. Each coin lets you extract data from profiles, posts, hashtags, followers, and more. Choose a deal below and start extracting instantly!</p>
						{loading ? (
							<div className="text-center text-lg text-gray-500">Loading deals...</div>
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
										<button className="w-full px-6 py-3 rounded bg-[#d4af37] text-white font-semibold text-lg shadow hover:bg-[#bfa233] transition font-serif">Buy Now</button>
									</div>
								))}
							</div>
						)}
					</div>
				</section>
			)
		},
		{
			id: 'explanation',
			content: (
				<section className="h-screen w-full flex flex-col items-center justify-center bg-white text-black transition-all duration-700 relative overflow-hidden">
					<div className="absolute inset-0 pointer-events-none">
						<svg width="100%" height="100%" viewBox="0 0 1440 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute top-0 left-0 w-full h-32">
							<path fill="#d4af37" fillOpacity="0.08" d="M0,160L60,165.3C120,171,240,181,360,165.3C480,149,600,107,720,117.3C840,128,960,192,1080,218.7C1200,245,1320,235,1380,229.3L1440,224L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z"></path>
						</svg>
					</div>
					<div className="max-w-2xl mx-auto text-center text-black text-base font-serif relative z-10 bg-white/80 rounded-2xl shadow-xl p-10 border border-[#d4af37]">
						<h2 className="text-3xl font-bold mb-4 font-serif text-[#d4af37]">How It Works</h2>
						<p className="mb-6 text-lg">Simply purchase coins, then use them to extract the Instagram data you need. No subscriptions, no hidden fees. Your coins never expire and you can use them for any extraction type supported by Insta Scrapper.</p>
						<ul className="list-disc list-inside text-left mx-auto inline-block mb-6">
							<li>Choose a deal and click &quot;Buy Now&quot;</li>
							<li>Complete your purchase securely</li>
							<li>Coins are instantly credited to your account</li>
							<li>Start extracting data right away!</li>
						</ul>
						<div className="mt-8 text-center">
							<span className="inline-block px-6 py-3 rounded bg-[#d4af37] text-white font-semibold text-lg shadow font-serif">Get Started Today</span>
						</div>
					</div>
					<div className="absolute bottom-0 left-0 w-full h-32 pointer-events-none">
						<svg width="100%" height="100%" viewBox="0 0 1440 320" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path fill="#d4af37" fillOpacity="0.08" d="M0,224L60,218.7C120,213,240,203,360,218.7C480,235,600,277,720,266.7C840,256,960,192,1080,165.3C1200,139,1320,149,1380,154.7L1440,160L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path>
						</svg>
					</div>
				</section>
			)
		}
	];

	useEffect(() => {
		let currentScene = 0;
		const handleWheel = (e: WheelEvent) => {
			if (!containerRef.current) return;
			const delta = e.deltaY;
			if (delta > 0 && currentScene < scenes.length - 1) {
				currentScene++;
				containerRef.current.scrollTo({
					top: currentScene * window.innerHeight,
					behavior: 'smooth',
				});
			} else if (delta < 0 && currentScene > 0) {
				currentScene--;
				containerRef.current.scrollTo({
					top: currentScene * window.innerHeight,
					behavior: 'smooth',
				});
			}
		};
		const ref = containerRef.current;
		ref?.addEventListener('wheel', handleWheel, { passive: false });
		return () => {
			ref?.removeEventListener('wheel', handleWheel);
		};
	}, []);

	return (
		<>
			<HomeNavbar />
			<div
				ref={containerRef}
				style={{
					height: '100vh',
					width: '100vw',
					overflowY: 'scroll',
					scrollSnapType: 'y mandatory',
				}}
				className="scroll-smooth"
			>
				{scenes.map(scene => (
					<div
						key={scene.id}
						style={{ height: '100vh', width: '100vw', scrollSnapAlign: 'start' }}
					>
						{scene.content}
					</div>
				))}
			</div>
		</>
	);
}
