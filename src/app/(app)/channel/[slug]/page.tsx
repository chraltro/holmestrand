"use client";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/useMessages";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { FileGrid } from "@/components/files/FileGrid";
import { Channel } from "@/lib/types";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

export default function ChannelPage() {
  const params = useParams();
  const slug = params.slug as string;
  const supabase = createClient();
  const { user } = useAuth();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "filer">("chat");
  const [loading, setLoading] = useState(true);

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
        <div className="animate-pulse text-gray-400">Laster kanal...</div>
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

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Channel header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            # {channel.name}
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mt-2">
          <button
            onClick={() => setActiveTab("chat")}
            className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
              activeTab === "chat"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab("filer")}
            className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
              activeTab === "filer"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Filer
          </button>
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
          {user && <MessageInput channelId={channel.id} userId={user.id} />}
        </>
      ) : (
        <FileGrid channelId={channel.id} onTogglePin={handleTogglePin} />
      )}
    </div>
  );
}
