"use client";

import { Channel, Profile } from "@/lib/types";
import { useTheme } from "@/hooks/useTheme";
import { DocumentList } from "@/components/sidebar/DocumentList";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

interface ChannelSidebarProps {
  channels: Channel[];
  profile: Profile | null;
  onSignOut: () => void;
  onClose?: () => void;
  unreadCounts?: Record<string, number>;
  markAsRead?: (channelId: string) => void;
  isOnline?: (userId: string) => boolean;
  onSearchOpen?: () => void;
}

export function ChannelSidebar({
  channels,
  profile,
  onSignOut,
  onClose,
  unreadCounts = {},
  markAsRead,
  isOnline,
  onSearchOpen,
}: ChannelSidebarProps) {
  const pathname = usePathname();
  const { dark, toggle } = useTheme();

  // Mark channel as read when navigating to it
  useEffect(() => {
    if (!markAsRead) return;
    const match = pathname.match(/^\/channel\/(.+)$/);
    if (match) {
      const slug = match[1];
      const channel = channels.find((c) => c.slug === slug);
      if (channel) markAsRead(channel.id);
    }
  }, [pathname, channels, markAsRead]);

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header with gradient */}
      <div className="p-4 border-b border-gray-700/50 relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-10" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-md shadow-indigo-500/20">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <h1 className="text-lg font-bold tracking-tight">Holmestrand</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggle}
              className="hidden lg:block text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all"
              title={dark ? "Lyst modus" : "Mørkt modus"}
            >
              {dark ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden text-gray-400 hover:text-white p-1"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search button */}
      {onSearchOpen && (
        <div className="px-3 pt-3">
          <button
            onClick={onSearchOpen}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-750 text-gray-400 text-sm transition-colors border border-gray-700/50 hover:border-gray-600"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="flex-1 text-left">Søk...</span>
            <kbd className="hidden sm:inline text-[10px] bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
          </button>
        </div>
      )}

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-3">
        <div className="px-3 mb-2">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
            Kanaler
          </span>
        </div>
        {channels.map((channel) => {
          const isActive = pathname === `/channel/${channel.slug}`;
          const unread = unreadCounts[channel.id] || 0;
          return (
            <Link
              key={channel.id}
              href={`/channel/${channel.slug}`}
              onClick={onClose}
              className={`flex items-center gap-2 mx-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-150 ${
                isActive
                  ? "bg-indigo-500/20 text-white border-l-2 border-indigo-400 ml-1.5"
                  : unread > 0
                  ? "text-white font-semibold hover:bg-white/5"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className={`text-sm ${isActive ? "text-indigo-400" : "text-gray-600"}`}>#</span>
              <span className="flex-1">{channel.name}</span>
              {unread > 0 && !isActive && (
                <span className="min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full bg-indigo-500 text-white text-[10px] font-bold">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          );
        })}

        {/* Documents section */}
        <DocumentList />
      </div>

      {/* Admin link */}
      {profile?.is_admin && (
        <div className="px-2 pb-2">
          <Link
            href="/admin"
            onClick={onClose}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-150 ${
              pathname === "/admin"
                ? "bg-indigo-500/20 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Admin
          </Link>
        </div>
      )}

      {/* User footer */}
      <div className="p-3 border-t border-gray-700/50 flex items-center gap-3">
        <div className="relative">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="w-8 h-8 rounded-full ring-2 ring-indigo-500/30"
            />
          ) : (
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-white">
              {(profile?.display_name || "?")[0].toUpperCase()}
            </div>
          )}
          {profile && isOnline?.(profile.id) && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-gray-900 rounded-full" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {profile?.display_name}
          </p>
        </div>
        <button
          onClick={onSignOut}
          className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          title="Logg ut"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  );
}
