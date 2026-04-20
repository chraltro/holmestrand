"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let updateInterval: ReturnType<typeof setInterval> | null = null;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        updateInterval = setInterval(() => reg.update().catch(() => {}), 1000 * 60 * 30);
      })
      .catch(() => {
        // Registration can fail in incognito / unsupported browsers — silent.
      });

    navigator.serviceWorker.ready
      .then((reg) => {
        reg.active?.postMessage("CLEAN_CACHES");
      })
      .catch(() => {});

    return () => {
      if (updateInterval) clearInterval(updateInterval);
    };
  }, []);

  return null;
}
