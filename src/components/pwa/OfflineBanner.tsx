"use client";

import { useOfflineDetection } from "@/hooks/useOfflineDetection";

export function OfflineBanner() {
  const isOffline = useOfflineDetection();

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium animate-slide-up"
      style={{
        background: "rgba(212, 114, 106, 0.12)",
        borderBottom: "1px solid rgba(212, 114, 106, 0.25)",
        color: "var(--accent-rose)",
      }}
    >
      <svg
        className="w-3.5 h-3.5 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-2.828 2.829a1 1 0 010 1.414"
        />
      </svg>
      <span>Frakoblet — ventes pa nett igjen</span>
    </div>
  );
}
