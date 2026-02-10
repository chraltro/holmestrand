"use client";

import { createClient } from "@/lib/supabase/client";
import { Message, ReactionGroup } from "@/lib/types";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";

const PAGE_SIZE = 50;

// Module-level cache so channel messages persist across navigations
const messageCache = new Map<string, Message[]>();

export function useMessages(channelId: string | null, currentUserId: string | null = null) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Message[]>(() =>
    channelId ? messageCache.get(channelId) ?? [] : []
  );
  const [loading, setLoading] = useState(() =>
    channelId ? !messageCache.has(channelId) : false
  );
  const [hasMore, setHasMore] = useState(true);
  const channelIdRef = useRef(channelId);
  const currentUserIdRef = useRef(currentUserId);

  useEffect(() => { channelIdRef.current = channelId; }, [channelId]);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);

  // Stable fetchReactions using ref for currentUserId
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
      if (r.user_id === currentUserIdRef.current) map[r.message_id][r.emoji].user_reacted = true;
    }

    const result: Record<string, ReactionGroup[]> = {};
    for (const [msgId, emojis] of Object.entries(map)) {
      result[msgId] = Object.entries(emojis).map(([emoji, d]) => ({ emoji, ...d }));
    }
    return result;
  }, [supabase]);

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

  // Store enrichMessages in a ref so the subscription never re-creates
  const enrichRef = useRef(enrichMessages);
  useEffect(() => { enrichRef.current = enrichMessages; }, [enrichMessages]);

  // Fetch messages — uses cached data for instant display, then refreshes
  useEffect(() => {
    if (!channelId) { setMessages([]); setLoading(false); return; }
    const cid = channelId;

    const cached = messageCache.get(cid);
    if (cached && cached.length > 0) {
      setMessages(cached);
      setLoading(false);
    } else {
      setMessages([]);
      setLoading(true);
    }
    setHasMore(true);

    let cancelled = false;
    async function fetchMessages() {
      const { data } = await supabase
        .from("messages")
        .select("*, profiles(*)")
        .eq("channel_id", cid)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (cancelled || channelIdRef.current !== cid) return;
      if (data) {
        const enriched = await enrichRef.current(data.reverse());
        if (cancelled || channelIdRef.current !== cid) return;
        setMessages(enriched);
        messageCache.set(cid, enriched);
        setHasMore(data.length === PAGE_SIZE);
      }
      setLoading(false);
    }

    fetchMessages();
    return () => { cancelled = true; };
  }, [channelId, supabase]);

  // Realtime subscription — only depends on channelId and supabase (both stable)
  useEffect(() => {
    if (!channelId) return;
    const cid = channelId;

    const channel = supabase
      .channel(`messages:${cid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${cid}` },
        async (payload) => {
          if (channelIdRef.current !== cid) return;
          const { data } = await supabase.from("messages").select("*, profiles(*)").eq("id", payload.new.id).single();
          if (data) {
            const [enriched] = await enrichRef.current([data]);
            setMessages((prev) => {
              if (prev.some((m) => m.id === enriched.id)) return prev;
              const updated = [...prev, enriched];
              messageCache.set(cid, updated);
              return updated;
            });
          }
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `channel_id=eq.${cid}` },
        (payload) => {
          if (channelIdRef.current !== cid) return;
          const updated = payload.new as Message;
          setMessages((prev) => {
            const next = prev.map((m) => m.id === updated.id ? { ...m, ...updated } : m);
            messageCache.set(cid, next);
            return next;
          });
        }
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages", filter: `channel_id=eq.${cid}` },
        (payload) => {
          if (channelIdRef.current !== cid) return;
          setMessages((prev) => {
            const next = prev.filter((m) => m.id !== payload.old.id);
            messageCache.set(cid, next);
            return next;
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [channelId, supabase]);

  const loadMore = useCallback(async () => {
    if (!channelId || !hasMore) return;
    setMessages((current) => {
      if (current.length === 0) return current;
      (async () => {
        const { data } = await supabase
          .from("messages").select("*, profiles(*)").eq("channel_id", channelId)
          .lt("created_at", current[0].created_at).order("created_at", { ascending: false }).limit(PAGE_SIZE);
        if (data && channelIdRef.current === channelId) {
          const enriched = await enrichRef.current(data.reverse());
          setMessages((prev) => {
            const updated = [...enriched, ...prev];
            messageCache.set(channelId, updated);
            return updated;
          });
          setHasMore(data.length === PAGE_SIZE);
        }
      })();
      return current;
    });
  }, [channelId, hasMore, supabase]);

  const deleteMessage = useCallback(async (messageId: string) => {
    const prev = messages;
    const msg = messages.find((m) => m.id === messageId);
    setMessages((p) => {
      const next = p.filter((m) => m.id !== messageId);
      if (channelIdRef.current) messageCache.set(channelIdRef.current, next);
      return next;
    });

    const { error } = await supabase.from("messages").delete().eq("id", messageId);
    if (error) {
      console.error("Failed to delete message:", error);
      alert("Kunne ikke slette meldingen. Mangler kanskje rettigheter i databasen.");
      setMessages(prev);
      if (channelIdRef.current) messageCache.set(channelIdRef.current, prev);
      return;
    }

    if (msg?.file_url) {
      const match = msg.file_url.match(/\/object\/public\/files\/(.+?)(\?|$)/);
      if (match) {
        await supabase.storage.from("files").remove([decodeURIComponent(match[1])]);
      }
    }
  }, [supabase, messages]);

  const togglePin = useCallback(async (messageId: string, currentlyPinned: boolean) => {
    setMessages((prev) => {
      const next = prev.map((m) => m.id === messageId ? { ...m, is_pinned: !currentlyPinned } : m);
      if (channelIdRef.current) messageCache.set(channelIdRef.current, next);
      return next;
    });
    await supabase.from("messages").update({ is_pinned: !currentlyPinned }).eq("id", messageId);
  }, [supabase]);

  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    setMessages((prev) => {
      const next = prev.map((m) => m.id === messageId ? { ...m, content: newContent, edited_at: new Date().toISOString() } : m);
      if (channelIdRef.current) messageCache.set(channelIdRef.current, next);
      return next;
    });
    await supabase.from("messages").update({ content: newContent, edited_at: new Date().toISOString() }).eq("id", messageId);
  }, [supabase]);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    const uid = currentUserIdRef.current;
    if (!uid) return;
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
      .eq("message_id", messageId).eq("user_id", uid).eq("emoji", emoji).maybeSingle();
    if (existing) {
      await supabase.from("message_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("message_reactions").insert({ message_id: messageId, user_id: uid, emoji });
    }
  }, [supabase]);

  return { messages, loading, hasMore, loadMore, deleteMessage, togglePin, editMessage, toggleReaction };
}
