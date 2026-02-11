"use client";

import { useAuth } from "@/hooks/useAuth";
import { useChannels } from "@/hooks/useChannels";
import { useTheme } from "@/hooks/useTheme";
import { usePresence } from "@/hooks/usePresence";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { ChannelSidebar } from "@/components/channels/ChannelSidebar";
import { LightboxProvider } from "@/components/ui/ImageLightbox";
import { SearchModal } from "@/components/ui/SearchModal";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo, useCallback } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { channels, loading: channelsLoading } = useChannels();
  const { dark, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();

  const channelIds = useMemo(() => channels.map((c) => c.id), [channels]);
  const { unreadCounts, markAsRead } = useUnreadCounts(user?.id ?? null, channelIds);
  const { isOnline } = usePresence(
    user?.id ?? null,
    profile?.display_name ?? "",
    profile?.avatar_url ?? ""
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
    if (!authLoading && user && profile && !profile.is_approved) {
      router.push("/");
    }
  }, [authLoading, user, profile, router]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setSearchOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (authLoading || channelsLoading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
          <span style={{ color: "var(--text-muted)" }} className="text-sm">Laster...</span>
        </div>
      </div>
    );
  }

  if (!user || !profile?.is_approved) {
    return null;
  }

  return (
    <div className="h-[100dvh] flex overflow-hidden relative" style={{ background: "var(--bg-primary)" }}>
      {/* Animated background blobs */}
      <div className="blob blob-amber w-[500px] h-[500px] -top-32 -left-32 animate-blob-1" />
      <div className="blob blob-rose w-[400px] h-[400px] -bottom-24 -right-24 animate-blob-2" />
      <div className="blob blob-warm w-[600px] h-[600px] top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 animate-blob-3" />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <ChannelSidebar
          channels={channels}
          profile={profile}
          onSignOut={signOut}
          onClose={() => setSidebarOpen(false)}
          unreadCounts={unreadCounts}
          markAsRead={markAsRead}
          isOnline={isOnline}
          onSearchOpen={() => setSearchOpen(true)}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 glass-solid">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1 -ml-1 transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-display font-bold gradient-text">Huset</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-1.5 rounded-lg transition-all hover:bg-[var(--surface-glass-hover)]"
              style={{ color: "var(--text-muted)" }}
              title="Sok"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button
              onClick={toggle}
              className="p-1.5 rounded-lg transition-all hover:bg-[var(--surface-glass-hover)]"
              style={{ color: "var(--text-muted)" }}
            >
              {dark ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <LightboxProvider>{children}</LightboxProvider>
      </div>

      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
