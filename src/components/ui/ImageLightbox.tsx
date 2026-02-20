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
// All gesture state lives in refs to avoid re-renders during interaction.
// Transforms are written directly to the DOM for smooth 60fps.
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
  const imgRef = useRef<HTMLImageElement>(null);

  // All mutable gesture state in a single ref to avoid re-render overhead
  const gs = useRef({
    scale: 1,
    tx: 0,
    ty: 0,
    swipeX: 0,
    dragging: false,
    swiping: false,
    dragStartX: 0,
    dragStartY: 0,
    txStart: 0,
    tyStart: 0,
    pinchDist: 0,
    pinchScale: 1,
    lastTap: 0,
    touchStartX: 0,
    touchStartY: 0,
    touchStartTime: 0,
    animating: false,
  });

  // For cursor style (only thing that needs re-render)
  const [cursor, setCursor] = useState<"default" | "grab" | "grabbing">("default");

  // Direct DOM write – no React state, no re-renders
  const applyTransform = useCallback((animate: boolean) => {
    const img = imgRef.current;
    if (!img) return;
    const { tx, ty, swipeX, scale } = gs.current;
    img.style.transition = animate ? "transform 0.25s cubic-bezier(.2,.8,.4,1)" : "none";
    img.style.transform = `translate3d(${tx + swipeX}px,${ty}px,0) scale(${scale})`;
  }, []);

  // Reset when image changes
  useEffect(() => {
    const g = gs.current;
    g.scale = 1;
    g.tx = 0;
    g.ty = 0;
    g.swipeX = 0;
    g.dragging = false;
    g.swiping = false;
    g.animating = false;
    applyTransform(false);
    setCursor("default");
  }, [src, applyTransform]);

  // Clamp pan so image edges stay reasonable
  const clampPan = useCallback(() => {
    const g = gs.current;
    if (g.scale <= 1) {
      g.tx = 0;
      g.ty = 0;
      return;
    }
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;
    const iw = img.offsetWidth * g.scale;
    const ih = img.offsetHeight * g.scale;
    const cw = container.offsetWidth;
    const ch = container.offsetHeight;
    const maxX = Math.max(0, (iw - cw) / 2);
    const maxY = Math.max(0, (ih - ch) / 2);
    g.tx = Math.min(maxX, Math.max(-maxX, g.tx));
    g.ty = Math.min(maxY, Math.max(-maxY, g.ty));
  }, []);

  // --- Wheel zoom (multiplicative for even feel) ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const g = gs.current;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const next = Math.min(Math.max(g.scale * factor, 1), 5);
      g.scale = next;
      if (next <= 1) { g.tx = 0; g.ty = 0; }
      clampPan();
      applyTransform(false);
      setCursor(next > 1 ? "grab" : "default");
    };
    container.addEventListener("wheel", handler, { passive: false });
    return () => container.removeEventListener("wheel", handler);
  }, [applyTransform, clampPan]);

  // Double-click to toggle zoom
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const g = gs.current;
    if (g.scale > 1) {
      g.scale = 1;
      g.tx = 0;
      g.ty = 0;
      setCursor("default");
    } else {
      g.scale = 2.5;
      setCursor("grab");
    }
    applyTransform(true);
  }, [applyTransform]);

  // --- Mouse drag for panning ---
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const g = gs.current;
    if (g.scale <= 1) return;
    e.stopPropagation();
    g.dragging = true;
    g.dragStartX = e.clientX;
    g.dragStartY = e.clientY;
    g.txStart = g.tx;
    g.tyStart = g.ty;
    setCursor("grabbing");
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const g = gs.current;
    if (!g.dragging || g.scale <= 1) return;
    e.stopPropagation();
    g.tx = g.txStart + (e.clientX - g.dragStartX);
    g.ty = g.tyStart + (e.clientY - g.dragStartY);
    clampPan();
    applyTransform(false);
  }, [applyTransform, clampPan]);

  const handleMouseUp = useCallback(() => {
    const g = gs.current;
    if (g.dragging) {
      g.dragging = false;
      setCursor(g.scale > 1 ? "grab" : "default");
    }
  }, []);

  // --- Touch: swipe / pinch / double-tap / pan ---
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const g = gs.current;
    g.animating = false;

    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      g.pinchDist = Math.sqrt(dx * dx + dy * dy);
      g.pinchScale = g.scale;
      g.swiping = false;
      return;
    }

    if (e.touches.length === 1) {
      const now = Date.now();
      const t = e.touches[0];

      // Double-tap
      if (now - g.lastTap < 300) {
        g.lastTap = 0;
        if (g.scale > 1) {
          g.scale = 1;
          g.tx = 0;
          g.ty = 0;
          setCursor("default");
        } else {
          g.scale = 2.5;
          setCursor("grab");
        }
        applyTransform(true);
        return;
      }
      g.lastTap = now;

      g.touchStartX = t.clientX;
      g.touchStartY = t.clientY;
      g.touchStartTime = now;

      if (g.scale > 1) {
        g.dragging = true;
        g.dragStartX = t.clientX;
        g.dragStartY = t.clientY;
        g.txStart = g.tx;
        g.tyStart = g.ty;
        g.swiping = false;
      } else {
        g.swiping = true;
        g.swipeX = 0;
      }
    }
  }, [applyTransform]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const g = gs.current;

    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const next = Math.min(Math.max(g.pinchScale * (dist / g.pinchDist), 1), 5);
      g.scale = next;
      if (next <= 1) { g.tx = 0; g.ty = 0; }
      clampPan();
      applyTransform(false);
      setCursor(next > 1 ? "grab" : "default");
      return;
    }

    if (e.touches.length === 1) {
      const t = e.touches[0];
      if (g.dragging && g.scale > 1) {
        g.tx = g.txStart + (t.clientX - g.dragStartX);
        g.ty = g.tyStart + (t.clientY - g.dragStartY);
        clampPan();
        applyTransform(false);
      } else if (g.swiping) {
        const dx = t.clientX - g.touchStartX;
        // Rubber-band at edges
        if ((dx < 0 && !hasNext) || (dx > 0 && !hasPrev)) {
          g.swipeX = dx * 0.3;
        } else {
          g.swipeX = dx;
        }
        applyTransform(false);
      }
    }
  }, [applyTransform, clampPan, hasNext, hasPrev]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const g = gs.current;

    if (g.dragging) {
      g.dragging = false;
      setCursor(g.scale > 1 ? "grab" : "default");
    }

    if (g.swiping) {
      const dx = g.swipeX;
      const elapsed = Date.now() - g.touchStartTime;
      const velocity = Math.abs(dx) / Math.max(elapsed, 1);
      const threshold = velocity > 0.5 ? 30 : 80;

      let swiped = false;
      if (Math.abs(dx) > threshold) {
        if (dx < 0 && hasNext) { swiped = true; onSwipeLeft(); }
        else if (dx > 0 && hasPrev) { swiped = true; onSwipeRight(); }
      }

      if (!swiped) {
        // Snap back with animation
        g.swipeX = 0;
        g.animating = true;
        applyTransform(true);
      }

      g.swiping = false;
    }
  }, [hasNext, hasPrev, onSwipeLeft, onSwipeRight, applyTransform]);

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center w-full h-full overflow-hidden"
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: "none", cursor }}
      onClick={(e) => e.stopPropagation()}
    >
      <img
        ref={imgRef}
        src={src}
        alt=""
        className="max-w-[90vw] max-h-[90vh] object-contain select-none"
        draggable={false}
        style={{
          willChange: "transform",
          backfaceVisibility: "hidden",
          transform: "translate3d(0,0,0) scale(1)",
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
