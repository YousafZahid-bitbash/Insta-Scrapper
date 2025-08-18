"use client";
import React, { useEffect, useState } from "react";
import HomeNavbar from "@/components/HomeNavbar";
import Shimmer from "@/components/Shimmer";
import { supabase } from "../supabaseClient";

const features = [
	{
		title: "Instagram Profile Scraping",
		description:
			"Extract public profile data including username, bio, followers, following, and posts with a single click.",
		icon: <span className="text-gold-500 text-3xl">&#128269;</span>,
	},
	{
		title: "Bulk Extraction",
		description:
			"Scrape multiple profiles, followers, or following lists in bulk for efficient data collection.",
		icon: <span className="text-gold-500 text-3xl">&#128230;</span>,
	},
	{
		title: "Export to CSV",
		description:
			"Download extracted data in CSV format for easy analysis and integration.",
		icon: <span className="text-gold-500 text-3xl">&#128196;</span>,
	},
	{
		title: "Dashboard & History",
		description:
			"Track your extractions, view history, and manage your account from a modern dashboard.",
		icon: <span className="text-gold-500 text-3xl">&#128202;</span>,
	},
];

const testimonials = [
	{
		quote: "InstaScraper is the gold standard for Instagram data extraction. Fast, reliable, and beautifully designed.",
		author: "Sarah M.",
		role: "Digital Marketer",
	},
	{
		quote: "The luxury feel and ease of use make it my go-to tool for influencer research.",
		author: "James L.",
		role: "Brand Strategist",
	},
];

