"use client";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Board,
  BoardPost,
  BoardComment,
  PostTag,
  POST_TAG_LABELS,
  POST_TAG_COLORS,
} from "@/lib/types";
import { useLightbox } from "@/components/ui/ImageLightbox";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";

const ALL_TAGS: PostTag[] = ["dagens", "inspo", "forslag", "vedtatt"];

export default function BoardPage() {
  const params = useParams();
  const slug = params.slug as string;
  const supabase = createClient();
  const { user } = useAuth();
  const { openLightbox } = useLightbox();

  const [board, setBoard] = useState<Board | null>(null);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<PostTag | "alle">("alle");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailPost, setDetailPost] = useState<BoardPost | null>(null);

  // Fetch board and posts
  useEffect(() => {
    async function fetchBoard() {
      const { data: boardData } = await supabase
        .from("boards")
        .select("*")
        .eq("slug", slug)
        .single();

      if (!boardData) {
        setLoading(false);
        return;
      }

      setBoard(boardData);

      const { data: postsData } = await supabase
        .from("board_posts")
        .select("*, profiles(*)")
        .eq("board_id", boardData.id)
        .order("created_at", { ascending: false });

      if (postsData && user) {
        // Fetch vote counts and user votes
        const postIds = postsData.map((p) => p.id);

        const [votesRes, userVotesRes, commentsRes] = await Promise.all([
          supabase
            .from("board_votes")
            .select("post_id")
            .in("post_id", postIds.length > 0 ? postIds : [""]),
          supabase
            .from("board_votes")
            .select("post_id")
            .eq("user_id", user.id)
            .in("post_id", postIds.length > 0 ? postIds : [""]),
          supabase
            .from("board_comments")
            .select("post_id")
            .in("post_id", postIds.length > 0 ? postIds : [""]),
        ]);

        const voteCounts: Record<string, number> = {};
        const userVotes = new Set<string>();
        const commentCounts: Record<string, number> = {};

        votesRes.data?.forEach((v) => {
          voteCounts[v.post_id] = (voteCounts[v.post_id] || 0) + 1;
        });
        userVotesRes.data?.forEach((v) => userVotes.add(v.post_id));
        commentsRes.data?.forEach((c) => {
          commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1;
        });

        const enriched = postsData.map((p) => ({
          ...p,
          vote_count: voteCounts[p.id] || 0,
          user_has_voted: userVotes.has(p.id),
          comment_count: commentCounts[p.id] || 0,
        }));

        setPosts(enriched);
      }

      setLoading(false);
    }

    fetchBoard();
  }, [slug, supabase, user]);

  const handleVote = useCallback(
    async (postId: string, hasVoted: boolean) => {
      if (!user) return;

      if (hasVoted) {
        await supabase
          .from("board_votes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("board_votes")
          .insert({ post_id: postId, user_id: user.id });
      }

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                vote_count: (p.vote_count || 0) + (hasVoted ? -1 : 1),
                user_has_voted: !hasVoted,
              }
            : p
        )
      );
    },
    [supabase, user]
  );

  const handlePostCreated = useCallback((newPost: BoardPost) => {
    setPosts((prev) => [newPost, ...prev]);
    setShowCreateModal(false);
  }, []);

  const filtered =
    activeFilter === "alle"
      ? posts
      : posts.filter((p) => p.tag === activeFilter);

  const allImageUrls = filtered
    .filter((p) => p.image_url)
    .map((p) => p.image_url);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Laster tavle...</div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          Tavlen ble ikke funnet
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {board.name}
          </h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1.5"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Legg til
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveFilter("alle")}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeFilter === "alle"
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
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
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  activeFilter === tag
                    ? POST_TAG_COLORS[tag]
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {POST_TAG_LABELS[tag]} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Post grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <svg
              className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-gray-400 text-sm">
              Ingen innlegg ennå. Trykk &quot;Legg til&quot; for å komme i gang!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filtered.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onVote={handleVote}
                onOpenDetail={() => setDetailPost(post)}
                onOpenImage={() => {
                  const idx = allImageUrls.indexOf(post.image_url);
                  openLightbox(allImageUrls, idx >= 0 ? idx : 0);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create post modal */}
      {showCreateModal && board && user && (
        <CreatePostModal
          boardId={board.id}
          userId={user.id}
          onClose={() => setShowCreateModal(false)}
          onCreated={handlePostCreated}
        />
      )}

      {/* Post detail modal */}
      {detailPost && user && (
        <PostDetailModal
          post={detailPost}
          userId={user.id}
          onClose={() => setDetailPost(null)}
          onVote={handleVote}
        />
      )}
    </div>
  );
}

