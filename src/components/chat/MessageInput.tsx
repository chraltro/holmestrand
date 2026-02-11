"use client";

import { createClient } from "@/lib/supabase/client";
import { Message, Profile, PostTag, POST_TAG_LABELS, POST_TAG_COLORS } from "@/lib/types";
import { useState, useRef, useEffect, useMemo } from "react";

interface MessageInputProps {
  channelId: string;
  userId: string;
  showTagSelector?: boolean;
  replyTo?: Message | null;
  onCancelReply?: () => void;
  profiles?: Profile[];
}

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALL_TAGS: PostTag[] = ["dagens", "inspo", "forslag", "vedtatt"];

function isImageFile(file: File) { return file.type.startsWith("image/"); }

export function MessageInput({ channelId, userId, showTagSelector = false, replyTo, onCancelReply, profiles = [] }: MessageInputProps) {
  const supabase = createClient();
  const [content, setContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [selectedTag, setSelectedTag] = useState<PostTag | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showingTagPicker, setShowingTagPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIdx, setMentionIdx] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (replyTo) textareaRef.current?.focus(); }, [replyTo]);

  const mentionResults = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return profiles.filter((p) => p.display_name.toLowerCase().includes(q)).slice(0, 5);
  }, [mentionQuery, profiles]);

  function handleContentChange(val: string) {
    setContent(val);
    const cursorPos = textareaRef.current?.selectionStart ?? val.length;
    const textBefore = val.slice(0, cursorPos);
    const match = textBefore.match(/@(\S*)$/);
    if (match) { setMentionQuery(match[1]); setMentionIdx(0); } else { setMentionQuery(null); }
  }

  function insertMention(name: string) {
    const cursorPos = textareaRef.current?.selectionStart ?? content.length;
    const textBefore = content.slice(0, cursorPos);
    const textAfter = content.slice(cursorPos);
    const match = textBefore.match(/@(\S*)$/);
    if (match) setContent(textBefore.slice(0, match.index) + `@${name} ` + textAfter);
    setMentionQuery(null);
    textareaRef.current?.focus();
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;
    setContent(""); setMentionQuery(null);
    const insertData: Record<string, unknown> = { channel_id: channelId, user_id: userId, content: text };
    if (replyTo) { insertData.reply_to = replyTo.id; onCancelReply?.(); }
    await supabase.from("messages").insert(insertData);
  }

  async function uploadFile(file: File, tag: PostTag | null): Promise<boolean> {
    if (file.size > MAX_FILE_SIZE) { alert(`Filen "${file.name}" er for stor. Maks 25 MB.`); return false; }
    const fileExt = file.name.split(".").pop();
    const filePath = `${channelId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage.from("files").upload(filePath, file, { contentType: file.type });
    if (error) { alert(`Kunne ikke laste opp "${file.name}": ${error.message}`); return false; }
    const { data: { publicUrl } } = supabase.storage.from("files").getPublicUrl(filePath);
    const insertData: Record<string, unknown> = { channel_id: channelId, user_id: userId, content: file.name, file_url: publicUrl, file_name: file.name, file_type: file.type };
    if (tag && isImageFile(file)) insertData.tag = tag;
    if (replyTo) { insertData.reply_to = replyTo.id; onCancelReply?.(); }
    await supabase.from("messages").insert(insertData);
    return true;
  }

  async function uploadFiles(files: File[], tag: PostTag | null) {
    if (files.length === 0) return;
    setUploading(true); let uploaded = 0;
    for (const file of files) {
      setUploadProgress(files.length > 1 ? `Laster opp ${uploaded + 1} av ${files.length}...` : `Laster opp ${file.name}...`);
      if (await uploadFile(file, tag)) uploaded++;
    }
    setContent(""); setUploading(false); setUploadProgress("");
    setSelectedTag(null); setShowingTagPicker(false); setPendingFiles([]);
  }

  function handleFilesSelected(files: File[]) {
    if (files.length === 0) return;
    if (files.some(isImageFile) && showTagSelector) { setPendingFiles(files); setShowingTagPicker(true); }
    else uploadFiles(files, null);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) handleFilesSelected(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) handleFilesSelected(files);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (mentionQuery !== null && mentionResults.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIdx((i) => Math.min(i + 1, mentionResults.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(mentionResults[mentionIdx].display_name); return; }
      if (e.key === "Escape") { setMentionQuery(null); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e); }
  }

  return (
    <div className={`glass-solid p-4 ${dragOver ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}`}
      style={{ borderTop: "1px solid var(--border-subtle)" }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}>
      {dragOver && <div className="text-center text-sm text-amber-600 dark:text-amber-400 mb-2 font-medium">Slipp filene her for a laste opp</div>}
      {uploadProgress && <div className="text-center text-xs mb-2 flex items-center justify-center gap-2" style={{ color: "var(--text-muted)" }}><div className="w-3 h-3 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />{uploadProgress}</div>}

      {replyTo && (
        <div className="mb-2 flex items-center gap-2 pl-3 rounded-r-lg py-1.5 pr-2 animate-fade-in" style={{ borderLeft: "2px solid var(--accent-amber)", background: "var(--surface-glass)" }}>
          <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{replyTo.profiles?.display_name}</span>
          <span className="text-xs truncate flex-1" style={{ color: "var(--text-muted)" }}>{replyTo.content}</span>
          <button onClick={onCancelReply} className="p-0.5" style={{ color: "var(--text-muted)" }}><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
      )}

      {showingTagPicker && (
        <div className="mb-3 p-3 glass rounded-xl animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Legg til kategori for tavlen? (valgfritt)</span>
            <button onClick={() => uploadFiles(pendingFiles, null)} className="text-xs" style={{ color: "var(--text-muted)" }}>Hopp over</button>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {ALL_TAGS.map((tag) => (
              <button key={tag} type="button" onClick={() => { setSelectedTag(tag); uploadFiles(pendingFiles, tag); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedTag === tag ? `${POST_TAG_COLORS[tag]} shadow-sm scale-105` : "hover:bg-[var(--surface-glass-hover)]"}`}
                style={selectedTag !== tag ? { color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" } : undefined}>{POST_TAG_LABELS[tag]}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Merket bilder vises ogsa pa kanalens Tavle-fane
          </div>
        </div>
      )}

      <form onSubmit={sendMessage} className="flex items-center gap-2">
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple />
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
          className="flex-shrink-0 transition-all p-2 rounded-lg hover:bg-[var(--surface-glass-hover)]"
          style={{ color: "var(--text-muted)" }}
          title="Last opp filer">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
        </button>
        <div className="flex-1 relative">
          <textarea ref={textareaRef} value={content} onChange={(e) => handleContentChange(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={uploading ? uploadProgress : "Skriv en melding..."} disabled={uploading} rows={1}
            className="w-full rounded-xl px-3 py-2 text-base sm:text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 max-h-32 transition-shadow"
            style={{ border: "1px solid var(--border-subtle)", background: "var(--surface-glass)", color: "var(--text-primary)", minHeight: "38px" }} />
          {mentionQuery !== null && mentionResults.length > 0 && (
            <div className="absolute bottom-full left-0 mb-1 w-64 glass rounded-xl shadow-warm overflow-hidden z-10 animate-fade-in">
              {mentionResults.map((p, i) => (
                <button key={p.id} type="button" onClick={() => insertMention(p.display_name)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${i === mentionIdx ? "bg-amber-50 dark:bg-amber-900/20" : "hover:bg-[var(--surface-glass-hover)]"}`}>
                  {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-6 h-6 rounded-full" /> : <div className="w-6 h-6 rounded-full avatar-gradient flex items-center justify-center text-[10px] font-bold text-white">{p.display_name[0].toUpperCase()}</div>}
                  <span className="font-medium" style={{ color: "var(--text-primary)" }}>{p.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="submit" disabled={!content.trim() || uploading}
          className="flex-shrink-0 gradient-primary text-white rounded-xl p-2 hover:shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
          style={{ boxShadow: content.trim() ? "0 4px 12px rgba(245,158,11,0.25)" : "none" }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
        </button>
      </form>
    </div>
  );
}
