"use client";

import Image from "next/image";
import { FaCoins } from "react-icons/fa";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";

type NavbarProps = {
  coins?: number;
};

export default function Navbar({ coins = 0 }: NavbarProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      // Clear localStorage
      localStorage.clear();
      // Clear the authentication cookie
      document.cookie = 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      // Redirect to login
      window.location.href = '/auth/login';
    }
  };

  return (
    <header className="h-16 bg-white border-b flex items-center px-8 justify-between sticky top-0 left-0 z-40">
      <Link href="/" className="flex items-center gap-2">
        <Image src="/file.svg" alt="Logo" width={32} height={32} />
        <span className="text-xl font-bold tracking-tight text-gray-900">Insta Scrapper</span>
      </Link>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 text-yellow-500 font-semibold">
          <FaCoins size={20} />
          <span>{coins}</span>
        </div>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center hover:bg-gray-100 rounded-full p-1 transition-colors"
          >
            <Image src="/window.svg" alt="User" width={32} height={32} className="rounded-full bg-gray-200" />
          </button>
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
              <Link
                href="/dashboard/settings"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setShowDropdown(false)}
              >
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
