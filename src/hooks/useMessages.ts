"use client";

import { createClient } from "@/lib/supabase/client";
import { Message } from "@/lib/types";
import { useEffect, useState, useCallback, useRef } from "react";

const PAGE_SIZE = 50;

export function useMessages(channelId: string | null) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const channelIdRef = useRef(channelId);

  useEffect(() => {
    channelIdRef.current = channelId;
  }, [channelId]);

  // Initial load
  useEffect(() => {
    if (!channelId) return;

    setMessages([]);
    setHasMore(true);
    setLoading(true);

    async function fetchMessages() {
      const { data } = await supabase
        .from("messages")
        .select("*, profiles(*)")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (data) {
        setMessages(data.reverse());
        setHasMore(data.length === PAGE_SIZE);
      }
      setLoading(false);
    }

    fetchMessages();
  }, [channelId, supabase]);

  // Realtime subscription
  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          // Only handle messages for the current channel
          if (channelIdRef.current !== channelId) return;

          // Fetch the full message with profile
          const { data } = await supabase
            .from("messages")
            .select("*, profiles(*)")
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === data.id)) return prev;
              return [...prev, data];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, supabase]);

  // Load more (older messages)
  const loadMore = useCallback(async () => {
    if (!channelId || !hasMore || messages.length === 0) return;

    const oldestMessage = messages[0];
    const { data } = await supabase
      .from("messages")
      .select("*, profiles(*)")
      .eq("channel_id", channelId)
      .lt("created_at", oldestMessage.created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (data) {
      setMessages((prev) => [...data.reverse(), ...prev]);
      setHasMore(data.length === PAGE_SIZE);
    }
  }, [channelId, hasMore, messages, supabase]);

  return { messages, loading, hasMore, loadMore };
}
