"use client";

import { Channel, Profile } from "@/lib/types";
import { useTheme } from "@/hooks/useTheme";
import { DocumentList } from "@/components/sidebar/DocumentList";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface ChannelSidebarProps {
  channels: Channel[];
  profile: Profile | null;
  onSignOut: () => void;
  onClose?: () => void;
}

export function ChannelSidebar({
  channels,
  profile,
  onSignOut,
  onClose,
}: ChannelSidebarProps) {
  const pathname = usePathname();
  const { dark, toggle } = useTheme();

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h1 className="text-xl font-bold">Holmestrand</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={toggle}
            className="hidden lg:block text-gray-400 hover:text-white p-1"
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
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden text-gray-400 hover:text-white p-1"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-3">
        <div className="px-3 mb-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Kanaler
          </span>
        </div>
        {channels.map((channel) => {
          const isActive = pathname === `/channel/${channel.slug}`;
          return (
            <Link
              key={channel.id}
              href={`/channel/${channel.slug}`}
              onClick={onClose}
              className={`flex items-center gap-2 mx-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <span className="text-gray-500">#</span>
              {channel.name}
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
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
              pathname === "/admin"
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Admin
          </Link>
        </div>
      )}

      {/* User footer */}
      <div className="p-3 border-t border-gray-700 flex items-center gap-3">
        {profile?.avatar_url && (
          <img
            src={profile.avatar_url}
            alt={profile.display_name}
            className="w-8 h-8 rounded-full"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {profile?.display_name}
          </p>
        </div>
        <button
          onClick={onSignOut}
          className="text-gray-400 hover:text-white transition-colors"
          title="Logg ut"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
