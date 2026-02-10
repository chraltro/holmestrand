"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { ImageAnnotator } from "./ImageAnnotator";

interface LightboxContextType {
  openLightbox: (images: string[], startIndex?: number, meta?: { channelId?: string; userId?: string }) => void;
}

const LightboxContext = createContext<LightboxContextType>({
  openLightbox: () => {},
});

export function useLightbox() {
  return useContext(LightboxContext);
}

export function LightboxProvider({ children }: { children: React.ReactNode }) {
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [annotating, setAnnotating] = useState(false);
  const [meta, setMeta] = useState<{ channelId?: string; userId?: string }>({});

  const openLightbox = useCallback((imgs: string[], startIndex = 0, m?: { channelId?: string; userId?: string }) => {
    setImages(imgs);
    setCurrentIndex(startIndex);
    setIsOpen(true);
    setAnnotating(false);
    if (m) setMeta(m);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (e: KeyboardEvent) => {
      if (annotating) return;
      if (e.key === "Escape") setIsOpen(false);
      if (e.key === "ArrowLeft")
        setCurrentIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight")
        setCurrentIndex((i) => Math.min(images.length - 1, i + 1));
    };

    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, images.length, annotating]);

  return (
    <LightboxContext.Provider value={{ openLightbox }}>
      {children}
      {isOpen && !annotating && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setIsOpen(false)}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white z-10 p-2"
            onClick={() => setIsOpen(false)}
          >
            <svg
              className="w-8 h-8"
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

          {/* Annotate button */}
          {meta.channelId && meta.userId && (
            <button
              className="absolute top-4 right-16 text-white/70 hover:text-white z-10 p-2 flex items-center gap-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              onClick={(e) => { e.stopPropagation(); setAnnotating(true); }}
              title="Tegn på bildet"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span className="text-sm font-medium">Tegn</span>
            </button>
          )}

          {/* Image */}
          <img
            src={images[currentIndex]}
            alt=""
            className="max-w-[90vw] max-h-[90vh] object-contain select-none"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />

          {/* Prev button */}
          {images.length > 1 && currentIndex > 0 && (
            <button
              className="absolute left-4 text-white/70 hover:text-white p-2"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex((i) => i - 1);
              }}
            >
              <svg
                className="w-10 h-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}

          {/* Next button */}
          {images.length > 1 && currentIndex < images.length - 1 && (
            <button
              className="absolute right-4 text-white/70 hover:text-white p-2"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex((i) => i + 1);
              }}
            >
              <svg
                className="w-10 h-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}

          {/* Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-4 text-white/70 text-sm">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
      )}

      {/* Annotator overlay */}
      {isOpen && annotating && meta.channelId && meta.userId && (
        <ImageAnnotator
          imageUrl={images[currentIndex]}
          channelId={meta.channelId}
          userId={meta.userId}
          onClose={() => setAnnotating(false)}
          onSaved={() => { setAnnotating(false); setIsOpen(false); }}
        />
      )}
    </LightboxContext.Provider>
  );
}
