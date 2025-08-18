"use client"
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function HomeNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="mt-8 mb-4">
      <header className="sticky top-4 z-30 w-full mx-auto max-w-[1100px] rounded-2xl backdrop-blur bg-white/90 border border-[#d4af37]/30 shadow-lg px-6 py-3 flex items-center justify-between transition-all duration-200">
        {/* Left: Logo */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/file.svg" alt="Logo" width={32} height={32} />
            <span className="text-xl font-bold tracking-tight text-black font-sans">Insta Scrapper</span>
          </Link>
        </div>
        {/* Center: Nav links (desktop) */}
        <nav className="hidden md:flex gap-8 text-base font-medium tracking-tight font-sans justify-center" aria-label="Main navigation">
          <Link href="/pages/pricing" className="px-2 pb-1 border-b-2 border-transparent text-black hover:border-[#d4af37] hover:text-[#d4af37] focus-visible:ring-2 focus-visible:ring-[#d4af37] transition-all duration-150">Pricing</Link>
          <Link href="/pages/blog" className="px-2 pb-1 border-b-2 border-transparent text-black hover:border-[#d4af37] hover:text-[#d4af37] focus-visible:ring-2 focus-visible:ring-[#d4af37] transition-all duration-150">Blog</Link>
          <Link href="/pages/affiliates" className="px-2 pb-1 border-b-2 border-transparent text-black hover:border-[#d4af37] hover:text-[#d4af37] focus-visible:ring-2 focus-visible:ring-[#d4af37] transition-all duration-150">Affiliates</Link>
          <Link href="/pages/contact-us" className="px-2 pb-1 border-b-2 border-transparent text-black hover:border-[#d4af37] hover:text-[#d4af37] focus-visible:ring-2 focus-visible:ring-[#d4af37] transition-all duration-150">Contact Us</Link>
        </nav>
        {/* Right: Auth buttons */}
        <div className="hidden md:flex gap-6">
          <Link href="/auth/login" className="px-4 py-2 rounded-lg border border-gray-300 bg-transparent text-black font-medium hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[#d4af37] transition-all duration-150">Login</Link>
          <Link href="/auth/signup" className="px-4 py-2 rounded-lg bg-black text-white font-medium shadow hover:shadow-gold hover:bg-[#d4af37] hover:text-black focus-visible:ring-2 focus-visible:ring-[#d4af37] transition-all duration-150">Sign Up</Link>
        </div>
        {/* Mobile: Hamburger menu */}
        <button
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white/80 text-black focus-visible:ring-2 focus-visible:ring-[#d4af37] transition-all duration-150"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        {/* Mobile: Drawer menu */}
        {menuOpen && (
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-start justify-end md:hidden animate-fade-in" role="dialog" aria-modal="true">
            <div className="w-64 bg-white rounded-l-2xl shadow-lg p-6 flex flex-col gap-6 mt-4">
              <button
                className="self-end text-2xl text-black hover:text-[#d4af37] focus-visible:ring-2 focus-visible:ring-[#d4af37]"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                &times;
              </button>
              <nav className="flex flex-col gap-4 text-base font-medium  tracking-tight font-sans" aria-label="Mobile navigation">
                <Link href="/pages/pricing" className="px-2 pb-1 border-b-2 border-transparent text-black hover:border-[#d4af37] hover:text-[#d4af37] focus-visible:ring-2 focus-visible:ring-[#d4af37] transition-all duration-150" onClick={() => setMenuOpen(false)}>Pricing</Link>
                <Link href="/pages/blog" className="px-2 pb-1 border-b-2 border-transparent text-black hover:border-[#d4af37] hover:text-[#d4af37] focus-visible:ring-2 focus-visible:ring-[#d4af37] transition-all duration-150" onClick={() => setMenuOpen(false)}>Blog</Link>
                <Link href="/pages/affiliates" className="px-2 pb-1 border-b-2 border-transparent text-black hover:border-[#423409] hover:text-[#000000] focus-visible:ring-2 focus-visible:ring-[#826300] transition-all duration-150" onClick={() => setMenuOpen(false)}>Affiliates</Link>
                <Link href="/pages/contact-us" className="px-2 pb-1 border-b-2 border-transparent text-black hover:border-[#d4af37] hover:text-[#d4af37] focus-visible:ring-2 focus-visible:ring-[#d4af37] transition-all duration-150" onClick={() => setMenuOpen(false)}>Contact Us</Link>
              </nav>
              <div className="flex gap-4 mt-6">
                <Link href="/auth/login" className="px-4 py-2 rounded-lg border border-gray-300 bg-transparent text-black font-medium hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[#d4af37] transition-all duration-150" onClick={() => setMenuOpen(false)}>Login</Link>
                <Link href="/auth/signup" className="px-4 py-2 rounded-lg bg-black text-white font-medium shadow hover:shadow-gold hover:bg-[#d4af37] hover:text-black focus-visible:ring-2 focus-visible:ring-[#d4af37] transition-all duration-150" onClick={() => setMenuOpen(false)}>Sign Up</Link>
              </div>
            </div>
          </div>
        )}
      </header>
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: none; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s cubic-bezier(0.4,0,0.2,1) both;
        }
        .hover\:shadow-gold:hover {
          box-shadow: 0 0 16px 2px #d4af37;
        }
      `}</style>
    </div>
  );
}
