"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useRef, useEffect, useCallback } from "react";

interface ImageAnnotatorProps {
  imageUrl: string;
  channelId: string;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#ffffff"];
const SIZES = [2, 4, 8];

interface DrawPoint {
  x: number;
  y: number;
}

interface DrawStroke {
  points: DrawPoint[];
  color: string;
  size: number;
}

export function ImageAnnotator({ imageUrl, channelId, userId, onClose, onSaved }: ImageAnnotatorProps) {
  const supabase = createClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(SIZES[1]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  const currentStroke = useRef<DrawStroke | null>(null);
  const [saving, setSaving] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [textPos, setTextPos] = useState<DrawPoint | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Resize and redraw
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Size canvas to fit image within viewport
    const maxW = window.innerWidth * 0.85;
    const maxH = window.innerHeight * 0.7;
    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Redraw all strokes
    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, [strokes]);

  useEffect(() => {
    if (imgLoaded) redraw();
  }, [imgLoaded, redraw]);

  function getPos(e: React.MouseEvent | React.TouchEvent): DrawPoint {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    if (textMode) {
      setTextPos(getPos(e));
      return;
    }
    e.preventDefault();
    const pos = getPos(e);
    currentStroke.current = { points: [pos], color, size: brushSize };
    setIsDrawing(true);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing || !currentStroke.current) return;
    e.preventDefault();
    const pos = getPos(e);
    currentStroke.current.points.push(pos);

    // Draw incrementally
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pts = currentStroke.current.points;
    if (pts.length < 2) return;
    ctx.strokeStyle = currentStroke.current.color;
    ctx.lineWidth = currentStroke.current.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();
  }

  function endDraw() {
    if (!isDrawing || !currentStroke.current) return;
    setStrokes((prev) => [...prev, currentStroke.current!]);
    currentStroke.current = null;
    setIsDrawing(false);
  }

  function addText() {
    if (!textPos || !textInput.trim() || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.font = `bold ${brushSize * 5 + 12}px sans-serif`;
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 2;
    ctx.strokeText(textInput, textPos.x, textPos.y);
    ctx.fillText(textInput, textPos.x, textPos.y);
    // Store as a fake stroke for undo
    setStrokes((prev) => [...prev, { points: [textPos], color, size: 0 }]);
    setTextInput("");
    setTextPos(null);
    setTextMode(false);
  }

  function undo() {
    setStrokes((prev) => prev.slice(0, -1));
  }

  async function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);

    // Get full-res canvas
    const img = imgRef.current!;
    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = img.width;
    fullCanvas.height = img.height;
    const ctx = fullCanvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const scaleX = img.width / canvas.width;
    const scaleY = img.height / canvas.height;

    for (const stroke of strokes) {
      if (stroke.size === 0) continue; // text strokes handled differently
      if (stroke.points.length < 2) continue;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size * scaleX;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x * scaleX, stroke.points[0].y * scaleY);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x * scaleX, stroke.points[i].y * scaleY);
      }
      ctx.stroke();
    }

    // Get blob
    const blob = await new Promise<Blob | null>((resolve) => fullCanvas.toBlob(resolve, "image/png"));
    if (!blob) { setSaving(false); return; }

    const filePath = `${channelId}/${Date.now()}-annotated.png`;
    const { error } = await supabase.storage.from("files").upload(filePath, blob, { contentType: "image/png" });
    if (error) { alert(`Feil: ${error.message}`); setSaving(false); return; }

    const { data: { publicUrl } } = supabase.storage.from("files").getPublicUrl(filePath);
    await supabase.from("messages").insert({
      channel_id: channelId,
      user_id: userId,
      content: "Annotert bilde",
      file_url: publicUrl,
      file_name: "annotated.png",
      file_type: "image/png",
    });

    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col" onClick={(e) => e.stopPropagation()}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-900/80 backdrop-blur-lg border-b border-gray-700/50">
        <button onClick={onClose} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="h-6 w-px bg-gray-600" />

        {/* Colors */}
        <div className="flex gap-1">
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? "border-white scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
          ))}
        </div>

        <div className="h-6 w-px bg-gray-600" />

        {/* Brush sizes */}
        <div className="flex gap-1.5 items-center">
          {SIZES.map((s) => (
            <button key={s} onClick={() => setBrushSize(s)} className={`rounded-full transition-all ${brushSize === s ? "bg-white" : "bg-white/40"}`} style={{ width: s * 2 + 8, height: s * 2 + 8 }} />
          ))}
        </div>

        <div className="h-6 w-px bg-gray-600" />

        {/* Text mode */}
        <button onClick={() => setTextMode(!textMode)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${textMode ? "bg-indigo-500 text-white" : "text-white/70 hover:bg-white/10"}`}>
          Aa
        </button>

        {/* Undo */}
        <button onClick={undo} disabled={strokes.length === 0} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 disabled:opacity-30">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
        </button>

        <div className="flex-1" />

        <button onClick={handleSave} disabled={saving || strokes.length === 0} className="gradient-primary text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50">
          {saving ? "Lagrer..." : "Post som melding"}
        </button>
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex items-center justify-center overflow-auto p-4">
        {!imgLoaded ? (
          <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        ) : (
          <canvas
            ref={canvasRef}
            className={`rounded-lg shadow-2xl ${textMode ? "cursor-text" : "cursor-crosshair"}`}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
        )}
      </div>

      {/* Text input popup */}
      {textMode && textPos && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-gray-800 rounded-xl p-3 flex gap-2 shadow-2xl animate-slide-up">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Skriv tekst..."
            autoFocus
            className="bg-gray-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onKeyDown={(e) => { if (e.key === "Enter") addText(); }}
          />
          <button onClick={addText} className="gradient-primary text-white rounded-lg px-3 py-1.5 text-sm font-medium">Legg til</button>
        </div>
      )}
    </div>
  );
}
