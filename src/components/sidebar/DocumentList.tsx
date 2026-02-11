"use client";

import { createClient } from "@/lib/supabase/client";
import { Document } from "@/lib/types";
import { useEffect, useState } from "react";

function getDocEmoji(name: string, fileType: string | null): string {
  const lower = name.toLowerCase();
  if (lower.includes("plantegning") || lower.includes("tegning")) return "📐";
  if (lower.includes("tilstand")) return "🔍";
  if (lower.includes("budsjett") || lower.includes("kostnad")) return "💰";
  if (lower.includes("kontrakt") || lower.includes("avtale")) return "📝";
  if (fileType === "application/pdf") return "📄";
  return "📄";
}

export function DocumentList() {
  const supabase = createClient();
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    async function fetchDocuments() {
      const { data } = await supabase
        .from("documents")
        .select("*")
        .order("sort_order", { ascending: true });

      if (data) setDocuments(data);
    }

    fetchDocuments();
  }, [supabase]);

  if (documents.length === 0) return null;

  return (
    <div className="py-3">
      <div className="px-3 mb-2">
        <span className="text-[10px] font-medium uppercase" style={{ letterSpacing: "2.5px", color: "var(--text-muted)" }}>
          Dokumenter
        </span>
      </div>
      {documents.map((doc) => (
        <a
          key={doc.id}
          href={doc.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 mx-2 px-3.5 py-2.5 rounded-[10px] text-sm transition-colors hover:bg-[var(--surface-glass-hover)]"
          style={{ color: "var(--text-secondary)" }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{ background: "rgba(232, 168, 124, 0.1)", border: "1px solid rgba(232, 168, 124, 0.15)" }}>
            {getDocEmoji(doc.name, doc.file_type)}
          </div>
          <span className="truncate">{doc.name}</span>
        </a>
      ))}
    </div>
  );
}
