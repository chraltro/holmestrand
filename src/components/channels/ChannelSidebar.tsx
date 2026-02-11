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
    <div className="flex flex-col h-full glass-solid" style={{ background: "var(--bg-secondary)" }}>
      {/* Header */}
      <div className="p-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center" style={{ boxShadow: "0 4px 12px rgba(245,158,11,0.25)" }}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <h1 className="text-lg font-display font-bold gradient-text">Huset</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggle}
              className="hidden lg:block p-1.5 rounded-lg transition-all hover:bg-[var(--surface-glass)]"
              style={{ color: "var(--text-muted)" }}
              title={dark ? "Lyst modus" : "Morkt modus"}
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
              <button onClick={onClose} className="lg:hidden p-1" style={{ color: "var(--text-muted)" }}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      {onSearchOpen && (
        <div className="px-3 pt-3">
          <button
            onClick={onSearchOpen}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all glass"
            style={{ color: "var(--text-muted)" }}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="flex-1 text-left">Sok...</span>
            <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: "var(--surface-glass)", color: "var(--text-muted)" }}>⌘K</kbd>
          </button>
        </div>
      )}

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-3">
        <div className="px-3 mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
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
                  ? "glass border-l-2"
                  : unread > 0
                  ? "font-semibold"
                  : ""
              }`}
              style={
                isActive
                  ? { borderColor: "var(--accent-amber)", color: "var(--text-primary)", marginLeft: "6px" }
                  : { color: unread > 0 ? "var(--text-primary)" : "var(--text-secondary)" }
              }
            >
              <span className="text-sm" style={{ color: isActive ? "var(--accent-amber)" : "var(--text-muted)" }}>#</span>
              <span className="flex-1">{channel.name}</span>
              {unread > 0 && !isActive && (
                <span className="min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full gradient-primary text-white text-[10px] font-bold">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          );
        })}

        <DocumentList />
      </div>

      {/* Admin link */}
      {profile?.is_admin && (
        <div className="px-2 pb-2">
          <Link
            href="/admin"
            onClick={onClose}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-150 ${
              pathname === "/admin" ? "glass" : ""
            }`}
            style={{ color: pathname === "/admin" ? "var(--text-primary)" : "var(--text-secondary)" }}
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
      <div className="p-3 flex items-center gap-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="relative">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.display_name} className="w-8 h-8 rounded-full avatar-ring" />
          ) : (
            <div className="w-8 h-8 rounded-full avatar-gradient flex items-center justify-center text-xs font-bold text-white">
              {(profile?.display_name || "?")[0].toUpperCase()}
            </div>
          )}
          {profile && isOnline?.(profile.id) && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 rounded-full" style={{ borderColor: "var(--bg-secondary)" }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{profile?.display_name}</p>
        </div>
        <button
          onClick={onSignOut}
          className="transition-colors p-1 rounded-lg hover:bg-[var(--surface-glass)]"
          style={{ color: "var(--text-muted)" }}
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
