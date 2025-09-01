"use client";
import React from "react";
import Link from "next/link";

export default function FailurePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-950">
        <div className="max-w-md w-full shadow-lg rounded-lg bg-white dark:bg-gray-900 text-center p-8">
          <div className="mb-4">
            <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <line x1="8" y1="8" x2="16" y2="16" stroke="currentColor" strokeWidth="2" />
              <line x1="16" y1="8" x2="8" y2="16" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">Payment Failed</h2>
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-6 text-center">Your payment could not be processed. Please try again or contact support.</p>
          <button
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded focus:outline-none focus:ring-2 focus:ring-red-400"
            onClick={() => window.location.href = "/dashboard/purchase"}
          >
            Try Again
          </button>
          <Link href="/support">
            <button className="mt-2 bg-gray-300 hover:bg-gray-400 text-black font-semibold py-2 px-6 rounded focus:outline-none focus:ring-2 focus:ring-gray-400">
              Contact Support
            </button>
          </Link>
        </div>
    </div>
  );
}
