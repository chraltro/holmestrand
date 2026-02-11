"use client";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/useMessages";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";

import { BoardGrid } from "@/components/boards/BoardGrid";
import { Channel, Message, Profile } from "@/lib/types";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Tab = "chat" | "tavle";


const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "chat", label: "Chat", icon: "chat" },
  { key: "tavle", label: "Tavle", icon: "board" },
];

function TabIcon({ icon, className }: { icon: string; className?: string }) {
  if (icon === "chat")
    return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>);
  return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>);
}

export default function ChannelPage() {
  const params = useParams();
  const slug = params.slug as string;
  const supabase = createClient();
  const { user, profile } = useAuth();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const isGenerelt = slug === "generelt";

  const { messages, loading: messagesLoading, hasMore, loadMore, deleteMessage, togglePin, editMessage, toggleReaction } = useMessages(channel?.id ?? null, user?.id ?? null);

  useEffect(() => {
    async function fetchChannel() {
      const { data } = await supabase.from("channels").select("*").eq("slug", slug).single();
      setChannel(data);
      setLoading(false);
    }
    fetchChannel();
    setActiveTab("chat");
  }, [slug, supabase]);

  useEffect(() => {
    async function fetchProfiles() {
      const { data } = await supabase.from("profiles").select("id, display_name, avatar_url, email, is_admin, is_approved, created_at").eq("is_approved", true);
      if (data) setAllProfiles(data);
    }
    fetchProfiles();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>Laster kanal...</span>
        </div>
      </div>
    );
  }

  if (!channel) {
    return (<div className="flex-1 flex items-center justify-center"><p style={{ color: "var(--text-muted)" }}>Kanalen ble ikke funnet</p></div>);
  }

  const visibleTabs = isGenerelt ? TABS.filter((t) => t.key === "chat") : TABS;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="glass-solid px-4 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {channel.emoji && <span className="text-xl">{channel.emoji}</span>}
            <h2 className="text-xl font-display font-medium" style={{ color: "var(--text-primary)" }}>
              {channel.name}
            </h2>
          </div>
        </div>
        <div className="flex gap-1 mt-3 rounded-[10px] p-[3px] glass">
          {visibleTabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex-1 justify-center ${activeTab === tab.key ? "glass shadow-sm" : ""}`}
              style={{ color: activeTab === tab.key ? "var(--accent-amber)" : "var(--text-muted)", letterSpacing: "0.5px" }}>
              <TabIcon icon={tab.icon} className="w-3.5 h-3.5" />{tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "chat" ? (
        <>
          <MessageList messages={messages} loading={messagesLoading} hasMore={hasMore} onLoadMore={loadMore} onTogglePin={togglePin} onDelete={deleteMessage} onEdit={editMessage} onReply={(msg) => setReplyTo(msg)} onReaction={toggleReaction} currentUserId={user?.id ?? null} isAdmin={!!profile?.is_admin} allProfiles={allProfiles} />
          {user && <MessageInput channelId={channel.id} userId={user.id} showTagSelector={!isGenerelt} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} profiles={allProfiles} />}
        </>
      ) : (
        <BoardGrid channelId={channel.id} userId={user?.id ?? null} />
      )}
    </div>
  );
}
