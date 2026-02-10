"use client";

import { Message, Profile } from "@/lib/types";
import { MessageItem } from "./MessageItem";
import { useEffect, useRef, useMemo } from "react";

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onTogglePin?: (messageId: string, isPinned: boolean) => void;
  onDelete?: (messageId: string) => void;
  onEdit?: (messageId: string, content: string) => void;
  onReply?: (message: Message) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  currentUserId: string | null;
  isAdmin: boolean;
  allProfiles?: Profile[];
}

interface FileInfo {
  url: string;
  name: string | null;
  type: string | null;
  messageId: string;
  isPinned?: boolean;
}

interface MessageGroup {
  message: Message;
  groupedFiles: FileInfo[];
}

const GROUP_WINDOW_MS = 30_000; // 30 seconds

function groupMessages(messages: Message[]): MessageGroup[] {
  const groups: MessageGroup[] = [];

  for (const msg of messages) {
    const lastGroup = groups[groups.length - 1];

    // Group consecutive file messages from the same user within the time window
    if (
      lastGroup &&
      msg.file_url &&
      lastGroup.message.file_url &&
      msg.user_id &&
      msg.user_id === lastGroup.message.user_id &&
      Math.abs(
        new Date(msg.created_at).getTime() -
          new Date(lastGroup.message.created_at).getTime()
      ) < GROUP_WINDOW_MS
    ) {
      lastGroup.groupedFiles.push({
        url: msg.file_url,
        name: msg.file_name,
        type: msg.file_type,
        messageId: msg.id,
        isPinned: msg.is_pinned,
      });
    } else {
      groups.push({ message: msg, groupedFiles: [] });
    }
  }

  return groups;
}

export function MessageList({
  messages,
  loading,
  hasMore,
  onLoadMore,
  onTogglePin,
  onDelete,
  onEdit,
  onReply,
  onReaction,
  currentUserId,
  isAdmin,
  allProfiles,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

  const grouped = useMemo(() => groupMessages(messages), [messages]);

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
        {grouped.map((group) => (
          <MessageItem
            key={group.message.id}
            message={group.message}
            groupedFiles={
              group.groupedFiles.length > 0
                ? group.groupedFiles
                : undefined
            }
            onTogglePin={onTogglePin}
            onDelete={onDelete}
            onEdit={onEdit}
            onReply={onReply}
            onReaction={onReaction}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            allProfiles={allProfiles}
          />
        ))}
      </div>

      <div ref={bottomRef} />
    </div>
  );
}
