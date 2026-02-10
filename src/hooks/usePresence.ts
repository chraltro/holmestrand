"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useRef } from "react";

interface PresenceState {
  userId: string;
  displayName: string;
  avatarUrl: string;
  lastSeen: string;
}

export function usePresence(userId: string | null, displayName: string, avatarUrl: string) {
  const supabase = createClient();
  const [onlineUsers, setOnlineUsers] = useState<Map<string, PresenceState>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel("presence:global", {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceState>();
        const users = new Map<string, PresenceState>();
        for (const [key, presences] of Object.entries(state)) {
          if (presences.length > 0) {
            users.set(key, presences[0] as unknown as PresenceState);
          }
        }
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId,
            displayName,
            avatarUrl,
            lastSeen: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [userId, displayName, avatarUrl, supabase]);

  const isOnline = (uid: string) => onlineUsers.has(uid);
  const onlineCount = onlineUsers.size;

  return { onlineUsers, isOnline, onlineCount };
}
