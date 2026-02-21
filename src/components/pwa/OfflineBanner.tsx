"use client";

import { useOfflineDetection } from "@/hooks/useOfflineDetection";

export function OfflineBanner() {
  const isOffline = useOfflineDetection();

  if (!isOffline) return null;

  return (
    <div
      className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium animate-slide-up"
      style={{
        background: "linear-gradient(135deg, rgba(220, 38, 38, 0.9), rgba(185, 28, 28, 0.9))",
        color: "white",
      }}
    >
      <svg
        className="w-4 h-4 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-2.828 2.829a1 1 0 010 1.414"
        />
      </svg>
      <span>Du er frakoblet — noen funksjoner er ikke tilgjengelige</span>
    </div>
  );
}
