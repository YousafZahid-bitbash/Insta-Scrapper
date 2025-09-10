

"use client"
import { useState } from "react"
import Link from "next/link";

export default function HomeNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-6xl mx-auto px-4">
      <nav className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-14 h-14 flex items-center justify-center">
              <img src="/editedLogo.png" alt="ScraperGlass Logo" className="w-14 h-14 object-contain rounded-xl shadow-lg border border-yellow-300 bg-white" />
            </div>
            <span
              className="text-3xl font-extrabold bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 bg-clip-text text-transparent tracking-tight animate-gradient-move"
              style={{
                fontFamily: 'Montserrat, sans-serif',
                letterSpacing: '-0.03em',
                // textShadow: '0 2px 8px rgba(0,0,0,0.18), 0 1px 0 #fff',
                WebkitTextStroke: '1px rgba(0,0,0,0.08)'
              }}
            >
              ScraperGlass
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a
              href="#features"
              className="text-gray-700 hover:text-yellow-600 transition-colors font-medium"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-gray-700 hover:text-yellow-600 transition-colors font-medium"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Pricing
            </a>
            <a
              href="#testimonials"
              className="text-gray-700 hover:text-yellow-600 transition-colors font-medium"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Reviews
            </a>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/auth/login" className="text-gray-700 hover:text-yellow-600 transition-colors font-medium px-4 py-2">
              Login
            </Link>
            <Link href="/auth/signup" className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold px-6 py-2 rounded-full hover:scale-105 transition-transform shadow-lg w-max min-w-[120px] mx-auto">
              Sign Up
            </Link>
            
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu">
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
              />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-col space-y-4">
              <a href="#features" className="text-gray-700 hover:text-yellow-600 transition-colors font-medium">
                Features
              </a>
              <a href="#pricing" className="text-gray-700 hover:text-yellow-600 transition-colors font-medium">
                Pricing
              </a>
              <a href="#testimonials" className="text-gray-700 hover:text-yellow-600 transition-colors font-medium">
                Reviews
              </a>
              <div className="flex flex-col space-y-2 pt-4 border-t border-gray-200">
                <Link href="/auth/login" className="text-gray-700 hover:text-yellow-600 transition-colors font-medium text-left">
                  Login
                </Link>
                <Link href="/auth/signup" className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold px-2 py-2 rounded-full hover:scale-105 transition-transform shadow-lg w-max min-w-[80px] text-left">
                  Sign Up
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
