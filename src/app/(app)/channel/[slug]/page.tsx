"use client";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/useMessages";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { FileGrid } from "@/components/files/FileGrid";
import { BoardGrid } from "@/components/boards/BoardGrid";
import { Channel } from "@/lib/types";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

type Tab = "chat" | "filer" | "tavle";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "chat", label: "Chat", icon: "chat" },
  { key: "filer", label: "Filer", icon: "file" },
  { key: "tavle", label: "Tavle", icon: "board" },
];

function TabIcon({ icon, className }: { icon: string; className?: string }) {
  if (icon === "chat")
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    );
  if (icon === "file")
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

export default function ChannelPage() {
  const params = useParams();
  const slug = params.slug as string;
  const supabase = createClient();
  const { user } = useAuth();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [loading, setLoading] = useState(true);

  const isGenerelt = slug === "generelt";

  const { messages, loading: messagesLoading, hasMore, loadMore } = useMessages(
    channel?.id ?? null
  );

  useEffect(() => {
    async function fetchChannel() {
      const { data } = await supabase
        .from("channels")
        .select("*")
        .eq("slug", slug)
        .single();

      setChannel(data);
      setLoading(false);
    }

    fetchChannel();
    setActiveTab("chat");
  }, [slug, supabase]);

  const handleTogglePin = useCallback(
    async (messageId: string, isPinned: boolean) => {
      await supabase
        .from("messages")
        .update({ is_pinned: !isPinned })
        .eq("id", messageId);
    },
    [supabase]
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <span className="text-gray-400 text-sm">Laster kanal...</span>
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Kanalen ble ikke funnet</p>
      </div>
    );
  }

  const visibleTabs = isGenerelt ? TABS.filter((t) => t.key !== "tavle") : TABS;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Channel header */}
      <div className="border-b border-gray-200 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            <span className="text-indigo-400 dark:text-indigo-500 mr-1">#</span>
            {channel.name}
          </h2>
        </div>

        {/* Pill tabs */}
        <div className="flex gap-1 mt-3 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex-1 justify-center ${
                activeTab === tab.key
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <TabIcon icon={tab.icon} className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "chat" ? (
        <>
          <MessageList
            messages={messages}
            loading={messagesLoading}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onTogglePin={handleTogglePin}
          />
          {user && <MessageInput channelId={channel.id} userId={user.id} showTagSelector={!isGenerelt} />}
        </>
      ) : activeTab === "filer" ? (
        <FileGrid channelId={channel.id} onTogglePin={handleTogglePin} />
      ) : (
        <BoardGrid channelId={channel.id} userId={user?.id ?? null} />
      )}
    </div>
  );
}
