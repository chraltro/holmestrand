"use client";

import { Message, Profile, POST_TAG_LABELS, POST_TAG_COLORS, PostTag } from "@/lib/types";
import { useLightbox } from "@/components/ui/ImageLightbox";
import { EmojiPicker } from "./EmojiPicker";
import { useState, useRef } from "react";

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return time;
  if (isYesterday) return `i går ${time}`;
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
    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
      {parts.map((part, i) => {
        if (!part) return null;
        if (part.startsWith("@")) {
          const name = part.slice(1);
          const found = profiles?.find((p) => p.display_name.toLowerCase() === name.toLowerCase());
          if (found) return <span key={i} className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded px-1 py-0.5 font-medium text-xs">{part}</span>;
          return part;
        }
        if (part.match(/^https?:\/\//)) {
          return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 underline break-all">{part}</a>;
        }
        return part;
      })}
    </p>
  );
}

function LinkPreview({ url }: { url: string }) {
  const ytId = getYouTubeId(url);
  if (ytId) {
    return (
      <div className="mt-2 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 max-w-sm">
        <iframe src={`https://www.youtube.com/embed/${ytId}`} className="w-full aspect-video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="YouTube" />
      </div>
    );
  }
  let domain = "";
  try { domain = new URL(url).hostname.replace("www.", ""); } catch { return null; }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2.5 max-w-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group">
      <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{domain}</p>
        <p className="text-sm text-indigo-500 group-hover:text-indigo-600 dark:text-indigo-400 truncate">{url}</p>
      </div>
    </a>
  );
}

function NonImageAttachment({ fileUrl, fileName, fileType }: { fileUrl: string; fileName: string | null; fileType: string | null }) {
  return (
    <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors max-w-xs">
      {isPdfType(fileType) ? (
        <svg className="w-8 h-8 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13h1c.55 0 1 .45 1 1s-.45 1-1 1h-1v1.5a.5.5 0 01-1 0V13a.5.5 0 01.5-.5h1zm4 0h.5c.83 0 1.5.67 1.5 1.5v1c0 .83-.67 1.5-1.5 1.5H12a.5.5 0 01-.5-.5v-3a.5.5 0 01.5-.5h.5zm.5 1v2h.5a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5H13z" /></svg>
      ) : (
        <svg className="w-8 h-8 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
      )}
      <span className="truncate text-gray-700 dark:text-gray-300">{fileName || "Fil"}</span>
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

  function handleDelete() { if (onDelete && confirm("Er du sikker på at du vil slette denne meldingen?")) onDelete(message.id); }
  function startEditing() { setEditContent(message.content); setEditing(true); setTimeout(() => editRef.current?.focus(), 50); }
  function saveEdit() { if (editContent.trim() && onEdit) { onEdit(message.id, editContent.trim()); setEditing(false); } }
  function cancelEdit() { setEditing(false); setEditContent(message.content); }

  return (
    <div className="flex gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt={profile.display_name} className="w-9 h-9 rounded-full flex-shrink-0 mt-0.5" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-gray-300 dark:bg-gray-700 flex-shrink-0 mt-0.5 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
          {(profile?.display_name || "?")[0].toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{profile?.display_name || "Ukjent bruker"}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">{formatTime(message.created_at)}</span>
          {message.edited_at && <span className="text-[10px] text-gray-400 italic">(redigert)</span>}

          <div className="opacity-0 group-hover:opacity-100 transition-all ml-auto flex items-center gap-0.5 relative">
            {onReaction && (
              <div className="relative">
                <button onClick={() => setShowEmoji(!showEmoji)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Reager">
                  <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
                {showEmoji && <EmojiPicker onSelect={(e) => onReaction(message.id, e)} onClose={() => setShowEmoji(false)} />}
              </div>
            )}
            {onReply && <button onClick={() => onReply(message)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Svar"><svg className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg></button>}
            {canEdit && onEdit && !message.file_url && <button onClick={startEditing} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Rediger"><svg className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>}
            {allFiles.length > 0 && onTogglePin && <button onClick={() => onTogglePin(message.id, !!message.is_pinned)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title={message.is_pinned ? "Fjern fra festet" : "Fest fil"}>{message.is_pinned ? <svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" /></svg> : <svg className="w-4 h-4 text-gray-400 hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" /></svg>}</button>}
            {canDelete && onDelete && <button onClick={handleDelete} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors" title="Slett melding"><svg className="w-4 h-4 text-gray-400 hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>}
          </div>
        </div>

        {message.reply_message && (
          <div className="flex items-center gap-2 mt-1 mb-1 pl-3 border-l-2 border-indigo-400/50 text-xs text-gray-500 dark:text-gray-400">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
            <span className="font-medium text-indigo-500">{message.reply_message.profiles?.display_name}</span>
            <span className="truncate">{message.reply_message.content}</span>
          </div>
        )}

        {message.tag && <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${POST_TAG_COLORS[message.tag as PostTag]}`}>{POST_TAG_LABELS[message.tag as PostTag]}</span>}

        {message.content && allFiles.length === 0 && (
          editing ? (
            <div className="mt-1">
              <textarea ref={editRef} value={editContent} onChange={(e) => setEditContent(e.target.value)}
                className="w-full border border-indigo-400 rounded-lg px-3 py-2 text-sm resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-h-32" rows={2}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key === "Escape") cancelEdit(); }} />
              <div className="flex gap-2 mt-1 text-xs">
                <button onClick={saveEdit} className="text-indigo-500 hover:text-indigo-600 font-medium">Lagre</button>
                <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">Avbryt</button>
                <span className="text-gray-400 ml-auto">Enter = lagre, Esc = avbryt</span>
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
              <button key={file.messageId + file.url} onClick={() => openLightbox(allImageUrls, idx)} className="block overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
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
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${r.user_reacted ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"}`}>
                <span>{r.emoji}</span><span className="font-medium">{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
