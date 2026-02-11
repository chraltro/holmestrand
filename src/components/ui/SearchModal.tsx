"use client";

import { createClient } from "@/lib/supabase/client";
import { Message } from "@/lib/types";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("no-NO", { day: "numeric", month: "short", year: "numeric" });
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 rounded px-0.5">{part}</mark>
    ) : part
  );
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const supabase = createClient();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<(Message & { channel_slug?: string; channel_name?: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Keyboard escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);

    const { data } = await supabase
      .from("messages")
      .select("*, profiles(*), channels!inner(slug, name)")
      .ilike("content", `%${q}%`)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      type JoinRow = Message & { channels?: { slug: string; name: string } };
      setResults((data as JoinRow[]).map((m) => ({
        ...m,
        channel_slug: m.channels?.slug,
        channel_name: m.channels?.name,
      })));
    }
    setLoading(false);
  }, [supabase]);

  function handleChange(val: string) {
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  }

  function navigateTo(result: Message & { channel_slug?: string }) {
    if (result.channel_slug) {
      router.push(`/channel/${result.channel_slug}`);
    }
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4" onClick={onClose}>
      <div className="glass-solid rounded-2xl shadow-warm w-full max-w-lg animate-slide-up" style={{ borderColor: "var(--border-subtle)" }} onClick={(e) => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center gap-3 p-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <svg className="w-5 h-5 flex-shrink-0" style={{ color: "var(--text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Sok i meldinger..."
            className="flex-1 bg-transparent focus:outline-none text-base"
            style={{ color: "var(--text-primary)" }}
          />
          <kbd className="hidden sm:inline-flex text-[10px] font-mono rounded px-1.5 py-0.5" style={{ color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }}>ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
            </div>
          )}

          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>
              Ingen resultater for &quot;{query}&quot;
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="py-2">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => navigateTo(result)}
                  className="w-full text-left px-4 py-3 transition-colors hover:bg-[var(--surface-glass-hover)]"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-amber-500">#{result.channel_name}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{formatDate(result.created_at)}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    {result.profiles?.avatar_url ? (
                      <img src={result.profiles.avatar_url} alt="" className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5 avatar-ring" />
                    ) : (
                      <div className="w-6 h-6 rounded-full avatar-gradient flex-shrink-0 mt-0.5 flex items-center justify-center text-[10px] font-bold text-white">
                        {(result.profiles?.display_name || "?")[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{result.profiles?.display_name}</span>
                      <p className="text-sm line-clamp-2" style={{ color: "var(--text-primary)" }}>
                        {highlightMatch(result.content, query)}
                      </p>
                      {result.file_name && (
                        <span className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "var(--text-muted)" }}>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                          {result.file_name}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && query.trim().length < 2 && (
            <div className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>
              Skriv minst 2 tegn for a soke
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
