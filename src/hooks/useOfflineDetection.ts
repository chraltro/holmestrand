"use client";

import { useEffect, useState } from "react";

const PING_INTERVAL_MS = 45_000;
const PING_TIMEOUT_MS = 4_000;

export function useOfflineDetection() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        if (!cancelled) setIsOffline(true);
        return;
      }
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), PING_TIMEOUT_MS);
        const res = await fetch("/api/health", {
          method: "HEAD",
          cache: "no-store",
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (!cancelled) setIsOffline(!res.ok);
      } catch {
        if (!cancelled) setIsOffline(true);
      }
    };

    check();
    const interval = setInterval(check, PING_INTERVAL_MS);
    const onOnline = () => check();
    const onOffline = () => { if (!cancelled) setIsOffline(true); };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return isOffline;
}
