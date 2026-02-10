"use client";

import { useAuth } from "@/hooks/useAuth";
import { useChannels } from "@/hooks/useChannels";
import { useBoards } from "@/hooks/useBoards";
import { useTheme } from "@/hooks/useTheme";
import { ChannelSidebar } from "@/components/channels/ChannelSidebar";
import { LightboxProvider } from "@/components/ui/ImageLightbox";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { channels, loading: channelsLoading } = useChannels();
  const { boards, loading: boardsLoading } = useBoards();
  const { dark, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
    if (!authLoading && user && profile && !profile.is_approved) {
      router.push("/");
    }
  }, [authLoading, user, profile, router]);

  if (authLoading || channelsLoading || boardsLoading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-pulse text-gray-400 text-lg">Laster...</div>
      </div>
    );
  }

  if (!user || !profile?.is_approved) {
    return null;
  }

  return (
    <div className="h-[100dvh] flex overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
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
          boards={boards}
          profile={profile}
          onSignOut={signOut}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Holmestrand
            </h1>
          </div>
          <button
            onClick={toggle}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1.5"
            title={dark ? "Lyst modus" : "Mørkt modus"}
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

        <LightboxProvider>{children}</LightboxProvider>
      </div>
    </div>
  );
}
