"use client";

import { createClient } from "@/lib/supabase/client";
import { Message } from "@/lib/types";
import { useEffect, useState } from "react";

function isImageType(fileType: string | null): boolean {
  if (!fileType) return false;
  return fileType.startsWith("image/");
}

function isPdfType(fileType: string | null): boolean {
  if (!fileType) return false;
  return fileType === "application/pdf";
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("no-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function FileGrid({
  channelId,
  onTogglePin,
}: {
  channelId: string;
  onTogglePin?: (messageId: string, isPinned: boolean) => void;
}) {
  const supabase = createClient();
  const [files, setFiles] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFiles() {
      const { data } = await supabase
        .from("messages")
        .select("*, profiles(*)")
        .eq("channel_id", channelId)
        .not("file_url", "is", null)
        .order("created_at", { ascending: false });

      if (data) setFiles(data);
      setLoading(false);
    }

    fetchFiles();
  }, [channelId, supabase]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Laster filer...</div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Ingen filer lastet opp ennå</p>
      </div>
    );
  }

  const pinnedFiles = files.filter((f) => f.is_pinned);
  const otherFiles = files.filter((f) => !f.is_pinned);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {pinnedFiles.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-1.5">
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
            </svg>
            Festede filer
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {pinnedFiles.map((file) => (
              <FileCard key={file.id} file={file} onTogglePin={onTogglePin} />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {(pinnedFiles.length > 0 ? otherFiles : files).map((file) => (
          <FileCard key={file.id} file={file} onTogglePin={onTogglePin} />
        ))}
      </div>
    </div>
  );
}

function FileCard({
  file,
  onTogglePin,
}: {
  file: Message;
  onTogglePin?: (messageId: string, isPinned: boolean) => void;
}) {
  return (
    <div className="group relative bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
      <a
        href={file.file_url!}
        target="_blank"
        rel="noopener noreferrer"
      >
        {isImageType(file.file_type) ? (
          <div className="aspect-square bg-gray-100 dark:bg-gray-800">
            <img
              src={file.file_url!}
              alt={file.file_name || "Bilde"}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-square bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
            {isPdfType(file.file_type) ? (
              <svg
                className="w-16 h-16 text-red-400"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13h1c.55 0 1 .45 1 1s-.45 1-1 1h-1v1.5a.5.5 0 01-1 0V13a.5.5 0 01.5-.5h1zm4 0h.5c.83 0 1.5.67 1.5 1.5v1c0 .83-.67 1.5-1.5 1.5H12a.5.5 0 01-.5-.5v-3a.5.5 0 01.5-.5h.5zm.5 1v2h.5a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5H13z" />
              </svg>
            ) : (
              <svg
                className="w-16 h-16 text-gray-300 dark:text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            )}
          </div>
        )}
      </a>

      {onTogglePin && (
        <button
          onClick={() => onTogglePin(file.id, !!file.is_pinned)}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-white dark:bg-gray-800 rounded-full p-1.5 shadow-sm border border-gray-200 dark:border-gray-600 transition-opacity"
          title={file.is_pinned ? "Fjern fra festet" : "Fest fil"}
        >
          {file.is_pinned ? (
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
            </svg>
          )}
        </button>
      )}

      <div className="p-2">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
          {file.file_name || "Fil"}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {file.profiles?.display_name} &middot;{" "}
          {formatDate(file.created_at)}
        </p>
      </div>
    </div>
  );
}
