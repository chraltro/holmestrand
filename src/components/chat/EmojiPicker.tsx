"use client";

import { REACTION_EMOJIS } from "@/lib/types";
import { useRef, useEffect, useState } from "react";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [openDown, setOpenDown] = useState(false);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      if (rect.top < 0) setOpenDown(true);
    }
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div ref={ref} className={`absolute ${openDown ? "top-full mt-1" : "bottom-full mb-1"} right-0 z-50`}>
      <div className="glass rounded-xl shadow-warm p-2 flex gap-1 animate-fade-in" onClick={(e) => e.stopPropagation()}>
        {REACTION_EMOJIS.map((emoji) => (
          <button key={emoji} onClick={() => { onSelect(emoji); onClose(); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--surface-glass-hover)] transition-colors text-lg hover:scale-125">
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
