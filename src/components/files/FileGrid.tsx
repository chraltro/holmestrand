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

export function FileGrid({ channelId }: { channelId: string }) {
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

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {files.map((file) => (
          <a
            key={file.id}
            href={file.file_url!}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
          >
            {isImageType(file.file_type) ? (
              <div className="aspect-square bg-gray-100">
                <img
                  src={file.file_url!}
                  alt={file.file_name || "Bilde"}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-square bg-gray-50 flex items-center justify-center">
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
                    className="w-16 h-16 text-gray-300"
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
            <div className="p-2">
              <p className="text-xs font-medium text-gray-700 truncate">
                {file.file_name || "Fil"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {file.profiles?.display_name} &middot;{" "}
                {formatDate(file.created_at)}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
