import React from "react";

export default function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded ${className}`}
      style={{ minHeight: "1.5rem" }}
    />
  );
}
