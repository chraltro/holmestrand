"use client";

import { Message } from "@/lib/types";

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

function FileAttachment({
  fileUrl,
  fileName,
  fileType,
}: {
  fileUrl: string;
  fileName: string | null;
  fileType: string | null;
}) {
  if (isImageType(fileType)) {
    return (
      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block mt-2">
        <img
          src={fileUrl}
          alt={fileName || "Bilde"}
          className="max-w-xs max-h-64 rounded-lg border border-gray-200 object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 text-sm hover:bg-gray-200 transition-colors max-w-xs"
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
          className="w-8 h-8 text-gray-400 flex-shrink-0"
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
      <span className="truncate text-gray-700">
        {fileName || "Fil"}
      </span>
    </a>
  );
}

export function MessageItem({ message }: { message: Message }) {
  const profile = message.profiles;

  return (
    <div className="flex gap-3 px-4 py-2 hover:bg-gray-50 group">
      {profile?.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt={profile.display_name}
          className="w-9 h-9 rounded-full flex-shrink-0 mt-0.5"
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-gray-300 flex-shrink-0 mt-0.5 flex items-center justify-center text-sm font-medium text-gray-600">
          {(profile?.display_name || "?")[0].toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-gray-900">
            {profile?.display_name || "Ukjent bruker"}
          </span>
          <span className="text-xs text-gray-400">
            {formatTime(message.created_at)}
          </span>
        </div>
        {message.content && (
          <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
            {message.content}
          </p>
        )}
        {message.file_url && (
          <FileAttachment
            fileUrl={message.file_url}
            fileName={message.file_name}
            fileType={message.file_type}
          />
        )}
      </div>
    </div>
  );
}
