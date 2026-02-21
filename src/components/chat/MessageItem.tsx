"use client";

import { Message, Profile, POST_TAG_LABELS, POST_TAG_COLORS, PostTag } from "@/lib/types";
import { useLightbox } from "@/components/ui/ImageLightbox";
import { EmojiPicker } from "./EmojiPicker";
import { useState, useRef, useEffect } from "react";

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return time;
  if (isYesterday) return `i gar ${time}`;
  return `${date.toLocaleDateString("no-NO", { day: "numeric", month: "short" })} ${time}`;
}

function isImageType(ft: string | null) { return !!ft && ft.startsWith("image/"); }
function isPdfType(ft: string | null) { return ft === "application/pdf"; }

function extractUrls(text: string): string[] {
  return text.match(/https?:\/\/[^\s<>)"']+/g) || [];
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function RichContent({ content, profiles }: { content: string; profiles?: Profile[] }) {
  const parts = content.split(/((?:@\S+)|(?:https?:\/\/[^\s<>)"']+))/g);
  return (
    <p className="text-sm whitespace-pre-wrap break-words" style={{ color: "var(--text-secondary)" }}>
      {parts.map((part, i) => {
        if (!part) return null;
        if (part.startsWith("@")) {
          const name = part.slice(1);
          const found = profiles?.find((p) => p.display_name.toLowerCase() === name.toLowerCase());
          if (found) return <span key={i} className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded px-1 py-0.5 font-medium text-xs">{part}</span>;
          return part;
        }
        if (part.match(/^https?:\/\//)) {
          return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 underline break-all">{part}</a>;
        }
        return part;
      })}
    </p>
  );
}

// Client-side unfurl cache to avoid re-fetching on re-renders
const unfurlCache = new Map<string, { title: string | null; description: string | null; image: string | null; siteName: string | null; favicon: string | null } | null>();

function LinkPreview({ url }: { url: string }) {
  const ytId = getYouTubeId(url);
  let domain = "";
  try { domain = new URL(url).hostname.replace("www.", ""); } catch { /* noop */ }

  const [meta, setMeta] = useState<{ title: string | null; description: string | null; image: string | null; siteName: string | null; favicon: string | null } | null>(
    unfurlCache.get(url) ?? null
  );
  const [fetched, setFetched] = useState(unfurlCache.has(url));

  const shouldFetch = !ytId && !!domain;

  useEffect(() => {
    if (!shouldFetch || fetched) return;
    let cancelled = false;
    async function unfurl() {
      try {
        const res = await fetch(`/api/unfurl?url=${encodeURIComponent(url)}`);
        if (!res.ok) { setFetched(true); return; }
        const data = await res.json();
        if (!cancelled) {
          unfurlCache.set(url, data);
          setMeta(data);
        }
      } catch { /* ignore */ }
      if (!cancelled) setFetched(true);
    }
    unfurl();
    return () => { cancelled = true; };
  }, [url, fetched, shouldFetch]);

  if (ytId) {
    return (
      <div className="mt-2 rounded-xl overflow-hidden max-w-sm" style={{ border: "1px solid var(--border-subtle)" }}>
        <iframe src={`https://www.youtube.com/embed/${ytId}`} className="w-full aspect-video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="YouTube" />
      </div>
    );
  }

  if (!domain) return null;

  const hasRichPreview = meta && (meta.title || meta.image);

  if (hasRichPreview) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 block glass rounded-xl overflow-hidden max-w-sm hover:bg-[var(--surface-glass-hover)] transition-colors group"
        style={{ border: "1px solid var(--border-subtle)" }}
      >
        {meta.image && (
          <div className="w-full h-40 overflow-hidden" style={{ background: "var(--surface-glass)" }}>
            <img
              src={meta.image}
              alt={meta.title || ""}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        )}
        <div className="p-3">
          <div className="flex items-center gap-1.5 mb-1">
            {meta.favicon && (
              <img
                src={meta.favicon}
                alt=""
                className="w-4 h-4 rounded-sm flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <span className="text-[11px] font-medium truncate" style={{ color: "var(--text-muted)" }}>
              {meta.siteName || domain}
            </span>
          </div>
          {meta.title && (
            <p className="text-sm font-medium line-clamp-2" style={{ color: "var(--text-primary)" }}>
              {meta.title}
            </p>
          )}
          {meta.description && (
            <p className="text-xs line-clamp-2 mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {meta.description}
            </p>
          )}
        </div>
      </a>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-3 glass rounded-xl px-3 py-2.5 max-w-sm hover:bg-[var(--surface-glass-hover)] transition-colors group">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--surface-glass)" }}>
        {meta?.favicon ? (
          <img src={meta.favicon} alt="" className="w-4 h-4 rounded-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <svg className="w-4 h-4" style={{ color: "var(--text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{meta?.siteName || domain}</p>
        <p className="text-sm text-amber-600 dark:text-amber-400 truncate">{meta?.title || url}</p>
      </div>
    </a>
  );
}

function NonImageAttachment({ fileUrl, fileName, fileType }: { fileUrl: string; fileName: string | null; fileType: string | null }) {
  return (
    <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 glass rounded-lg px-3 py-2 text-sm hover:bg-[var(--surface-glass-hover)] transition-colors max-w-xs">
      {isPdfType(fileType) ? (
        <svg className="w-8 h-8 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13h1c.55 0 1 .45 1 1s-.45 1-1 1h-1v1.5a.5.5 0 01-1 0V13a.5.5 0 01.5-.5h1zm4 0h.5c.83 0 1.5.67 1.5 1.5v1c0 .83-.67 1.5-1.5 1.5H12a.5.5 0 01-.5-.5v-3a.5.5 0 01.5-.5h.5zm.5 1v2h.5a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5H13z" /></svg>
      ) : (
        <svg className="w-8 h-8 flex-shrink-0" style={{ color: "var(--text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
      )}
      <span className="truncate" style={{ color: "var(--text-secondary)" }}>{fileName || "Fil"}</span>
    </a>
  );
}

interface FileInfo { url: string; name: string | null; type: string | null; messageId: string; isPinned?: boolean; }

export function MessageItem({
  message, groupedFiles, onTogglePin, onDelete, onEdit, onReply, onReaction, currentUserId, isAdmin, allProfiles,
}: {
  message: Message; groupedFiles?: FileInfo[];
  onTogglePin?: (id: string, pinned: boolean) => void; onDelete?: (id: string) => void;
  onEdit?: (id: string, content: string) => void; onReply?: (msg: Message) => void;
  onReaction?: (id: string, emoji: string) => void;
  currentUserId?: string | null; isAdmin?: boolean; allProfiles?: Profile[];
}) {
  const { openLightbox } = useLightbox();
  const profile = message.profiles;
  const canDelete = isAdmin || (currentUserId && message.user_id === currentUserId);
  const canEdit = currentUserId && message.user_id === currentUserId;

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showEmoji, setShowEmoji] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);

  const allFiles: FileInfo[] = [];
  if (message.file_url) allFiles.push({ url: message.file_url, name: message.file_name, type: message.file_type, messageId: message.id, isPinned: message.is_pinned });
  if (groupedFiles) allFiles.push(...groupedFiles);
  const imageFiles = allFiles.filter((f) => isImageType(f.type));
  const nonImageFiles = allFiles.filter((f) => !isImageType(f.type));
  const allImageUrls = imageFiles.map((f) => f.url);
  const urls = allFiles.length === 0 ? extractUrls(message.content) : [];

  function handleDelete() { if (onDelete && confirm("Er du sikker pa at du vil slette denne meldingen?")) onDelete(message.id); }
  function startEditing() { setEditContent(message.content); setEditing(true); setTimeout(() => editRef.current?.focus(), 50); }
  function saveEdit() { if (editContent.trim() && onEdit) { onEdit(message.id, editContent.trim()); setEditing(false); } }
  function cancelEdit() { setEditing(false); setEditContent(message.content); }

  return (
    <div className="flex gap-3 px-4 py-2 hover:bg-[var(--surface-glass)] group transition-colors">
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt={profile.display_name} className="w-9 h-9 rounded-full flex-shrink-0 mt-0.5 avatar-ring" />
      ) : (
        <div className="w-9 h-9 rounded-full avatar-gradient flex-shrink-0 mt-0.5 flex items-center justify-center text-sm font-medium text-white">
          {(profile?.display_name || "?")[0].toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{profile?.display_name || "Ukjent bruker"}</span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{formatTime(message.created_at)}</span>
          {message.edited_at && <span className="text-[10px] italic" style={{ color: "var(--text-muted)" }}>(redigert)</span>}

          <div className="opacity-0 group-hover:opacity-100 transition-all ml-auto flex items-center gap-0.5 relative">
            {onReaction && (
              <div className="relative">
                <button onClick={() => setShowEmoji(!showEmoji)} className="p-1 rounded hover:bg-[var(--surface-glass-hover)] transition-colors" title="Reager">
                  <svg className="w-4 h-4" style={{ color: "var(--text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
                {showEmoji && <EmojiPicker onSelect={(e) => onReaction(message.id, e)} onClose={() => setShowEmoji(false)} />}
              </div>
            )}
            {onReply && <button onClick={() => onReply(message)} className="p-1 rounded hover:bg-[var(--surface-glass-hover)] transition-colors" title="Svar"><svg className="w-4 h-4" style={{ color: "var(--text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg></button>}
            {canEdit && onEdit && !message.file_url && <button onClick={startEditing} className="p-1 rounded hover:bg-[var(--surface-glass-hover)] transition-colors" title="Rediger"><svg className="w-4 h-4" style={{ color: "var(--text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>}
            {allFiles.length > 0 && onTogglePin && <button onClick={() => onTogglePin(message.id, !!message.is_pinned)} className="p-1 rounded hover:bg-[var(--surface-glass-hover)] transition-colors" title={message.is_pinned ? "Fjern fra festet" : "Fest fil"}>{message.is_pinned ? <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" /></svg> : <svg className="w-4 h-4" style={{ color: "var(--text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" /></svg>}</button>}
            {canDelete && onDelete && <button onClick={handleDelete} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors" title="Slett melding"><svg className="w-4 h-4 text-red-400 hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>}
          </div>
        </div>

        {message.reply_message && (
          <div className="flex items-center gap-2 mt-1 mb-1 pl-3 text-xs" style={{ borderLeft: "2px solid var(--accent-amber)", color: "var(--text-muted)" }}>
            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
            <span className="font-medium text-amber-600 dark:text-amber-400">{message.reply_message.profiles?.display_name}</span>
            <span className="truncate">{message.reply_message.content}</span>
          </div>
        )}

        {message.tag && <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${POST_TAG_COLORS[message.tag as PostTag]}`}>{POST_TAG_LABELS[message.tag as PostTag]}</span>}

        {message.content && allFiles.length === 0 && (
          editing ? (
            <div className="mt-1">
              <textarea ref={editRef} value={editContent} onChange={(e) => setEditContent(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm resize-none max-h-32 focus:outline-none focus:ring-2 focus:ring-amber-500"
                style={{ border: "1px solid var(--border-active)", background: "var(--surface-glass)", color: "var(--text-primary)" }}
                rows={2}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key === "Escape") cancelEdit(); }} />
              <div className="flex gap-2 mt-1 text-xs">
                <button onClick={saveEdit} className="text-amber-600 dark:text-amber-400 font-medium">Lagre</button>
                <button onClick={cancelEdit} style={{ color: "var(--text-muted)" }}>Avbryt</button>
                <span className="ml-auto" style={{ color: "var(--text-muted)" }}>Enter = lagre, Esc = avbryt</span>
              </div>
            </div>
          ) : (
            <RichContent content={message.content} profiles={allProfiles} />
          )
        )}

        {urls.slice(0, 2).map((url) => <LinkPreview key={url} url={url} />)}

        {imageFiles.length > 0 && (
          <div className={`mt-2 gap-2 ${imageFiles.length === 1 ? "flex" : "grid grid-cols-2 sm:grid-cols-3 max-w-md"}`}>
            {imageFiles.map((file, idx) => (
              <button key={file.messageId + file.url} onClick={() => openLightbox(allImageUrls, idx)} className="block overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" style={{ border: "1px solid var(--border-subtle)" }}>
                <img src={file.url} alt={file.name || "Bilde"} className={`object-cover ${imageFiles.length === 1 ? "max-w-xs max-h-64" : "w-full aspect-square"}`} />
              </button>
            ))}
          </div>
        )}

        {nonImageFiles.map((file) => <NonImageAttachment key={file.messageId + file.url} fileUrl={file.url} fileName={file.name} fileType={file.type} />)}

        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {message.reactions.map((r) => (
              <button key={r.emoji} onClick={() => onReaction?.(message.id, r.emoji)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${r.user_reacted ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300" : "hover:bg-[var(--surface-glass-hover)]"}`}
                style={{ border: `1px solid ${r.user_reacted ? "" : "var(--border-subtle)"}`, color: r.user_reacted ? "" : "var(--text-secondary)" }}>
                <span>{r.emoji}</span><span className="font-medium">{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