// ─── PostCard ────────────────────────────────────────────────────

function PostCard({
  post,
  onVote,
  onOpenDetail,
  onOpenImage,
}: {
  post: BoardPost;
  onVote: (postId: string, hasVoted: boolean) => void;
  onOpenDetail: () => void;
  onOpenImage: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow group">
      {/* Image */}
      <button
        onClick={onOpenImage}
        className="w-full focus:outline-none"
      >
        <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative">
          <img
            src={post.image_url}
            alt={post.caption}
            className="w-full h-full object-cover"
          />
          {/* Tag badge */}
          <span
            className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium ${
              POST_TAG_COLORS[post.tag]
            }`}
          >
            {POST_TAG_LABELS[post.tag]}
          </span>
        </div>
      </button>

      {/* Content */}
      <div className="p-2.5">
        {post.caption && (
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-1.5">
            {post.caption}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            {post.profiles?.avatar_url ? (
              <img
                src={post.profiles.avatar_url}
                alt=""
                className="w-5 h-5 rounded-full flex-shrink-0"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center text-[10px] font-medium text-gray-600 dark:text-gray-300">
                {(post.profiles?.display_name || "?")[0].toUpperCase()}
              </div>
            )}
            <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
              {post.profiles?.display_name}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Comment count */}
            <button
              onClick={onOpenDetail}
              className="flex items-center gap-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Kommentarer"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              {(post.comment_count || 0) > 0 && (
                <span className="text-xs">{post.comment_count}</span>
              )}
            </button>

            {/* Vote button */}
            <button
              onClick={() => onVote(post.id, !!post.user_has_voted)}
              className={`flex items-center gap-0.5 transition-colors ${
                post.user_has_voted
                  ? "text-blue-500"
                  : "text-gray-400 hover:text-blue-500"
              }`}
              title="Stem"
            >
              <svg
                className="w-4 h-4"
                fill={post.user_has_voted ? "currentColor" : "none"}
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                />
              </svg>
              {(post.vote_count || 0) > 0 && (
                <span className="text-xs">{post.vote_count}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CreatePostModal ─────────────────────────────────────────────

function CreatePostModal({
  boardId,
  userId,
  onClose,
  onCreated,
}: {
  boardId: string;
  userId: string;
  onClose: () => void;
  onCreated: (post: BoardPost) => void;
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
    const url = URL.createObjectURL(f);
    setPreview(url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setUploading(true);

    const fileExt = file.name.split(".").pop();
    const filePath = `boards/${boardId}/${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("files")
      .upload(filePath, file, { contentType: file.type });

    if (uploadError) {
      alert(`Kunne ikke laste opp: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("files").getPublicUrl(filePath);

    const { data, error } = await supabase
      .from("board_posts")
      .insert({
        board_id: boardId,
        user_id: userId,
        image_url: publicUrl,
        image_name: file.name,
        caption: caption.trim(),
        tag,
      })
      .select("*, profiles(*)")
      .single();

    if (error) {
      alert(`Kunne ikke opprette innlegg: ${error.message}`);
      setUploading(false);
      return;
    }

    if (data) {
      onCreated({ ...data, vote_count: 0, user_has_voted: false, comment_count: 0 });
    }

    setUploading(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Nytt innlegg
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Image upload */}
          <div>
            <input
              type="file"
              ref={fileRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />
            {preview ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <img
                  src={preview}
                  alt="Forhåndsvisning"
                  className="w-full max-h-64 object-cover"
                />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-2 hover:border-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <svg
                  className="w-10 h-10 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Velg bilde
                </span>
              </button>
            )}
          </div>

          {/* Caption */}
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Bildetekst (valgfritt)..."
            rows={2}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base sm:text-sm resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Tag selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Kategori
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(t)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border-2 ${
                    tag === t
                      ? `${POST_TAG_COLORS[t]} border-current`
                      : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {POST_TAG_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!file || uploading}
            className="w-full bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {uploading ? "Laster opp..." : "Publiser"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── PostDetailModal ─────────────────────────────────────────────

function PostDetailModal({
  post,
  userId,
  onClose,
  onVote,
}: {
  post: BoardPost;
  userId: string;
  onClose: () => void;
  onVote: (postId: string, hasVoted: boolean) => void;
}) {
  const supabase = createClient();
  const { openLightbox } = useLightbox();
  const [comments, setComments] = useState<BoardComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchComments() {
      const { data } = await supabase
        .from("board_comments")
        .select("*, profiles(*)")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });

      if (data) setComments(data);
      setLoadingComments(false);
    }

    fetchComments();
  }, [post.id, supabase]);

  useEffect(() => {
    if (!loadingComments) {
      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments.length, loadingComments]);

  async function handleSendComment(e: React.FormEvent) {
    e.preventDefault();
    const text = newComment.trim();
    if (!text) return;

    setSending(true);
    const { data, error } = await supabase
      .from("board_comments")
      .insert({
        post_id: post.id,
        user_id: userId,
        content: text,
      })
      .select("*, profiles(*)")
      .single();

    if (error) {
      alert(`Kunne ikke sende kommentar: ${error.message}`);
    } else if (data) {
      setComments((prev) => [...prev, data]);
    }

    setNewComment("");
    setSending(false);
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const time = date.toLocaleTimeString("no-NO", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (isToday) return time;

    return `${date.toLocaleDateString("no-NO", {
      day: "numeric",
      month: "short",
    })} ${time}`;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <button
          onClick={() => openLightbox([post.image_url])}
          className="w-full focus:outline-none flex-shrink-0"
        >
          <img
            src={post.image_url}
            alt={post.caption}
            className="w-full max-h-72 object-cover"
          />
        </button>

        {/* Post info */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                POST_TAG_COLORS[post.tag]
              }`}
            >
              {POST_TAG_LABELS[post.tag]}
            </span>
            <span className="text-xs text-gray-400">
              {formatTime(post.created_at)}
            </span>
          </div>

          {post.caption && (
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              {post.caption}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {post.profiles?.avatar_url ? (
                <img
                  src={post.profiles.avatar_url}
                  alt=""
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                  {(post.profiles?.display_name || "?")[0].toUpperCase()}
                </div>
              )}
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {post.profiles?.display_name}
              </span>
            </div>

            <button
              onClick={() => onVote(post.id, !!post.user_has_voted)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors ${
                post.user_has_voted
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              <svg
                className="w-4 h-4"
                fill={post.user_has_voted ? "currentColor" : "none"}
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                />
              </svg>
              {post.vote_count || 0}
            </button>
          </div>
        </div>

        {/* Comments */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {loadingComments ? (
            <div className="text-center text-gray-400 text-sm py-4">
              Laster kommentarer...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-4">
              Ingen kommentarer ennå
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2">
                  {comment.profiles?.avatar_url ? (
                    <img
                      src={comment.profiles.avatar_url}
                      alt=""
                      className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-700 flex-shrink-0 mt-0.5 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                      {(comment.profiles?.display_name || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {comment.profiles?.display_name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatTime(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={commentsEndRef} />
            </div>
          )}
        </div>

        {/* Comment input */}
        <form
          onSubmit={handleSendComment}
          className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2 flex-shrink-0"
        >
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Skriv en kommentar..."
            disabled={sending}
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || sending}
            className="bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
