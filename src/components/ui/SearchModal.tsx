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
      <mark key={i} className="bg-indigo-200 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200 rounded px-0.5">{part}</mark>
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
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up border border-gray-200 dark:border-gray-700/50" onClick={(e) => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700/50">
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Søk i meldinger..."
            className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none text-base"
          />
          <kbd className="hidden sm:inline-flex text-[10px] font-mono text-gray-400 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
            </div>
          )}

          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              Ingen resultater for &quot;{query}&quot;
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="py-2">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => navigateTo(result)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-indigo-500">#{result.channel_name}</span>
                    <span className="text-xs text-gray-400">{formatDate(result.created_at)}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    {result.profiles?.avatar_url ? (
                      <img src={result.profiles.avatar_url} alt="" className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-700 flex-shrink-0 mt-0.5 flex items-center justify-center text-[10px] font-bold">
                        {(result.profiles?.display_name || "?")[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{result.profiles?.display_name}</span>
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                        {highlightMatch(result.content, query)}
                      </p>
                      {result.file_name && (
                        <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
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
            <div className="text-center py-8 text-gray-400 text-sm">
              Skriv minst 2 tegn for å søke
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
