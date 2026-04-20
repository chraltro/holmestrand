"use client";

import { Channel, Profile, Floor, FLOOR_LABELS, FLOOR_ORDER } from "@/lib/types";
import { useTheme } from "@/hooks/useTheme";
import { DocumentList } from "@/components/sidebar/DocumentList";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

function ChannelItem({ channel, isActive, unread, onClose }: { channel: Channel; isActive: boolean; unread: number; onClose?: () => void }) {
  return (
    <Link
      href={`/channel/${channel.slug}`}
      onClick={onClose}
      className={`flex items-center gap-2.5 mx-2 px-3.5 py-2.5 rounded-[10px] text-sm transition-all duration-250 ${
        isActive ? "font-medium" : unread > 0 ? "font-semibold" : "font-normal"
      }`}
      style={
        isActive
          ? { background: "linear-gradient(135deg, rgba(232, 168, 124, 0.2), rgba(212, 114, 106, 0.15))", border: "1px solid rgba(232, 168, 124, 0.2)", color: "var(--text-primary)" }
          : { color: unread > 0 ? "var(--text-primary)" : "var(--text-secondary)" }
      }
    >
      {channel.emoji ? (
        <span className="text-base w-[18px] text-center">{channel.emoji}</span>
      ) : (
        <span className="font-display text-base font-light w-[18px] text-center" style={{ color: "var(--accent-amber)", opacity: isActive ? 1 : 0.7 }}>#</span>
      )}
      <span className="flex-1">{channel.name}</span>
      {unread > 0 && !isActive && (
        <span className="min-w-[18px] h-[18px] flex items-center justify-center px-[7px] rounded-[10px] text-white text-[10px] font-medium" style={{ background: "var(--accent-rose)" }}>
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}

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
      <div className="px-5 pt-7 pb-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-[42px] h-[42px] rounded-xl gradient-primary flex items-center justify-center text-xl" style={{ boxShadow: "0 4px 20px rgba(232, 168, 124, 0.3)" }}>
              🏠
            </div>
            <span className="text-[26px] font-display font-semibold" style={{ letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Huset</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggle}
              aria-label={dark ? "Bytt til lyst modus" : "Bytt til morkt modus"}
              className="hidden lg:inline-flex items-center justify-center w-9 h-9 rounded-lg transition-all hover:bg-[var(--surface-glass)]"
              style={{ color: "var(--text-muted)" }}
            >
              {dark ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                aria-label="Lukk meny"
                className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg"
                style={{ color: "var(--text-muted)" }}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="text-[12px] uppercase tracking-[1.5px] mt-1 pl-[54px]" style={{ color: "var(--text-muted)" }}>
          Holmestrand
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
        {/* Generelt always on top */}
        {channels.filter((c) => c.slug === "generelt").map((channel) => {
          const isActive = pathname === `/channel/${channel.slug}`;
          const unread = unreadCounts[channel.id] || 0;
          return (
            <ChannelItem key={channel.id} channel={channel} isActive={isActive} unread={unread} onClose={onClose} />
          );
        })}

        {/* Floor groups */}
        {FLOOR_ORDER.map((floor) => {
          const floorChannels = channels
            .filter((c) => c.floor === floor)
            .sort((a, b) => a.name.localeCompare(b.name, "nb"));
          if (floorChannels.length === 0) return null;
          return (
            <div key={floor} className="mt-3">
              <div className="px-3 mb-1.5">
                <span className="text-[10px] font-medium uppercase" style={{ letterSpacing: "2.5px", color: "var(--text-muted)" }}>
                  {FLOOR_LABELS[floor]}
                </span>
              </div>
              {floorChannels.map((channel) => {
                const isActive = pathname === `/channel/${channel.slug}`;
                const unread = unreadCounts[channel.id] || 0;
                return (
                  <ChannelItem key={channel.id} channel={channel} isActive={isActive} unread={unread} onClose={onClose} />
                );
              })}
            </div>
          );
        })}

        {/* Ungrouped channels (no floor set, excluding generelt) */}
        {(() => {
          const ungrouped = channels.filter((c) => !c.floor && c.slug !== "generelt").sort((a, b) => a.name.localeCompare(b.name, "nb"));
          if (ungrouped.length === 0) return null;
          return (
            <div className="mt-3">
              <div className="px-3 mb-1.5">
                <span className="text-[10px] font-medium uppercase" style={{ letterSpacing: "2.5px", color: "var(--text-muted)" }}>
                  Annet
                </span>
              </div>
              {ungrouped.map((channel) => {
                const isActive = pathname === `/channel/${channel.slug}`;
                const unread = unreadCounts[channel.id] || 0;
                return (
                  <ChannelItem key={channel.id} channel={channel} isActive={isActive} unread={unread} onClose={onClose} />
                );
              })}
            </div>
          );
        })()}

        <DocumentList />

        {/* Bilder link */}
        <div className="py-3">
          <div className="px-3 mb-2">
            <span className="text-[10px] font-medium uppercase" style={{ letterSpacing: "2.5px", color: "var(--text-muted)" }}>
              Medier
            </span>
          </div>
          <Link
            href="/bilder"
            onClick={onClose}
            className={`flex items-center gap-2.5 mx-2 px-3.5 py-2.5 rounded-[10px] text-sm transition-colors ${
              pathname === "/bilder" ? "font-medium" : "font-normal"
            }`}
            style={
              pathname === "/bilder"
                ? { background: "linear-gradient(135deg, rgba(232, 168, 124, 0.2), rgba(212, 114, 106, 0.15))", border: "1px solid rgba(232, 168, 124, 0.2)", color: "var(--text-primary)" }
                : { color: "var(--text-secondary)" }
            }
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{ background: "rgba(232, 168, 124, 0.1)", border: "1px solid rgba(232, 168, 124, 0.15)" }}>
              🖼️
            </div>
            <span className="truncate">Alle bilder</span>
          </Link>
          <Link
            href="/plantegning"
            onClick={onClose}
            className={`flex items-center gap-2.5 mx-2 px-3.5 py-2.5 rounded-[10px] text-sm transition-colors ${
              pathname === "/plantegning" ? "font-medium" : "font-normal"
            }`}
            style={
              pathname === "/plantegning"
                ? { background: "linear-gradient(135deg, rgba(232, 168, 124, 0.2), rgba(212, 114, 106, 0.15))", border: "1px solid rgba(232, 168, 124, 0.2)", color: "var(--text-primary)" }
                : { color: "var(--text-secondary)" }
            }
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{ background: "rgba(232, 168, 124, 0.1)", border: "1px solid rgba(232, 168, 124, 0.15)" }}>
              📐
            </div>
            <span className="truncate">Plantegninger</span>
          </Link>
        </div>
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
            <img src={profile.avatar_url} alt={profile.display_name} className="w-9 h-9 rounded-[10px]" />
          ) : (
            <div className="w-9 h-9 rounded-[10px] avatar-gradient flex items-center justify-center font-display font-bold text-sm" style={{ color: "var(--bg-primary)" }}>
              {(profile?.display_name || "?")[0].toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium truncate" style={{ color: "var(--text-primary)" }}>{profile?.display_name}</p>
          {profile && isOnline?.(profile.id) && (
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}><span className="inline-block w-2 h-2 rounded-full mr-0.5" style={{ background: "#6BCB77", boxShadow: "0 0 8px rgba(107, 203, 119, 0.5)" }} /> Online</p>
          )}
        </div>
        <button
          onClick={onSignOut}
          aria-label="Logg ut"
          className="inline-flex items-center justify-center w-9 h-9 transition-colors rounded-lg hover:bg-[var(--surface-glass)]"
          style={{ color: "var(--text-muted)" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  );
}
