"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useRef } from "react";

interface MessageInputProps {
  channelId: string;
  userId: string;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export function MessageInput({ channelId, userId }: MessageInputProps) {
  const supabase = createClient();
  const [content, setContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [dragOver, setDragOver] = useState(false);
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

  async function uploadFile(file: File): Promise<boolean> {
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

    await supabase.from("messages").insert({
      channel_id: channelId,
      user_id: userId,
      content: file.name,
      file_url: publicUrl,
      file_name: file.name,
      file_type: file.type,
    });

    return true;
  }

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return;

    setUploading(true);
    let uploaded = 0;

    for (const file of files) {
      setUploadProgress(
        files.length > 1
          ? `Laster opp ${uploaded + 1} av ${files.length}...`
          : `Laster opp ${file.name}...`
      );
      const ok = await uploadFile(file);
      if (ok) uploaded++;
    }

    setContent("");
    setUploading(false);
    setUploadProgress("");
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) uploadFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) uploadFiles(files);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  }

  return (
    <div
      className={`border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 ${
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
        <div className="text-center text-sm text-blue-600 dark:text-blue-400 mb-2">
          Slipp filene her for å laste opp
        </div>
      )}

      {uploadProgress && (
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 mb-2">
          {uploadProgress}
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
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2"
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
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base sm:text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 max-h-32 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            style={{ minHeight: "38px" }}
          />
        </div>

        <button
          type="submit"
          disabled={!content.trim() || uploading}
          className="flex-shrink-0 bg-blue-600 text-white rounded-lg p-2 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