export default function LandingPage() {
	const [pricing, setPricing] = useState<any[]>([]);
	useEffect(() => {
		async function fetchPricing() {
			const { data, error } = await supabase.from("deals").select("*");
			if (!error && data) setPricing(data);
		}
		fetchPricing();
	}, []);

	return (
		<div className="min-h-screen bg-black flex flex-col font-sans">
			<HomeNavbar />
			{/* Hero Section */}
			<section className="w-full bg-[#3b3b3b] py-25 md:py-10 px-4 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[700px] md:min-h-[900px]">
				{/* Premium golden geometric accent background */}
				<div className="absolute inset-0 w-full h-full pointer-events-none z-0">
					{/* SVG geometric lines with gold and glow */}
					<svg className="absolute inset-0 w-full h-full" viewBox="0 0 1440 600" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
						<defs>
							<filter id="gold-glow" x="-50%" y="-50%" width="200%" height="200%">
								<feGaussianBlur stdDeviation="24" result="glow" />
								<feColorMatrix type="matrix" values="1.5 0 0 0 0  0 1.2 0 0 0  0 0 0.5 0 0  0 0 0 1 0" result="bright" />
								<feMerge>
									<feMergeNode in="bright" />
									<feMergeNode in="SourceGraphic" />
								</feMerge>
							</filter>
						</defs>
						<line x1="330" y1="80" x2="1440" y2="0" stroke="#ffd700" strokeWidth="4" opacity="0.45" filter="url(#gold-glow)" />
						<line x1="0" y1="520" x2="1440" y2="600" stroke="#ffd700" strokeWidth="4" opacity="0.45" filter="url(#gold-glow)" />
						<line x1="200" y1="0" x2="1240" y2="600" stroke="#ffe066" strokeWidth="3" opacity="0.35" filter="url(#gold-glow)" />
						<line x1="0" y1="300" x2="1440" y2="300" stroke="#fffbe6" strokeWidth="2.5" opacity="0.30" filter="url(#gold-glow)" />
					</svg>
					{/* Semi-transparent overlay for contrast */}
					<div className="absolute inset-0 w-full h-full bg-black/60" />
				</div>
				<div className="relative z-10 w-full flex flex-col items-center justify-center">
					<h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tight leading-tight drop-shadow-lg" style={{fontFamily: 'Montserrat, sans-serif'}}>
						Elevate Your Instagram Data Extraction
					</h1>
					<div className="w-24 h-2 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-full mx-auto mb-8" />
					<p className="text-lg md:text-2xl text-gray-200 mb-10 max-w-2xl mx-auto font-light" style={{fontFamily: 'Inter, sans-serif'}}>
						Experience luxury-grade scraping with speed, security, and style. No coding required.
					</p>
					<a href="#signup" className="inline-block px-10 py-4 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black font-bold text-lg rounded-full shadow-lg hover:scale-105 hover:shadow-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500">
						Get Started
					</a>
				</div>
			</section>

			{/* Features Section */}
			<section className="w-full  py-16 px-4 md:px-16 bg-white ">
				<h2 className="text-3xl font-bold text-black mb-8 text-center" style={{fontFamily: 'Montserrat, sans-serif'}}>Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature) => (
					<div key={feature.title} className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center border border-gray-100 hover:shadow-2xl transition-all duration-200">
						<div className="mb-4">{feature.icon}</div>
						<h3 className="text-xl font-bold text-black mb-2" style={{fontFamily: 'Montserrat, sans-serif'}}>{feature.title}</h3>
						<p className="text-gray-700 text-center font-light" style={{fontFamily: 'Inter, sans-serif'}}>{feature.description}</p>
					</div>

				))}
        </div>
			</section>

			{/* Testimonial Section */}
			<section className="w-full  py-16 px-4 md:px-16 bg-black flex flex-col items-center">
				<h2 className="text-3xl font-bold text-white mb-8 text-center" style={{fontFamily: 'Montserrat, sans-serif'}}>Trusted by Professionals</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
					{testimonials.map((t, idx) => (
						<div key={idx} className="bg-white rounded-2xl p-8 shadow-lg border border-gray-800 flex flex-col items-center">
							<span className="text-yellow-500 text-4xl mb-4">&#10077;</span>
							<p className="text-lg text-black mb-4 text-center font-light" style={{fontFamily: 'Inter, sans-serif'}}>{t.quote}</p>
							<div className="text-yellow-400 font-bold text-md mb-1">{t.author}</div>
							<div className="text-black text-sm">{t.role}</div>
						</div>
					))}
				</div>
			</section>

			{/* Pricing Section */}
			<section className="w-full py-16 px-4 md:px-16 bg-white" id="pricing">
				<h2 className="text-3xl font-bold text-black mb-8 text-center" style={{fontFamily: 'Montserrat, sans-serif'}}>Pricing Plans</h2>
				<div className="grid grid-cols-1 md:grid-cols-4 gap-8">
					{pricing.length === 0 ? (
						<>
							<div className="col-span-3 flex flex-col gap-6">
								<Shimmer className="h-32 w-full rounded-xl" />
								<Shimmer className="h-32 w-full rounded-xl" />
								<Shimmer className="h-32 w-full rounded-xl" />
							</div>
						</>
					) : (
						pricing.map((plan) => (
							<div key={plan.tier || plan.id} className="bg-white rounded-2xl p-10 shadow-lg border border-gray-100 flex flex-col items-center hover:shadow-2xl transition-all duration-200">
								<h3 className="text-2xl font-bold text-black mb-2" style={{fontFamily: 'Montserrat, sans-serif'}}>{plan.tier}</h3>
								<div className="text-3xl font-extrabold text-yellow-500 mb-2" style={{fontFamily: 'Montserrat, sans-serif'}}>{plan.price} $</div>
								<div className="text-lg text-gray-700 mb-4" style={{fontFamily: 'Inter, sans-serif'}}>{plan.coins} coins</div>
								<ul className="mb-6 text-gray-700 list-disc list-inside" style={{fontFamily: 'Inter, sans-serif'}}>
									{plan.description}
								</ul>
								<a href="#signup" className="px-6 py-2 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black rounded-full font-semibold shadow-lg hover:scale-105 hover:shadow-2xl transition-all duration-200">Choose Plan</a>
							</div>
						))
					)}
				</div>
			</section>

			{/* CTA Section */}
			<section className="w-full  py-20 px-4 bg-black flex flex-col items-center justify-center text-center">
				<h2 className="text-3xl md:text-4xl font-bold text-white mb-6 tracking-tight" style={{fontFamily: 'Montserrat, sans-serif'}}>Ready to Experience Luxury Scraping?</h2>
				<a href="#signup" className="inline-block px-10 py-4 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black font-bold text-lg rounded-full shadow-lg hover:scale-105 hover:shadow-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500">Sign Up Now</a>
			</section>

			{/* Signup Section */}
			{/* <section className="w-full  py-16 px-4 md:px-16 bg-gray-900 flex flex-col items-center" id="signup">
				<h2 className="text-3xl font-bold text-white mb-6 text-center" style={{fontFamily: 'Montserrat, sans-serif'}}>Sign Up & Start Scraping</h2>
				<form className="w-full max-w-md flex flex-col gap-4">
					<input type="email" placeholder="Email address" className="px-4 py-3 rounded-lg border border-gray-700 bg-black text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-sans" required />
					<input type="password" placeholder="Password" className="px-4 py-3 rounded-lg border border-gray-700 bg-black text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 font-sans" required />
					<button type="submit" className="px-6 py-3 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black font-bold rounded-full shadow-lg hover:scale-105 hover:shadow-2xl transition-all duration-200 font-sans">Sign Up</button>
				</form>
			</section> */}

			{/* Footer */}
			<footer className="w-full py-6 px-4 bg-black text-center text-gray-400 mt-auto font-sans border-t border-gray-800">
				&copy; {new Date().getFullYear()} InstaScraper. All rights reserved.
			</footer>
		</div>
	);
}