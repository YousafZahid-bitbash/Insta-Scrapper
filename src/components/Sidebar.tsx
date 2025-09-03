
"use client";

import Link from "next/link";
import { useState } from "react";

export default function Sidebar() {
  // Logout handler
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      window.location.href = '/auth/login';
    }
  };
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Mobile menu icon */}
      <button
        className="md:hidden fixed top-5 left-4 z-40 bg-blue-600 text-white p-2 rounded-full shadow-lg"
        aria-label="Open sidebar"
        onClick={() => setOpen(true)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar for desktop and mobile drawer */}
      <aside
        className={`w-64 h-[calc(100vh-4rem)] bg-white border-r p-6 fixed left-0 z-30 transition-transform duration-300
          md:top-0 md:translate-x-0 md:block
          ${open ? 'translate-x-0' : '-translate-x-full'} md:relative flex flex-col`}
        style={{ display: open ? 'block' : undefined }}
      >
        {/* Close button for mobile */}
        <button
          className="md:hidden absolute top-4 right-4 text-gray-500 hover:text-blue-700 text-2xl font-bold z-40"
          aria-label="Close sidebar"
          onClick={() => setOpen(false)}
        >
          &times;
        </button>
        <div className="mb-8">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Menu</span>
          <nav className="mt-3 flex flex-col gap-2">
            <Link href="/dashboard/new-extractions" className="px-3 py-2 rounded hover:bg-gray-100 text-gray-900 font-medium" onClick={() => setOpen(false)}>New Extractions</Link>
            <Link href="/dashboard/your-extractions" className="px-3 py-2 rounded hover:bg-gray-100 text-gray-900 font-medium" onClick={() => setOpen(false)}>Your extractions</Link>
            <Link href="#" className="px-3 py-2 rounded hover:bg-gray-100 text-gray-900 font-medium" onClick={() => setOpen(false)}>Support</Link>
            <Link href="#" className="px-3 py-2 rounded hover:bg-gray-100 text-gray-900 font-medium" onClick={() => setOpen(false)}>Affiliates</Link>
          </nav>
        </div>
        <div className="mt-auto mb-4">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Account</span>
          <nav className="mt-3 flex flex-col gap-2">
            <Link href="/dashboard/billing" className="px-3 py-2 rounded hover:bg-gray-100 text-gray-900 font-medium" onClick={() => setOpen(false)}>Billing</Link>
            <Link href="/dashboard/settings" className="px-3 py-2 rounded hover:bg-gray-100 text-gray-900 font-medium" onClick={() => setOpen(false)}>Settings</Link>
            <button className="px-3 py-2 rounded hover:bg-gray-100 text-left text-gray-900 font-medium" onClick={() => { handleLogout(); setOpen(false); }}>Logout</button>
          </nav>
        </div>
      </aside>
      {/* Overlay for mobile sidebar */}
      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-20 md:hidden" onClick={() => setOpen(false)} />
      )}
    </>
  );
}
