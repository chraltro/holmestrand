"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Check for updates every 30 minutes
          setInterval(() => reg.update(), 1000 * 60 * 30);

          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "activated" &&
                navigator.serviceWorker.controller
              ) {
                // New version available — could show a toast here
                console.log("[SW] New version available");
              }
            });
          });
        })
        .catch((err) => {
          console.log("[SW] Registration failed:", err);
        });

      // Periodic cache cleanup
      navigator.serviceWorker.ready.then((reg) => {
        if (reg.active) {
          reg.active.postMessage("CLEAN_CACHES");
        }
      });
    }
  }, []);

  return null;
}
