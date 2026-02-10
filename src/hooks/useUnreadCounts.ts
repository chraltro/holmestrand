"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback, useRef } from "react";

export function useUnreadCounts(userId: string | null, channelIds: string[]) {
  const supabase = createClient();
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const lastReadRef = useRef<Record<string, string>>({});

  // Fetch last-read timestamps and message counts
  useEffect(() => {
    if (!userId || channelIds.length === 0) return;

    async function fetch() {
      // Fetch user's last-read times
      const { data: reads } = await supabase
        .from("channel_reads")
        .select("channel_id, last_read_at")
        .eq("user_id", userId);

      const readMap: Record<string, string> = {};
      reads?.forEach((r) => { readMap[r.channel_id] = r.last_read_at; });
      lastReadRef.current = readMap;

      // Count unread per channel
      const counts: Record<string, number> = {};
      await Promise.all(
        channelIds.map(async (cid) => {
          const lastRead = readMap[cid];
          let query = supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("channel_id", cid);
          if (lastRead) {
            query = query.gt("created_at", lastRead);
          }
          // Filter out own messages from unread count
          query = query.neq("user_id", userId);
          const { count } = await query;
          counts[cid] = count || 0;
        })
      );
      setUnreadCounts(counts);
    }

    fetch();
  }, [userId, channelIds, supabase]);

  // Listen for new messages across all channels
  useEffect(() => {
    if (!userId || channelIds.length === 0) return;

    const channel = supabase
      .channel("unread-counter")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new;
          if (msg.user_id !== userId && channelIds.includes(msg.channel_id)) {
            setUnreadCounts((prev) => ({
              ...prev,
              [msg.channel_id]: (prev[msg.channel_id] || 0) + 1,
            }));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, channelIds, supabase]);

  // Mark a channel as read
  const markAsRead = useCallback(async (channelId: string) => {
    if (!userId) return;
    const now = new Date().toISOString();
    lastReadRef.current[channelId] = now;
    setUnreadCounts((prev) => ({ ...prev, [channelId]: 0 }));

    await supabase.from("channel_reads").upsert(
      { channel_id: channelId, user_id: userId, last_read_at: now },
      { onConflict: "channel_id,user_id" }
    );
  }, [userId, supabase]);

  return { unreadCounts, markAsRead };
}
