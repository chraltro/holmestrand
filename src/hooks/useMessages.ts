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
          if (channelIdRef.current !== channelId) return;

          const { data } = await supabase
            .from("messages")
            .select("*, profiles(*)")
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.id)) return prev;
              return [...prev, data];
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          if (channelIdRef.current !== channelId) return;
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updated.id ? { ...m, ...updated } : m
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          if (channelIdRef.current !== channelId) return;
          const deletedId = payload.old.id as string;
          setMessages((prev) => prev.filter((m) => m.id !== deletedId));
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

  // Delete a message
  const deleteMessage = useCallback(async (messageId: string) => {
    // Optimistic removal
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    await supabase.from("messages").delete().eq("id", messageId);
  }, [supabase]);

  // Toggle pin on a message
  const togglePin = useCallback(async (messageId: string, currentlyPinned: boolean) => {
    // Optimistic update
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, is_pinned: !currentlyPinned } : m
      )
    );
    await supabase
      .from("messages")
      .update({ is_pinned: !currentlyPinned })
      .eq("id", messageId);
  }, [supabase]);

  return { messages, loading, hasMore, loadMore, deleteMessage, togglePin };
}
