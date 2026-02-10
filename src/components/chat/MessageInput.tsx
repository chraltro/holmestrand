"use client";

import { createClient } from "@/lib/supabase/client";
import { PostTag, POST_TAG_LABELS, POST_TAG_COLORS } from "@/lib/types";
import { useState, useRef } from "react";

interface MessageInputProps {
  channelId: string;
  userId: string;
  showTagSelector?: boolean;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALL_TAGS: PostTag[] = ["dagens", "inspo", "forslag", "vedtatt"];

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

export function MessageInput({ channelId, userId, showTagSelector = false }: MessageInputProps) {
  const supabase = createClient();
  const [content, setContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [selectedTag, setSelectedTag] = useState<PostTag | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showingTagPicker, setShowingTagPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;

    setContent("");

    await supabase.from("messages").insert({
      channel_id: channelId,
      user_id: userId,
      content: text,
    });
  }

  async function uploadFile(file: File, tag: PostTag | null): Promise<boolean> {
    if (file.size > MAX_FILE_SIZE) {
      alert(`Filen "${file.name}" er for stor. Maks 25 MB.`);
      return false;
    }

    const fileExt = file.name.split(".").pop();
    const filePath = `${channelId}/${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("files")
      .upload(filePath, file, {
        contentType: file.type,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      alert(`Kunne ikke laste opp "${file.name}": ${uploadError.message}`);
      return false;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("files").getPublicUrl(filePath);

    const insertData: Record<string, unknown> = {
      channel_id: channelId,
      user_id: userId,
      content: file.name,
      file_url: publicUrl,
      file_name: file.name,
      file_type: file.type,
    };

    // Only add tag for image files
    if (tag && isImageFile(file)) {
      insertData.tag = tag;
    }

    await supabase.from("messages").insert(insertData);

    return true;
  }

  async function uploadFiles(files: File[], tag: PostTag | null) {
    if (files.length === 0) return;

    setUploading(true);
    let uploaded = 0;

    for (const file of files) {
      setUploadProgress(
        files.length > 1
          ? `Laster opp ${uploaded + 1} av ${files.length}...`
          : `Laster opp ${file.name}...`
      );
      const ok = await uploadFile(file, tag);
      if (ok) uploaded++;
    }

    setContent("");
    setUploading(false);
    setUploadProgress("");
    setSelectedTag(null);
    setShowingTagPicker(false);
    setPendingFiles([]);
  }

  function handleFilesSelected(files: File[]) {
    if (files.length === 0) return;
    const hasImages = files.some(isImageFile);

    // Show tag picker only if we have images and the channel supports tags
    if (hasImages && showTagSelector) {
      setPendingFiles(files);
      setShowingTagPicker(true);
    } else {
      uploadFiles(files, null);
    }
  }

  function handleTagConfirm(tag: PostTag | null) {
    uploadFiles(pendingFiles, tag);
  }

  function handleTagCancel() {
    // Upload without tag
    uploadFiles(pendingFiles, null);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) handleFilesSelected(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) handleFilesSelected(files);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  }

  return (
    <div
      className={`border-t border-gray-200 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg p-4 ${
        dragOver ? "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {dragOver && (
        <div className="text-center text-sm text-indigo-600 dark:text-indigo-400 mb-2 font-medium">
          Slipp filene her for å laste opp
        </div>
      )}

      {uploadProgress && (
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center justify-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          {uploadProgress}
        </div>
      )}

      {/* Tag picker overlay */}
      {showingTagPicker && (
        <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/50 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Legg til kategori for tavlen? (valgfritt)
            </span>
            <button
              onClick={handleTagCancel}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Hopp over
            </button>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {ALL_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setSelectedTag(tag);
                  handleTagConfirm(tag);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  selectedTag === tag
                    ? `${POST_TAG_COLORS[tag]} border-current shadow-sm scale-105`
                    : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                }`}
              >
                {POST_TAG_LABELS[tag]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Merket bilder vises også på kanalens Tavle-fane
          </div>
        </div>
      )}

      <form onSubmit={sendMessage} className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          multiple
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-shrink-0 text-gray-400 hover:text-indigo-500 transition-all p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Last opp filer"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
        </button>

        <div className="flex-1 relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={uploading ? uploadProgress : "Skriv en melding..."}
            disabled={uploading}
            rows={1}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-base sm:text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 max-h-32 bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-shadow"
            style={{ minHeight: "38px" }}
          />
        </div>

        <button
          type="submit"
          disabled={!content.trim() || uploading}
          className="flex-shrink-0 gradient-primary text-white rounded-xl p-2 hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </form>
    </div>
  );
}
