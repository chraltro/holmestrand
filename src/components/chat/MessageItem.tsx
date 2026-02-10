"use client";

import { Message, POST_TAG_LABELS, POST_TAG_COLORS, PostTag } from "@/lib/types";
import { useLightbox } from "@/components/ui/ImageLightbox";

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString("no-NO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) return time;
  if (isYesterday) return `i går ${time}`;

  return `${date.toLocaleDateString("no-NO", {
    day: "numeric",
    month: "short",
  })} ${time}`;
}

function isImageType(fileType: string | null): boolean {
  if (!fileType) return false;
  return fileType.startsWith("image/");
}

function isPdfType(fileType: string | null): boolean {
  if (!fileType) return false;
  return fileType === "application/pdf";
}

function NonImageAttachment({
  fileUrl,
  fileName,
  fileType,
}: {
  fileUrl: string;
  fileName: string | null;
  fileType: string | null;
}) {
  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors max-w-xs"
    >
      {isPdfType(fileType) ? (
        <svg
          className="w-8 h-8 text-red-500 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13h1c.55 0 1 .45 1 1s-.45 1-1 1h-1v1.5a.5.5 0 01-1 0V13a.5.5 0 01.5-.5h1zm4 0h.5c.83 0 1.5.67 1.5 1.5v1c0 .83-.67 1.5-1.5 1.5H12a.5.5 0 01-.5-.5v-3a.5.5 0 01.5-.5h.5zm.5 1v2h.5a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5H13z" />
        </svg>
      ) : (
        <svg
          className="w-8 h-8 text-gray-400 dark:text-gray-500 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      )}
      <span className="truncate text-gray-700 dark:text-gray-300">
        {fileName || "Fil"}
      </span>
    </a>
  );
}

interface FileInfo {
  url: string;
  name: string | null;
  type: string | null;
  messageId: string;
  isPinned?: boolean;
}

export function MessageItem({
  message,
  groupedFiles,
  onTogglePin,
}: {
  message: Message;
  groupedFiles?: FileInfo[];
  onTogglePin?: (messageId: string, isPinned: boolean) => void;
}) {
  const { openLightbox } = useLightbox();
  const profile = message.profiles;

  // Collect all files for this message (main + grouped)
  const allFiles: FileInfo[] = [];
  if (message.file_url) {
    allFiles.push({
      url: message.file_url,
      name: message.file_name,
      type: message.file_type,
      messageId: message.id,
      isPinned: message.is_pinned,
    });
  }
  if (groupedFiles) {
    allFiles.push(...groupedFiles);
  }

  const imageFiles = allFiles.filter((f) => isImageType(f.type));
  const nonImageFiles = allFiles.filter((f) => !isImageType(f.type));
  const allImageUrls = imageFiles.map((f) => f.url);

  return (
    <div className="flex gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
      {profile?.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt={profile.display_name}
          className="w-9 h-9 rounded-full flex-shrink-0 mt-0.5"
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-gray-300 dark:bg-gray-700 flex-shrink-0 mt-0.5 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
          {(profile?.display_name || "?")[0].toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {profile?.display_name || "Ukjent bruker"}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {formatTime(message.created_at)}
          </span>
          {allFiles.length > 0 && onTogglePin && (
            <button
              onClick={() =>
                onTogglePin(message.id, !!message.is_pinned)
              }
              className="opacity-0 group-hover:opacity-100 text-xs transition-all ml-auto"
              title={message.is_pinned ? "Fjern fra festet" : "Fest fil"}
            >
              {message.is_pinned ? (
                <svg
                  className="w-4 h-4 text-blue-500"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-gray-400 hover:text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"
                  />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Tag badge */}
        {message.tag && (
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${POST_TAG_COLORS[message.tag as PostTag]}`}>
            {POST_TAG_LABELS[message.tag as PostTag]}
          </span>
        )}

        {/* Text-only message (no files) */}
        {message.content && allFiles.length === 0 && (
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
            {message.content}
          </p>
        )}

        {/* Image grid */}
        {imageFiles.length > 0 && (
          <div
            className={`mt-2 gap-2 ${
              imageFiles.length === 1
                ? "flex"
                : "grid grid-cols-2 sm:grid-cols-3 max-w-md"
            }`}
          >
            {imageFiles.map((file, idx) => (
              <button
                key={file.messageId + file.url}
                onClick={() => openLightbox(allImageUrls, idx)}
                className="block overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <img
                  src={file.url}
                  alt={file.name || "Bilde"}
                  className={`object-cover ${
                    imageFiles.length === 1
                      ? "max-w-xs max-h-64"
                      : "w-full aspect-square"
                  }`}
                />
              </button>
            ))}
          </div>
        )}

        {/* Non-image files */}
        {nonImageFiles.map((file) => (
          <NonImageAttachment
            key={file.messageId + file.url}
            fileUrl={file.url}
            fileName={file.name}
            fileType={file.type}
          />
        ))}
      </div>
    </div>
  );
}
