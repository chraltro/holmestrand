"use client";

import { createClient } from "@/lib/supabase/client";
import { Message, ReactionGroup } from "@/lib/types";
import { useEffect, useState, useCallback, useRef } from "react";

const PAGE_SIZE = 50;

export function useMessages(channelId: string | null, currentUserId: string | null = null) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const channelIdRef = useRef(channelId);

  useEffect(() => {
    channelIdRef.current = channelId;
  }, [channelId]);

  const fetchReactions = useCallback(async (msgIds: string[]): Promise<Record<string, ReactionGroup[]>> => {
    if (msgIds.length === 0) return {};
    const { data } = await supabase
      .from("message_reactions")
      .select("message_id, emoji, user_id")
      .in("message_id", msgIds);

    if (!data) return {};

    const map: Record<string, Record<string, { count: number; user_reacted: boolean }>> = {};
    for (const r of data) {
      if (!map[r.message_id]) map[r.message_id] = {};
      if (!map[r.message_id][r.emoji]) map[r.message_id][r.emoji] = { count: 0, user_reacted: false };
      map[r.message_id][r.emoji].count++;
      if (r.user_id === currentUserId) map[r.message_id][r.emoji].user_reacted = true;
    }

    const result: Record<string, ReactionGroup[]> = {};
    for (const [msgId, emojis] of Object.entries(map)) {
      result[msgId] = Object.entries(emojis).map(([emoji, d]) => ({ emoji, ...d }));
    }
    return result;
  }, [supabase, currentUserId]);

  const enrichMessages = useCallback(async (msgs: Message[]): Promise<Message[]> => {
    const ids = msgs.map((m) => m.id);
    const replyIds = msgs.filter((m) => m.reply_to).map((m) => m.reply_to!);

    const [reactions, replyMsgs] = await Promise.all([
      fetchReactions(ids),
      replyIds.length > 0
        ? supabase.from("messages").select("id, content, user_id, profiles(display_name, avatar_url)").in("id", replyIds).then((r) => r.data || [])
        : Promise.resolve([]),
    ]);

    const replyMap = new Map(replyMsgs.map((m) => [m.id, m]));

    return msgs.map((m) => ({
      ...m,
      reactions: reactions[m.id] || [],
      reply_message: m.reply_to ? (replyMap.get(m.reply_to) as unknown as Message) ?? null : null,
    }));
  }, [fetchReactions, supabase]);

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
        const enriched = await enrichMessages(data.reverse());
        setMessages(enriched);
        setHasMore(data.length === PAGE_SIZE);
      }
      setLoading(false);
    }

    fetchMessages();
  }, [channelId, supabase, enrichMessages]);

  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`messages:${channelId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        async (payload) => {
          if (channelIdRef.current !== channelId) return;
          const { data } = await supabase.from("messages").select("*, profiles(*)").eq("id", payload.new.id).single();
          if (data) {
            const [enriched] = await enrichMessages([data]);
            setMessages((prev) => {
              if (prev.some((m) => m.id === enriched.id)) return prev;
              return [...prev, enriched];
            });
          }
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        (payload) => {
          if (channelIdRef.current !== channelId) return;
          const updated = payload.new as Message;
          setMessages((prev) => prev.map((m) => m.id === updated.id ? { ...m, ...updated } : m));
        }
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        (payload) => {
          if (channelIdRef.current !== channelId) return;
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [channelId, supabase, enrichMessages]);

  const loadMore = useCallback(async () => {
    if (!channelId || !hasMore || messages.length === 0) return;
    const { data } = await supabase
      .from("messages").select("*, profiles(*)").eq("channel_id", channelId)
      .lt("created_at", messages[0].created_at).order("created_at", { ascending: false }).limit(PAGE_SIZE);
    if (data) {
      const enriched = await enrichMessages(data.reverse());
      setMessages((prev) => [...enriched, ...prev]);
      setHasMore(data.length === PAGE_SIZE);
    }
  }, [channelId, hasMore, messages, supabase, enrichMessages]);

  const deleteMessage = useCallback(async (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    await supabase.from("messages").delete().eq("id", messageId);
  }, [supabase]);

  const togglePin = useCallback(async (messageId: string, currentlyPinned: boolean) => {
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, is_pinned: !currentlyPinned } : m));
    await supabase.from("messages").update({ is_pinned: !currentlyPinned }).eq("id", messageId);
  }, [supabase]);

  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, content: newContent, edited_at: new Date().toISOString() } : m));
    await supabase.from("messages").update({ content: newContent, edited_at: new Date().toISOString() }).eq("id", messageId);
  }, [supabase]);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUserId) return;
    setMessages((prev) => prev.map((m) => {
      if (m.id !== messageId) return m;
      const reactions = [...(m.reactions || [])];
      const idx = reactions.findIndex((r) => r.emoji === emoji);
      if (idx >= 0) {
        if (reactions[idx].user_reacted) {
          reactions[idx] = { ...reactions[idx], count: reactions[idx].count - 1, user_reacted: false };
          if (reactions[idx].count <= 0) reactions.splice(idx, 1);
        } else {
          reactions[idx] = { ...reactions[idx], count: reactions[idx].count + 1, user_reacted: true };
        }
      } else {
        reactions.push({ emoji, count: 1, user_reacted: true });
      }
      return { ...m, reactions };
    }));

    const { data: existing } = await supabase.from("message_reactions").select("id")
      .eq("message_id", messageId).eq("user_id", currentUserId).eq("emoji", emoji).maybeSingle();
    if (existing) {
      await supabase.from("message_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("message_reactions").insert({ message_id: messageId, user_id: currentUserId, emoji });
    }
  }, [supabase, currentUserId]);

  return { messages, loading, hasMore, loadMore, deleteMessage, togglePin, editMessage, toggleReaction };
}
