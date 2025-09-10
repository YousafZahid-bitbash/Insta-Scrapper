"use client";


import Link from "next/link";
import { useState } from "react";
import { FaUserFriends, FaListAlt, FaHeadset, FaUserTie, FaCreditCard, FaCog, FaSignOutAlt, FaPlusCircle } from "react-icons/fa";

export default function Sidebar() {
  // Logout handler
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch {}
    window.location.href = '/auth/login';
  };
  const [open, setOpen] = useState(false);
  return (
    <>

      {/* Mobile menu icon - place in Navbar area for perfect alignment */}
      <div className="md:hidden">
        <button
          className="ml-2 mt-2 bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-2 rounded-full shadow-lg border border-blue-200 hover:scale-105 transition"
          aria-label="Open sidebar"
          onClick={() => setOpen(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Sidebar for desktop and mobile drawer */}
      <aside
        className={`w-72 h-[calc(100vh-4rem)] bg-gradient-to-b from-white via-blue-50 to-blue-100 border-r border-blue-100 p-0 fixed left-0 top-16 z-30 transition-transform duration-300
          md:translate-x-0 md:block
          ${open ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-2xl`}
        style={{ display: open ? 'block' : undefined }}
      >
        
        {/* Close button for mobile */}
        <button
          className="md:hidden absolute top-4 right-4 text-gray-500 hover:text-blue-700 text-2xl font-bold z-50"
          aria-label="Close sidebar"
          onClick={() => setOpen(false)}
        >
          &times;
        </button>
        {/* Main Navigation */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-7">Menu</span>
            <nav className="mt-3 flex flex-col gap-1 px-2">
              <Link href="/dashboard/new-extractions" className="flex items-center gap-3 px-5 py-3 rounded-lg hover:bg-blue-100 text-blue-900 font-medium transition-all" onClick={() => setOpen(false)}><FaPlusCircle className="text-blue-500" /> New Extractions</Link>
              <Link href="/dashboard/your-extractions" className="flex items-center gap-3 px-5 py-3 rounded-lg hover:bg-blue-100 text-blue-900 font-medium transition-all" onClick={() => setOpen(false)}><FaListAlt className="text-indigo-500" /> Your Extractions</Link>
              <Link href="#" className="flex items-center gap-3 px-5 py-3 rounded-lg hover:bg-blue-100 text-blue-900 font-medium transition-all" onClick={() => setOpen(false)}><FaHeadset className="text-green-500" /> Support</Link>
              <Link href="#" className="flex items-center gap-3 px-5 py-3 rounded-lg hover:bg-blue-100 text-blue-900 font-medium transition-all" onClick={() => setOpen(false)}><FaUserTie className="text-yellow-500" /> Affiliates</Link>
            </nav>
          </div>
          <div className="mb-6">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-7">Account</span>
            <nav className="mt-3 flex flex-col gap-1 px-2">
              <Link href="/dashboard/billing" className="flex items-center gap-3 px-5 py-3 rounded-lg hover:bg-blue-100 text-blue-900 font-medium transition-all" onClick={() => setOpen(false)}><FaCreditCard className="text-pink-500" /> Billing</Link>
              <Link href="/dashboard/settings" className="flex items-center gap-3 px-5 py-3 rounded-lg hover:bg-blue-100 text-blue-900 font-medium transition-all" onClick={() => setOpen(false)}><FaCog className="text-gray-500" /> Settings</Link>
              <button className="flex items-center gap-3 px-5 py-3 rounded-lg hover:bg-blue-100 text-blue-900 font-medium transition-all text-left" onClick={() => { handleLogout(); setOpen(false); }}><FaSignOutAlt className="text-red-500" /> Logout</button>
            </nav>
          </div>
        </div>
      </aside>
      {/* Overlay for mobile sidebar */}
      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-30 md:hidden" onClick={() => setOpen(false)} />
      )}
    </>
  );
}
