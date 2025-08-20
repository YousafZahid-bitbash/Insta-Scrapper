"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import HomeNavbar from "@/components/HomeNavbar";
import { supabase } from "../supabaseClient";
import Footer from "@/components/Footer";

const features = [
  {
    title: "Instagram Profile Scraping",
    description:
      "Extract public profile data including username, bio, followers, following, and posts with a single click.",
    icon: <span className="text-yellow-500 text-3xl">🔍</span>,
  },
  {
    title: "Bulk Extraction",
    description: "Scrape multiple profiles, followers, or following lists in bulk for efficient data collection.",
    icon: <span className="text-yellow-500 text-3xl">📦</span>,
  },
  {
    title: "Export to CSV",
    description: "Download extracted data in CSV format for easy analysis and integration.",
    icon: <span className="text-yellow-500 text-3xl">📄</span>,
  },
  {
    title: "Dashboard & History",
    description: "Track your extractions, view history, and manage your account from a modern dashboard.",
    icon: <span className="text-yellow-500 text-3xl">📊</span>,
  },
]

const testimonials = [
  {
    quote: "InstaScraper is the gold standard for Instagram data extraction. Fast, reliable, and beautifully designed.",
    author: "Sarah M.",
    role: "Digital Marketer",
    avatar: "/professional-woman-headshot.png",
  },
  {
    quote: "The luxury feel and ease of use make it my go-to tool for influencer research.",
    author: "James L.",
    role: "Brand Strategist",
    avatar: "/professional-man-headshot.png",
  },
]

// Pricing will be fetched from the database

