"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
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

// --- Zoom & Swipe Image Viewer ---
function ZoomableImage({
  src,
  onSwipeLeft,
  onSwipeRight,
  hasNext,
  hasPrev,
}: {
  src: string;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  hasNext: boolean;
  hasPrev: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Refs for gesture tracking
  const dragStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });
  const lastTap = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const pinchStartDist = useRef(0);
  const pinchStartScale = useRef(1);
  const isSwiping = useRef(false);
  const swipeOffset = useRef(0);
  const [swipeX, setSwipeX] = useState(0);

  // Reset zoom when image changes
  useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setSwipeX(0);
    isSwiping.current = false;
    swipeOffset.current = 0;
  }, [src]);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale((prev) => {
      const next = Math.min(Math.max(prev + delta, 1), 5);
      if (next === 1) setTranslate({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Double-click / double-tap to zoom
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale > 1) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  }, [scale]);

  // Mouse drag for panning when zoomed
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.stopPropagation();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    translateStart.current = { ...translate };
  }, [scale, translate]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    e.stopPropagation();
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setTranslate({
      x: translateStart.current.x + dx,
      y: translateStart.current.y + dy,
    });
  }, [isDragging, scale]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers for swipe + pinch + double-tap
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();

    if (e.touches.length === 2) {
      // Pinch start
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDist.current = Math.sqrt(dx * dx + dy * dy);
      pinchStartScale.current = scale;
      isSwiping.current = false;
      return;
    }

    if (e.touches.length === 1) {
      const now = Date.now();
      const touch = e.touches[0];

      // Double-tap detection
      if (now - lastTap.current < 300) {
        if (scale > 1) {
          setScale(1);
          setTranslate({ x: 0, y: 0 });
        } else {
          setScale(2.5);
        }
        lastTap.current = 0;
        return;
      }
      lastTap.current = now;

      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: now };

      if (scale > 1) {
        // Pan mode
        setIsDragging(true);
        dragStart.current = { x: touch.clientX, y: touch.clientY };
        translateStart.current = { ...translate };
        isSwiping.current = false;
      } else {
        // Potential swipe
        isSwiping.current = true;
        swipeOffset.current = 0;
        setSwipeX(0);
      }
    }
  }, [scale, translate]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();

    if (e.touches.length === 2) {
      // Pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const newScale = Math.min(Math.max(pinchStartScale.current * (dist / pinchStartDist.current), 1), 5);
      setScale(newScale);
      if (newScale === 1) setTranslate({ x: 0, y: 0 });
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];

      if (isDragging && scale > 1) {
        // Panning
        const dx = touch.clientX - dragStart.current.x;
        const dy = touch.clientY - dragStart.current.y;
        setTranslate({
          x: translateStart.current.x + dx,
          y: translateStart.current.y + dy,
        });
      } else if (isSwiping.current && touchStartRef.current) {
        // Swiping
        const dx = touch.clientX - touchStartRef.current.x;
        swipeOffset.current = dx;
        setSwipeX(dx);
      }
    }
  }, [isDragging, scale]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    setIsDragging(false);

    if (isSwiping.current && touchStartRef.current) {
      const dx = swipeOffset.current;
      const elapsed = Date.now() - touchStartRef.current.time;
      const velocity = Math.abs(dx) / elapsed;
      const threshold = velocity > 0.5 ? 30 : 80;

      if (Math.abs(dx) > threshold) {
        if (dx < 0 && hasNext) {
          onSwipeLeft();
        } else if (dx > 0 && hasPrev) {
          onSwipeRight();
        }
      }
      setSwipeX(0);
      isSwiping.current = false;
      swipeOffset.current = 0;
    }

    touchStartRef.current = null;
  }, [hasNext, hasPrev, onSwipeLeft, onSwipeRight]);

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center w-full h-full overflow-hidden"
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: "none", cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
      onClick={(e) => e.stopPropagation()}
    >
      <img
        src={src}
        alt=""
        className="max-w-[90vw] max-h-[90vh] object-contain select-none"
        draggable={false}
        style={{
          transform: `translate(${translate.x + swipeX}px, ${translate.y}px) scale(${scale})`,
          transition: isDragging || isSwiping.current ? "none" : "transform 0.2s ease-out",
        }}
      />
    </div>
  );
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

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(images.length - 1, i + 1));
  }, [images.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (e: KeyboardEvent) => {
      if (annotating) return;
      if (e.key === "Escape") setIsOpen(false);
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };

    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, annotating, goNext, goPrev]);

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

          {/* Zoom hint */}
          <div className="absolute top-4 left-4 text-white/40 text-xs z-10 hidden sm:block">
            Scroll for å zoome &middot; Dobbelklikk for full zoom
          </div>

          {/* Zoomable image with swipe */}
          <ZoomableImage
            src={images[currentIndex]}
            onSwipeLeft={goNext}
            onSwipeRight={goPrev}
            hasNext={currentIndex < images.length - 1}
            hasPrev={currentIndex > 0}
          />

          {/* Prev button */}
          {images.length > 1 && currentIndex > 0 && (
            <button
              className="absolute left-4 text-white/70 hover:text-white p-2 z-10"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
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
              className="absolute right-4 text-white/70 hover:text-white p-2 z-10"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
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
            <div className="absolute bottom-4 text-white/70 text-sm z-10">
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
