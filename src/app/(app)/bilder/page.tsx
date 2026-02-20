"use client";

import { createClient } from "@/lib/supabase/client";
import { Message } from "@/lib/types";
import { useLightbox } from "@/components/ui/ImageLightbox";
import { useEffect, useState, useMemo } from "react";

function isImageType(fileType: string | null): boolean {
  return !!fileType && fileType.startsWith("image/");
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("no-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BilderPage() {
  const supabase = createClient();
  const [files, setFiles] = useState<(Message & { channel_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const { openLightbox } = useLightbox();

  useEffect(() => {
    async function fetchImages() {
      const { data } = await supabase
        .from("messages")
        .select("*, profiles(*)")
        .not("file_url", "is", null)
        .order("created_at", { ascending: false });

      if (data) {
        const images = data.filter((m: Message) => isImageType(m.file_type));

        // Fetch channel names for context
        const channelIds = Array.from(new Set(images.map((m: Message) => m.channel_id)));
        if (channelIds.length > 0) {
          const { data: channels } = await supabase
            .from("channels")
            .select("id, name, emoji")
            .in("id", channelIds);

          const channelMap = new Map(channels?.map((c: { id: string; name: string; emoji: string | null }) => [c.id, c]) ?? []);
          const enriched = images.map((m: Message) => {
            const ch = channelMap.get(m.channel_id) as { name: string; emoji: string | null } | undefined;
            return { ...m, channel_name: ch ? `${ch.emoji ? ch.emoji + " " : ""}${ch.name}` : undefined };
          });
          setFiles(enriched);
        } else {
          setFiles(images);
        }
      }
      setLoading(false);
    }

    fetchImages();
  }, [supabase]);

  const allImageUrls = useMemo(
    () => files.filter((f) => f.file_url).map((f) => f.file_url!),
    [files]
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>Laster bilder...</span>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="glass-solid px-4 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <h2 className="text-xl font-display font-medium" style={{ color: "var(--text-primary)" }}>
            Alle bilder
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Ingen bilder lastet opp ennå</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="glass-solid px-4 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-display font-medium" style={{ color: "var(--text-primary)" }}>
            Alle bilder
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--surface-glass)", color: "var(--text-muted)" }}>
            {files.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {files.map((file, idx) => (
            <button
              key={file.id}
              onClick={() => openLightbox(allImageUrls, idx)}
              className="group relative glass rounded-lg overflow-hidden hover:shadow-warm transition-all focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <div className="aspect-square" style={{ background: "var(--surface-glass)" }}>
                <img
                  src={file.file_url!}
                  alt={file.file_name || "Bilde"}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-2">
                <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                  {file.file_name || "Bilde"}
                </p>
                <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                  {file.channel_name && <span>{file.channel_name} &middot; </span>}
                  {file.profiles?.display_name} &middot; {formatDate(file.created_at)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
