"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("App error:", error);
    }
  }, [error]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4" style={{ background: "var(--bg-primary)" }}>
      <div className="w-full max-w-sm text-center animate-slide-up">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-lg mb-4 text-3xl" style={{ boxShadow: "0 8px 24px rgba(232, 168, 124, 0.3)" }}>
          🏠
        </div>
        <h1 className="text-2xl font-display font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          Noe gikk galt
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          Vi kunne ikke vise denne siden. Prov igjen, eller last siden pa nytt.
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => reset()}
            className="gradient-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:shadow-lg transition-shadow"
          >
            Prov igjen
          </button>
          <button
            onClick={() => { window.location.href = "/"; }}
            className="glass px-4 py-2 rounded-xl text-sm font-medium hover:bg-[var(--surface-glass-hover)] transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            Til forsiden
          </button>
        </div>
        {error.digest && (
          <p className="text-[11px] mt-4 font-mono" style={{ color: "var(--text-muted)" }}>
            {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
