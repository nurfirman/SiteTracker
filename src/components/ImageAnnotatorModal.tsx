"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Circle,
  ArrowUpRight,
  Type,
  Square,
  PenTool,
  Undo2,
  Trash2,
  Check,
  X,
  Palette,
  Minus,
  Plus,
} from "lucide-react";

interface ImageAnnotatorModalProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (annotatedDataUrl: string) => void;
}

type ToolMode = "CIRCLE" | "ARROW" | "RECT" | "PEN" | "TEXT";

interface Shape {
  id: string;
  type: ToolMode;
  color: string;
  lineWidth: number;
  // Freehand Pen
  points?: { x: number; y: number }[];
  // Circle / Rect / Arrow
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  // Text
  text?: string;
  x?: number;
  y?: number;
  fontSize?: number;
}

const COLOR_PALETTE = [
  { name: "Merah Bahaya", value: "#ef4444" },
  { name: "Kuning Perhatian", value: "#eab308" },
  { name: "Hijau Selesai", value: "#10b981" },
  { name: "Biru Info", value: "#3b82f6" },
  { name: "Putih Kontras", value: "#ffffff" },
  { name: "Hitam Pekat", value: "#000000" },
];

export function ImageAnnotatorModal({
  imageUrl,
  isOpen,
  onClose,
  onSave,
}: ImageAnnotatorModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [activeTool, setActiveTool] = useState<ToolMode>("CIRCLE");
  const [activeColor, setActiveColor] = useState<string>("#ef4444"); // Red default for findings
  const [lineWidth, setLineWidth] = useState<number>(4);

  // Text input state
  const [inputText, setInputText] = useState<string>("");
  const [isAddingText, setIsAddingText] = useState<boolean>(false);
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);

  // History & Shapes
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [history, setHistory] = useState<Shape[][]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);

  // Image reference
  const imageObjRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  // Load image into memory
  useEffect(() => {
    if (!isOpen || !imageUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      imageObjRef.current = img;
      setImageLoaded(true);
      setShapes([]);
      setHistory([]);
      setCurrentShape(null);
    };
  }, [isOpen, imageUrl]);

  // Redraw Canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageObjRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imageObjRef.current;
    if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }

    // 1. Draw original base image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Helper: Draw single shape
    const drawShape = (s: Shape) => {
      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = s.lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (s.type === "PEN" && s.points && s.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(s.points[0].x, s.points[0].y);
        for (let i = 1; i < s.points.length; i++) {
          ctx.lineTo(s.points[i].x, s.points[i].y);
        }
        ctx.stroke();
      } else if (s.type === "CIRCLE" && s.startX !== undefined && s.endX !== undefined) {
        const radiusX = Math.abs(s.endX - s.startX) / 2;
        const radiusY = Math.abs(s.endY! - s.startY!) / 2;
        const centerX = Math.min(s.startX, s.endX) + radiusX;
        const centerY = Math.min(s.startY!, s.endY!) + radiusY;

        ctx.beginPath();
        ctx.ellipse(centerX, centerY, Math.max(1, radiusX), Math.max(1, radiusY), 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (s.type === "RECT" && s.startX !== undefined && s.endX !== undefined) {
        const x = Math.min(s.startX, s.endX);
        const y = Math.min(s.startY!, s.endY!);
        const w = Math.abs(s.endX - s.startX);
        const h = Math.abs(s.endY! - s.startY!);

        ctx.beginPath();
        ctx.strokeRect(x, y, w, h);
      } else if (s.type === "ARROW" && s.startX !== undefined && s.endX !== undefined) {
        const fromX = s.startX;
        const fromY = s.startY!;
        const toX = s.endX;
        const toY = s.endY!;
        const headlen = Math.max(16, s.lineWidth * 4); // length of head in px
        const dx = toX - fromX;
        const dy = toY - fromY;
        const angle = Math.atan2(dy, dx);

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        // Arrow head
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      } else if (s.type === "TEXT" && s.text && s.x !== undefined && s.y !== undefined) {
        const fSize = s.fontSize || Math.max(20, Math.round(canvas.width * 0.025));
        ctx.font = `bold ${fSize}px sans-serif`;

        // Measure text for background badge
        const metrics = ctx.measureText(s.text);
        const padX = 10;
        const padY = 6;
        const bgWidth = metrics.width + padX * 2;
        const bgHeight = fSize + padY * 2;

        // Background pill
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.beginPath();
        const rectX = s.x - padX;
        const rectY = s.y - fSize - padY / 2;
        ctx.roundRect(rectX, rectY, bgWidth, bgHeight, 6);
        ctx.fill();

        // Border pill with active color
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Text string
        ctx.fillStyle = "#ffffff";
        ctx.fillText(s.text, s.x, s.y);
      }

      ctx.restore();
    };

    // 2. Render committed shapes
    shapes.forEach(drawShape);

    // 3. Render in-progress shape
    if (currentShape) {
      drawShape(currentShape);
    }
  }, [shapes, currentShape]);

  useEffect(() => {
    if (imageLoaded) {
      renderCanvas();
    }
  }, [imageLoaded, renderCanvas]);

  // Coordinate mapper from display/pointer to real image canvas coordinates
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // Pointer Down
  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);

    if (activeTool === "TEXT") {
      setTextPosition(coords);
      setIsAddingText(true);
      return;
    }

    setIsDrawing(true);
    setHistory((prev) => [...prev, shapes]);

    if (activeTool === "PEN") {
      setCurrentShape({
        id: Date.now().toString(),
        type: "PEN",
        color: activeColor,
        lineWidth,
        points: [coords],
      });
    } else {
      setCurrentShape({
        id: Date.now().toString(),
        type: activeTool,
        color: activeColor,
        lineWidth,
        startX: coords.x,
        startY: coords.y,
        endX: coords.x,
        endY: coords.y,
      });
    }
  };

  // Pointer Move
  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentShape) return;
    const coords = getCanvasCoords(e);

    if (currentShape.type === "PEN") {
      setCurrentShape((prev) =>
        prev
          ? {
              ...prev,
              points: [...(prev.points || []), coords],
            }
          : null
      );
    } else {
      setCurrentShape((prev) =>
        prev
          ? {
              ...prev,
              endX: coords.x,
              endY: coords.y,
            }
          : null
      );
    }
  };

  // Pointer Up
  const handlePointerUp = () => {
    if (!isDrawing || !currentShape) return;
    setIsDrawing(false);

    setShapes((prev) => [...prev, currentShape]);
    setCurrentShape(null);
  };

  // Add text shape
  const handleConfirmText = () => {
    if (!inputText.trim() || !textPosition) {
      setIsAddingText(false);
      setInputText("");
      return;
    }

    const canvas = canvasRef.current;
    const calcFontSize = canvas ? Math.max(22, Math.round(canvas.width * 0.028)) : 24;

    const textShape: Shape = {
      id: Date.now().toString(),
      type: "TEXT",
      color: activeColor,
      lineWidth: 2,
      text: inputText.trim(),
      x: textPosition.x,
      y: textPosition.y,
      fontSize: calcFontSize,
    };

    setHistory((prev) => [...prev, shapes]);
    setShapes((prev) => [...prev, textShape]);

    setInputText("");
    setIsAddingText(false);
    setTextPosition(null);
  };

  // Undo last action
  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setShapes(previous);
    setHistory((prev) => prev.slice(0, -1));
  };

  // Clear all annotations
  const handleClearAll = () => {
    if (shapes.length === 0) return;
    setHistory((prev) => [...prev, shapes]);
    setShapes([]);
  };

  // Save final annotated image
  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const finalDataUrl = canvas.toDataURL("image/jpeg", 0.85);
    onSave(finalDataUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Header Toolbar */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-violet-600 rounded-xl">
              <PenTool size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-wide">Editor & Anotasi Foto Lapangan</h3>
              <p className="text-[11px] text-slate-400">
                Beri tanda lingkaran, panah penunjuk, atau teks keterangan temuan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={shapes.length === 0}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-all text-xs font-bold flex items-center gap-1.5"
              title="Batalkan (Undo)"
            >
              <Undo2 size={16} />
              <span className="hidden sm:inline">Undo</span>
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={shapes.length === 0}
              className="p-2 rounded-xl bg-slate-800 hover:bg-red-950 hover:text-red-400 disabled:opacity-40 transition-all text-xs font-bold flex items-center gap-1.5"
              title="Hapus Semua Coretan"
            >
              <Trash2 size={16} />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Canvas Workspace */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950 relative min-h-[300px] select-none touch-none"
        >
          {!imageLoaded ? (
            <div className="text-center text-slate-400 text-xs font-bold animate-pulse">
              Memuat gambar ke kanvas editor...
            </div>
          ) : (
            <div className="relative inline-block border-2 border-slate-800 rounded-xl overflow-hidden shadow-2xl">
              <canvas
                ref={canvasRef}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
                className="max-w-full max-h-[58vh] object-contain cursor-crosshair block"
              />

              {/* Text Input Overlay Modal */}
              {isAddingText && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-20">
                  <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl max-w-sm w-full space-y-3 shadow-2xl animate-in zoom-in-95 duration-150">
                    <div className="flex items-center gap-2 text-xs font-black uppercase text-violet-400">
                      <Type size={16} />
                      <span>Ketik Keterangan / Caption</span>
                    </div>
                    <input
                      type="text"
                      autoFocus
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleConfirmText();
                        if (e.key === "Escape") setIsAddingText(false);
                      }}
                      placeholder="Contoh: Kabel 220V terbuka / Tidak pakai APD"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-600 text-white text-sm font-semibold focus:outline-none focus:border-violet-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingText(false);
                          setInputText("");
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmText}
                        disabled={!inputText.trim()}
                        className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-black rounded-xl"
                      >
                        Tempel Teks
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="p-3 sm:p-4 bg-slate-950/90 border-t border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Tools Selector */}
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTool("CIRCLE")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTool === "CIRCLE"
                    ? "bg-violet-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Lingkaran / Oval"
              >
                <Circle size={15} />
                <span className="hidden sm:inline">Lingkaran</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTool("ARROW")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTool === "ARROW"
                    ? "bg-violet-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Panah Penunjuk"
              >
                <ArrowUpRight size={16} />
                <span className="hidden sm:inline">Panah</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTool("TEXT")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTool === "TEXT"
                    ? "bg-violet-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Ketik Teks (Klik pada gambar)"
              >
                <Type size={16} />
                <span className="hidden sm:inline">Teks</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTool("RECT")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTool === "RECT"
                    ? "bg-violet-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Kotak / Box"
              >
                <Square size={15} />
                <span className="hidden sm:inline">Kotak</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTool("PEN")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTool === "PEN"
                    ? "bg-violet-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Coretan Bebas"
              >
                <PenTool size={15} />
                <span className="hidden sm:inline">Coret</span>
              </button>
            </div>

            {/* Colors Palette & Line Width */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setActiveColor(c.value)}
                    style={{ backgroundColor: c.value }}
                    className={`w-6 h-6 rounded-full transition-transform active:scale-90 border-2 ${
                      activeColor === c.value
                        ? "scale-110 border-white shadow-lg shadow-white/30"
                        : "border-transparent opacity-80 hover:opacity-100"
                    }`}
                    title={c.name}
                  />
                ))}
              </div>

              {/* Line thickness */}
              <div className="hidden md:flex items-center gap-1 bg-slate-900 px-2 py-1.5 rounded-2xl border border-slate-800 text-xs">
                <span className="text-slate-400 text-[10px] uppercase font-bold mr-1">Tebal:</span>
                <button
                  type="button"
                  onClick={() => setLineWidth((prev) => Math.max(2, prev - 1))}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <Minus size={12} />
                </button>
                <span className="font-mono font-bold text-violet-400 w-4 text-center">{lineWidth}</span>
                <button
                  type="button"
                  onClick={() => setLineWidth((prev) => Math.min(10, prev + 1))}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Action Save/Cancel Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span className="text-xs text-slate-400 font-medium">
              {activeTool === "TEXT"
                ? "💡 Klik lokasi pada foto di mana Anda ingin menaruh teks."
                : "💡 Tarik kursor/sentuh layar pada foto untuk menggambar."}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-600/30 active:scale-95 transition-all"
              >
                <Check size={16} strokeWidth={3} />
                <span>Simpan Hasil Anotasi</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
