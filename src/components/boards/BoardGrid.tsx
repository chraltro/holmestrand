"use client";

import { createClient } from "@/lib/supabase/client";
import {
  Message,
  MessageComment,
  PostTag,
  POST_TAG_LABELS,
  POST_TAG_COLORS,
} from "@/lib/types";
import { useLightbox } from "@/components/ui/ImageLightbox";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";

const ALL_TAGS: PostTag[] = ["dagens", "inspo", "forslag", "vedtatt"];

export function BoardGrid({
  channelId,
  userId,
}: {
  channelId: string;
  userId: string | null;
}) {
  const supabase = createClient();
  const { openLightbox } = useLightbox();
  const [posts, setPosts] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<PostTag | "alle">("alle");
  const [showCreate, setShowCreate] = useState(false);
  const [detailPost, setDetailPost] = useState<Message | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      const { data } = await supabase
        .from("messages")
        .select("*, profiles(*)")
        .eq("channel_id", channelId)
        .not("tag", "is", null)
        .not("file_url", "is", null)
        .order("created_at", { ascending: false });

      if (data && userId) {
        const ids = data.map((p) => p.id);
        const [votesRes, userVotesRes] = await Promise.all([
          supabase.from("message_votes").select("message_id").in("message_id", ids.length > 0 ? ids : [""]),
          supabase.from("message_votes").select("message_id").eq("user_id", userId).in("message_id", ids.length > 0 ? ids : [""]),
        ]);

        const voteCounts: Record<string, number> = {};
        const userVotes = new Set<string>();
        votesRes.data?.forEach((v) => { voteCounts[v.message_id] = (voteCounts[v.message_id] || 0) + 1; });
        userVotesRes.data?.forEach((v) => userVotes.add(v.message_id));

        setPosts(data.map((p) => ({ ...p, vote_count: voteCounts[p.id] || 0, user_has_voted: userVotes.has(p.id) })));
      } else if (data) {
        setPosts(data);
      }
      setLoading(false);
    }
    fetchPosts();
  }, [channelId, supabase, userId]);

  const handleVote = useCallback(async (msgId: string, hasVoted: boolean) => {
    if (!userId) return;
    if (hasVoted) {
      await supabase.from("message_votes").delete().eq("message_id", msgId).eq("user_id", userId);
    } else {
      await supabase.from("message_votes").insert({ message_id: msgId, user_id: userId });
    }
    setPosts((prev) => prev.map((p) => p.id === msgId ? { ...p, vote_count: (p.vote_count || 0) + (hasVoted ? -1 : 1), user_has_voted: !hasVoted } : p));
  }, [supabase, userId]);

  const handlePostCreated = useCallback((newPost: Message) => {
    setPosts((prev) => [newPost, ...prev]);
    setShowCreate(false);
  }, []);

  const filtered = activeFilter === "alle" ? posts : posts.filter((p) => p.tag === activeFilter);
  const allImageUrls = useMemo(() => filtered.filter((p) => p.file_url).map((p) => p.file_url!), [filtered]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <span className="text-gray-400 text-sm">Laster tavle...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Filter + add */}
      <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800">
        <div className="flex gap-1.5 flex-1 overflow-x-auto">
          <button
            onClick={() => setActiveFilter("alle")}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              activeFilter === "alle"
                ? "gradient-primary text-white shadow-sm"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            Alle ({posts.length})
          </button>
          {ALL_TAGS.map((tag) => {
            const count = posts.filter((p) => p.tag === tag).length;
            return (
              <button
                key={tag}
                onClick={() => setActiveFilter(tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  activeFilter === tag ? POST_TAG_COLORS[tag] : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {POST_TAG_LABELS[tag].split(" ")[0]} ({count})
              </button>
            );
          })}
        </div>
        {userId && (
          <button
            onClick={() => setShowCreate(true)}
            className="gradient-primary text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-105 active:scale-95 transition-all flex items-center gap-1 flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Legg til
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm mb-1">Ingen innlegg ennå</p>
            <p className="text-gray-400/60 text-xs">Trykk &quot;Legg til&quot; for å dele inspirasjon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map((post, idx) => (
              <div
                key={post.id}
                className="animate-fade-in group bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
                style={{ animationDelay: `${Math.min(idx, 12) * 30}ms` }}
              >
                <button
                  onClick={() => {
                    const i = allImageUrls.indexOf(post.file_url!);
                    openLightbox(allImageUrls, i >= 0 ? i : 0);
                  }}
                  className="w-full focus:outline-none"
                >
                  <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative">
                    <img src={post.file_url!} alt={post.content} className="w-full h-full object-cover" />
                    <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${POST_TAG_COLORS[post.tag!]}`}>
                      {POST_TAG_LABELS[post.tag!]}
                    </span>
                  </div>
                </button>
                <div className="p-2.5">
                  {post.content && post.content !== post.file_name && (
                    <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 mb-1.5">{post.content}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {post.profiles?.avatar_url ? (
                        <img src={post.profiles.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-[9px] font-bold">
                          {(post.profiles?.display_name || "?")[0].toUpperCase()}
                        </div>
                      )}
                      <span className="text-[11px] text-gray-400 truncate">{post.profiles?.display_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => setDetailPost(post)}
                        className="text-gray-400 hover:text-indigo-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleVote(post.id, !!post.user_has_voted)}
                        className={`flex items-center gap-0.5 transition-all ${post.user_has_voted ? "text-indigo-500 scale-110" : "text-gray-400 hover:text-indigo-500"}`}
                      >
                        <svg className="w-4 h-4" fill={post.user_has_voted ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                        {(post.vote_count || 0) > 0 && <span className="text-[10px] font-medium">{post.vote_count}</span>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && userId && (
        <CreatePostModal channelId={channelId} userId={userId} onClose={() => setShowCreate(false)} onCreated={handlePostCreated} />
      )}
      {detailPost && userId && (
        <PostDetailModal post={detailPost} userId={userId} onClose={() => setDetailPost(null)} onVote={handleVote} />
      )}
    </div>
  );
}

// ─── Create Post Modal ─────────────────────────────────

function CreatePostModal({ channelId, userId, onClose, onCreated }: {
  channelId: string; userId: string; onClose: () => void; onCreated: (post: Message) => void;
}) {
  const supabase = createClient();
  const [caption, setCaption] = useState("");
  const [tag, setTag] = useState<PostTag>("inspo");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);

    const fileExt = file.name.split(".").pop();
    const filePath = `${channelId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("files").upload(filePath, file, { contentType: file.type });
    if (uploadError) { alert(`Kunne ikke laste opp: ${uploadError.message}`); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from("files").getPublicUrl(filePath);

    const { data, error } = await supabase.from("messages").insert({
      channel_id: channelId, user_id: userId, content: caption.trim() || file.name,
      file_url: publicUrl, file_name: file.name, file_type: file.type, tag,
    }).select("*, profiles(*)").single();

    if (error) { alert(`Feil: ${error.message}`); setUploading(false); return; }
    if (data) onCreated({ ...data, vote_count: 0, user_has_voted: false });
    setUploading(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700/50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Nytt innlegg</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <input type="file" ref={fileRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
          {preview ? (
            <button type="button" onClick={() => fileRef.current?.click()} className="w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:opacity-90 transition-opacity">
              <img src={preview} alt="Forhåndsvisning" className="w-full max-h-64 object-cover" />
            </button>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} className="w-full aspect-video bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-2 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all focus:outline-none">
              <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-gray-500">Velg bilde</span>
            </button>
          )}
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Bildetekst (valgfritt)..." rows={2}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-base sm:text-sm resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kategori</label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_TAGS.map((t) => (
                <button key={t} type="button" onClick={() => setTag(t)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border-2 ${tag === t ? `${POST_TAG_COLORS[t]} border-current shadow-sm` : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                >{POST_TAG_LABELS[t]}</button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={!file || uploading}
            className="w-full gradient-primary text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100">
            {uploading ? "Laster opp..." : "Publiser"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Post Detail Modal ─────────────────────────────────

function PostDetailModal({ post, userId, onClose, onVote }: {
  post: Message; userId: string; onClose: () => void; onVote: (id: string, voted: boolean) => void;
}) {
  const supabase = createClient();
  const { openLightbox } = useLightbox();
  const [comments, setComments] = useState<MessageComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from("message_comments").select("*, profiles(*)").eq("message_id", post.id).order("created_at", { ascending: true });
      if (data) setComments(data);
      setLoadingComments(false);
    }
    fetch();
  }, [post.id, supabase]);

  useEffect(() => { if (!loadingComments) endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [comments.length, loadingComments]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = newComment.trim();
    if (!text) return;
    setSending(true);
    const { data, error } = await supabase.from("message_comments").insert({ message_id: post.id, user_id: userId, content: text }).select("*, profiles(*)").single();
    if (error) alert(`Feil: ${error.message}`);
    else if (data) setComments((prev) => [...prev, data]);
    setNewComment(""); setSending(false);
  }

  function formatTime(d: string) {
    const date = new Date(d);
    const now = new Date();
    const time = date.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" });
    if (date.toDateString() === now.toDateString()) return time;
    return `${date.toLocaleDateString("no-NO", { day: "numeric", month: "short" })} ${time}`;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => openLightbox([post.file_url!])} className="w-full focus:outline-none flex-shrink-0">
          <img src={post.file_url!} alt={post.content} className="w-full max-h-72 object-cover" />
        </button>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700/50 flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${POST_TAG_COLORS[post.tag!]}`}>{POST_TAG_LABELS[post.tag!]}</span>
            <span className="text-xs text-gray-400">{formatTime(post.created_at)}</span>
          </div>
          {post.content && post.content !== post.file_name && (
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{post.content}</p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} alt="" className="w-6 h-6 rounded-full" /> : (
                <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-xs font-bold">{(post.profiles?.display_name || "?")[0].toUpperCase()}</div>
              )}
              <span className="text-sm text-gray-600 dark:text-gray-400">{post.profiles?.display_name}</span>
            </div>
            <button onClick={() => onVote(post.id, !!post.user_has_voted)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-all ${post.user_has_voted ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
              <svg className="w-4 h-4" fill={post.user_has_voted ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
              {post.vote_count || 0}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {loadingComments ? (
            <div className="text-center text-gray-400 text-sm py-4">Laster kommentarer...</div>
          ) : comments.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-4">Ingen kommentarer ennå</div>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2 animate-fade-in">
                  {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} alt="" className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5" /> : (
                    <div className="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-700 flex-shrink-0 mt-0.5 flex items-center justify-center text-xs font-bold">{(c.profiles?.display_name || "?")[0].toUpperCase()}</div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.profiles?.display_name}</span>
                      <span className="text-xs text-gray-400">{formatTime(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{c.content}</p>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
          )}
        </div>
        <form onSubmit={handleSend} className="p-3 border-t border-gray-200 dark:border-gray-700/50 flex gap-2 flex-shrink-0">
          <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Skriv en kommentar..." disabled={sending}
            className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-base sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" />
          <button type="submit" disabled={!newComment.trim() || sending}
            className="gradient-primary text-white rounded-xl px-3 py-2 text-sm font-medium hover:shadow-md hover:shadow-indigo-500/25 transition-all disabled:opacity-50">Send</button>
        </form>
      </div>
    </div>
  );
}
