"use client";

import { Message } from "@/lib/types";
import { MessageItem } from "./MessageItem";
import { useEffect, useRef } from "react";

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onTogglePin?: (messageId: string, isPinned: boolean) => void;
}

export function MessageList({
  messages,
  loading,
  hasMore,
  onLoadMore,
  onTogglePin,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      const container = containerRef.current;
      if (container) {
        const isNearBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight <
          150;

        if (isNearBottom || prevMessageCountRef.current === 0) {
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Laster meldinger...</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto scrollbar-thin"
    >
      {hasMore && (
        <div className="p-4 text-center">
          <button
            onClick={onLoadMore}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            Last inn eldre meldinger
          </button>
        </div>
      )}

      {messages.length === 0 && (
        <div className="flex-1 flex items-center justify-center h-full">
          <p className="text-gray-400 text-sm">
            Ingen meldinger ennå. Vær den første!
          </p>
        </div>
      )}

      <div className="py-2">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            onTogglePin={onTogglePin}
          />
        ))}
      </div>

      <div ref={bottomRef} />
    </div>
  );
}