export default function LandingPage() {
  type PricingDeal = { id: string; coins: number; price: number; sale_price?: number; description?: string; name: string };
  const [pricing, setPricing] = useState<PricingDeal[]>([]);

  useEffect(() => {
    async function fetchPricing() {
      // Log the anon key from the environment
      console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      // Also log the key from the supabase client
      // @ts-ignore
      console.log('supabase anon key:', supabase?.rest?.headers?.apikey || 'Not available');
      const { data, error } = await supabase
        .from("deals")
        .select("id, coins, price, sale_price, description, name");
      if (!error && Array.isArray(data)) {
        setPricing(data as PricingDeal[]);
      }
    }
    fetchPricing();
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col font-sans">
      <HomeNavbar />
      {/* Hero Section */}
      <section className="w-full bg-black py-32 md:py-40 px-4 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-screen">
        <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
          {/* <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 1440 900"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <filter id="gold-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="glow" />
                <feColorMatrix
                  type="matrix"
                  values="1 0.8 0.2 0 0  0 0.8 0.2 0 0  0 0.2 0 0 0  0 0 0 1 0"
                  result="bright"
                />
                <feMerge>
                  <feMergeNode in="bright" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#d4af37" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#ffd700" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#d4af37" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            
            <line
              x1="0"
              y1="200"
              x2="1440"
              y2="100"
              stroke="url(#goldGradient)"
              strokeWidth="2"
              filter="url(#gold-glow)"
            />
            <line
              x1="0"
              y1="700"
              x2="1440"
              y2="800"
              stroke="url(#goldGradient)"
              strokeWidth="2"
              filter="url(#gold-glow)"
            />
            <line x1="200" y1="0" x2="1240" y2="900" stroke="#d4af37" strokeWidth="1" opacity="0.4" />
            
            <polygon points="720,50 740,70 720,90 700,70" fill="#d4af37" opacity="0.3" />
            <polygon points="120,400 140,420 120,440 100,420" fill="#d4af37" opacity="0.2" />
            <polygon points="1320,600 1340,620 1320,640 1300,620" fill="#d4af37" opacity="0.3" />
          </svg> */}
        </div>
        <div className="relative z-10 w-full flex flex-col items-center justify-center max-w-6xl mx-auto">
          <h1
            className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-white mb-8 tracking-tight leading-tight"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Elevate Your Instagram
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600">
              Data Extraction
            </span>
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent rounded-full mx-auto mb-8" />
          <p
            className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto font-light leading-relaxed"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Experience luxury-grade scraping with unmatched speed, security, and style.
            <span className="block mt-2 text-yellow-400">No coding required.</span>
          </p>
          <a href="/auth/signup" className="group inline-flex items-center px-12 py-5 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black font-bold text-xl rounded-full shadow-2xl hover:scale-105 hover:shadow-yellow-500/25 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-yellow-500/50">
            <span>Get Started</span>
            <svg
              className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-24 px-4 md:px-16 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2
            className="text-4xl md:text-5xl font-bold text-black mb-4 text-center"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Premium Features
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full mx-auto mb-16" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group bg-white rounded-3xl shadow-lg p-8 flex flex-col items-center border border-gray-100 hover:shadow-2xl hover:border-yellow-200 transition-all duration-300 hover:-translate-y-2"
              >
                <div className="mb-6 p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl group-hover:from-yellow-100 group-hover:to-yellow-200 transition-all duration-300">
                  {feature.icon}
                </div>
                <h3
                  className="text-xl font-bold text-black mb-4 text-center"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  {feature.title}
                </h3>
                <p
                  className="text-gray-600 text-center font-light leading-relaxed"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full py-24 px-4 md:px-16 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              {/* Golden frame accent */}
              <div className="absolute -inset-4 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-3xl opacity-20 blur-lg"></div>
              <div className="relative bg-white rounded-2xl p-2 shadow-2xl border-2 border-yellow-200">
                <Image
                  src="/dashboard.png"
                  alt="InstaScraper Dashboard"
                  width={800}
                  height={400}
                  className="w-full h-auto rounded-xl"
                  priority
                />
              </div>
            </div>
            <div className="space-y-8">
              <h2
                className="text-4xl md:text-5xl font-bold text-black"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                Powerful Dashboard
                <span className="block text-yellow-600">Built for Professionals</span>
              </h2>
              <div className="w-16 h-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full" />
              <p className="text-xl text-gray-600 leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
                Monitor your extractions in real-time, manage your data efficiently, and access powerful analytics that
                help you make informed decisions. Our intuitive interface makes complex data simple.
              </p>
              <ul className="space-y-4">
                {[
                  "Real-time extraction monitoring",
                  "Advanced filtering and search",
                  "Export in multiple formats",
                  "Detailed analytics and insights",
                ].map((benefit, index) => (
                  <li key={index} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-gray-700" style={{ fontFamily: "Inter, sans-serif" }}>
                      {benefit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="w-full py-24 px-4 md:px-16 bg-black">
        <div className="max-w-6xl mx-auto">
          <h2
            className="text-4xl md:text-5xl font-bold text-white mb-4 text-center"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Trusted by Professionals
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full mx-auto mb-16" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {testimonials.map((t, idx) => (
              <div key={idx} className="bg-white rounded-3xl p-10 shadow-2xl border border-gray-100 relative">
                <div className="absolute -top-6 left-10">
                  <Image
                    src={t.avatar || "/placeholder.svg"}
                    alt={`${t.author} avatar`}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full border-4 border-yellow-400 shadow-lg"
                  />
                </div>
                <div className="pt-8">
                  <div className="flex items-center mb-6">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p
                    className="text-lg text-gray-700 mb-6 leading-relaxed italic"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    &quot;{t.quote}&quot;
                  </p>
                  <div className="border-t border-gray-200 pt-4">
                    <div className="text-yellow-600 font-bold text-lg" style={{ fontFamily: "Montserrat, sans-serif" }}>
                      {t.author}
                    </div>
                    <div className="text-gray-500 text-sm" style={{ fontFamily: "Inter, sans-serif" }}>
                      {t.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="w-full py-24 px-4 md:px-16 bg-white" id="pricing">
        <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl p-12 border border-[#d4af37] relative">
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-[#d4af37] flex items-center justify-center shadow-lg border-4 border-white">
            <svg width="36" height="36" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M12 12.713l11.985-7.713A1 1 0 0023 4H1a1 1 0 00-.985 1.001L12 12.713z"/><path fill="#fff" d="M12 14.713l-12-7.713V20a1 1 0 001 1h22a1 1 0 001-1V7l-12 7.713z"/></svg>
          </div>
          <h1 className="text-4xl font-serif font-bold text-center mb-6 text-gray-900 tracking-tight" style={{fontFamily:'Georgia,serif'}}>Pricing & Deals</h1>
          <p className="text-center text-gray-700 mb-8 text-lg font-light">Unlock powerful Instagram data extraction with our coin-based system. Each coin lets you extract data from profiles, posts, hashtags, followers, and more. Choose a deal below and start extracting instantly!</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-4xl mx-auto">
            {pricing.length === 0 ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="h-56 w-full mb-4 rounded-2xl bg-[#fffbe6] animate-pulse" />
              ))
            ) : (
              pricing.map((deal: { id: string; name: string; coins: number; price: number; sale_price?: number; description?: string }) => (
                <div key={deal.id} className="bg-[#fffbe6] rounded-2xl shadow-lg p-8 flex flex-col items-center border-2 border-[#d4af37] hover:border-[#bfa233] transition-all hover:scale-105">
                  <span className="text-3xl font-extrabold text-[#d4af37] mb-2 font-serif">{deal.coins?.toLocaleString()} Coins</span>
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
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-24 px-4 bg-black relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-32 h-32 border border-yellow-400 rounded-full"></div>
          <div className="absolute bottom-20 right-20 w-24 h-24 border border-yellow-400 rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-yellow-400 rounded-full"></div>
        </div>
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2
            className="text-4xl md:text-6xl font-bold text-white mb-8 tracking-tight"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Ready to Experience
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
              Luxury Scraping?
            </span>
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto" style={{ fontFamily: "Inter, sans-serif" }}>
            Join thousands of professionals who trust InstaScraper for their data extraction needs.
          </p>
          <a href="/auth/signup" className="group inline-flex items-center px-12 py-5 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black font-bold text-xl rounded-full shadow-2xl hover:scale-105 hover:shadow-yellow-500/25 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-yellow-500/50">
            <span>Sign Up Now</span>
            <svg
              className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </a>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}
