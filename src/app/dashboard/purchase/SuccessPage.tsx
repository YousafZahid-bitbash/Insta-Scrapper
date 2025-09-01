"use client";
import React from "react";
// Removed shadcn/ui components
import Link from "next/link";

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-950">
      <div className="max-w-md w-full shadow-md rounded-2xl bg-white dark:bg-gray-900 text-center p-8">
        <div className="mb-4">
          <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M8 12l2 2 4-4" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h2>
        <p className="text-lg mb-4">Thank you for your purchase. Your payment was processed successfully.</p>
        <p className="text-sm text-gray-500 mb-2">You can now access your purchased features.</p>
        <Link href="/dashboard">
          <button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-green-400">
            Go to Dashboard
          </button>
        </Link>
      </div>
    </div>
  );
}
