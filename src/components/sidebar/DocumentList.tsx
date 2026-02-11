"use client";

import { createClient } from "@/lib/supabase/client";
import { Document } from "@/lib/types";
import { useEffect, useState } from "react";

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
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Dokumenter
        </span>
      </div>
      {documents.map((doc) => (
        <a
          key={doc.id}
          href={doc.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 mx-2 px-3 py-1.5 rounded-md text-sm transition-colors hover:bg-[var(--surface-glass-hover)]"
          style={{ color: "var(--text-muted)" }}
        >
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <span className="truncate">{doc.name}</span>
        </a>
      ))}
    </div>
  );
}
