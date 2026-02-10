"use client";

import { createClient } from "@/lib/supabase/client";
import { Message } from "@/lib/types";
import { useLightbox } from "@/components/ui/ImageLightbox";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";

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
  currentUserId,
  isAdmin,
}: {
  channelId: string;
  onTogglePin?: (messageId: string, isPinned: boolean) => void;
  currentUserId?: string | null;
  isAdmin?: boolean;
}) {
  const supabase = createClient();
  const [files, setFiles] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { openLightbox } = useLightbox();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

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

  // Collect all image URLs for lightbox navigation
  const allImageUrls = useMemo(
    () =>
      files
        .filter((f) => isImageType(f.file_type) && f.file_url)
        .map((f) => f.file_url!),
    [files]
  );

  const handleDragStart = useCallback((id: string) => {
    setDraggedId(id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverId(id);
  }, []);

  const handleDrop = useCallback((targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    setFiles((prev) => {
      const pinned = prev.filter((f) => f.is_pinned);
      const other = prev.filter((f) => !f.is_pinned);
      const fromIdx = pinned.findIndex((f) => f.id === draggedId);
      const toIdx = pinned.findIndex((f) => f.id === targetId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const reordered = [...pinned];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      return [...reordered, ...other];
    });
    setDraggedId(null);
    setDragOverId(null);
  }, [draggedId]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverId(null);
  }, []);

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

  function handleTogglePin(messageId: string, isPinned: boolean) {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === messageId ? { ...f, is_pinned: !isPinned } : f
      )
    );
    onTogglePin?.(messageId, isPinned);
  }

  async function handleDeleteFile(file: Message) {
    if (!confirm(`Er du sikker på at du vil slette "${file.file_name || "denne filen"}"?`)) return;
    setFiles((prev) => prev.filter((f) => f.id !== file.id));

    // Delete from storage
    if (file.file_url) {
      const match = file.file_url.match(/\/files\/(.+)$/);
      if (match) {
        await supabase.storage.from("files").remove([decodeURIComponent(match[1])]);
      }
    }

    // Delete message row
    await supabase.from("messages").delete().eq("id", file.id);
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
            {pinnedFiles.length > 1 && <span className="text-[10px] text-gray-400 font-normal ml-1">(dra for å endre rekkefølge)</span>}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {pinnedFiles.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                onTogglePin={handleTogglePin}
                onDelete={(isAdmin || (currentUserId && file.user_id === currentUserId)) ? () => handleDeleteFile(file) : undefined}
                allImageUrls={allImageUrls}
                draggable
                isDragging={draggedId === file.id}
                isDragOver={dragOverId === file.id}
                onDragStart={() => handleDragStart(file.id)}
                onDragOver={(e) => handleDragOver(e, file.id)}
                onDrop={() => handleDrop(file.id)}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {(pinnedFiles.length > 0 ? otherFiles : files).map((file) => (
          <FileCard
            key={file.id}
            file={file}
            onTogglePin={handleTogglePin}
            onDelete={(isAdmin || (currentUserId && file.user_id === currentUserId)) ? () => handleDeleteFile(file) : undefined}
            allImageUrls={allImageUrls}
          />
        ))}
      </div>
    </div>
  );
}

function FileCard({
  file,
  onTogglePin,
  onDelete,
  allImageUrls,
  draggable,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  file: Message;
  onTogglePin?: (messageId: string, isPinned: boolean) => void;
  onDelete?: () => void;
  allImageUrls: string[];
  draggable?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
}) {
  const { openLightbox } = useLightbox();
  const isImage = isImageType(file.file_type);

  function handleClick(e: React.MouseEvent) {
    if (isImage && file.file_url) {
      e.preventDefault();
      const idx = allImageUrls.indexOf(file.file_url);
      openLightbox(allImageUrls, idx >= 0 ? idx : 0);
    }
  }

  return (
    <div
      className={`group relative bg-white dark:bg-gray-900 rounded-lg border overflow-hidden hover:shadow-md transition-all ${
        isDragOver ? "border-indigo-400 ring-2 ring-indigo-400/30 scale-[1.02]" :
        isDragging ? "opacity-50 border-gray-300 dark:border-gray-600" :
        "border-gray-200 dark:border-gray-700"
      } ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {isImage ? (
        <button
          onClick={handleClick}
          className="w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="aspect-square bg-gray-100 dark:bg-gray-800">
            <img
              src={file.file_url!}
              alt={file.file_name || "Bilde"}
              className="w-full h-full object-cover"
            />
          </div>
        </button>
      ) : (
        <a
          href={file.file_url!}
          target="_blank"
          rel="noopener noreferrer"
        >
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
        </a>
      )}

      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
        {onTogglePin && (
          <button
            onClick={() => onTogglePin(file.id, !!file.is_pinned)}
            className="bg-white dark:bg-gray-800 rounded-full p-1.5 shadow-sm border border-gray-200 dark:border-gray-600"
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
        {onDelete && (
          <button
            onClick={onDelete}
            className="bg-white dark:bg-gray-800 rounded-full p-1.5 shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Slett fil"
          >
            <svg className="w-4 h-4 text-gray-400 hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

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
