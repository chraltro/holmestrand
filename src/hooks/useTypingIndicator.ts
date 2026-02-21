"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";

interface TypingUser {
  userId: string;
  displayName: string;
  avatarUrl: string;
}

export function useTypingIndicator(
  channelId: string | null,
  userId: string | null,
  displayName: string,
  avatarUrl: string
) {
  const supabase = useMemo(() => createClient(), []);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const lastEmitRef = useRef(0);

  // Subscribe to typing events on this channel
  useEffect(() => {
    if (!channelId || !userId) return;

    const channel = supabase.channel(`typing:${channelId}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "typing" }, (payload) => {
        const data = payload.payload as TypingUser;
        if (data.userId === userId) return; // Ignore own typing

        setTypingUsers((prev) => {
          if (prev.some((u) => u.userId === data.userId)) return prev;
          return [...prev, data];
        });

        // Clear after 3 seconds of no new typing event from this user
        const existing = timeoutsRef.current.get(data.userId);
        if (existing) clearTimeout(existing);
        timeoutsRef.current.set(
          data.userId,
          setTimeout(() => {
            setTypingUsers((prev) =>
              prev.filter((u) => u.userId !== data.userId)
            );
            timeoutsRef.current.delete(data.userId);
          }, 3000)
        );
      })
      .on("broadcast", { event: "stop_typing" }, (payload) => {
        const data = payload.payload as { userId: string };
        setTypingUsers((prev) =>
          prev.filter((u) => u.userId !== data.userId)
        );
        const existing = timeoutsRef.current.get(data.userId);
        if (existing) {
          clearTimeout(existing);
          timeoutsRef.current.delete(data.userId);
        }
      })
      .subscribe();

    const timeouts = timeoutsRef.current;
    return () => {
      // Clean up all timeouts
      timeouts.forEach((timeout) => {
        clearTimeout(timeout);
      });
      timeouts.clear();
      setTypingUsers([]);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [channelId, userId, supabase]);

  // Emit typing event (throttled to once per 2 seconds)
  const emitTyping = useCallback(() => {
    if (!channelRef.current || !userId) return;
    const now = Date.now();
    if (now - lastEmitRef.current < 2000) return;
    lastEmitRef.current = now;

    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { userId, displayName, avatarUrl },
    });
  }, [userId, displayName, avatarUrl]);

  // Emit stop typing
  const emitStopTyping = useCallback(() => {
    if (!channelRef.current || !userId) return;
    lastEmitRef.current = 0;
    channelRef.current.send({
      type: "broadcast",
      event: "stop_typing",
      payload: { userId },
    });
  }, [userId]);

  return { typingUsers, emitTyping, emitStopTyping };
}
