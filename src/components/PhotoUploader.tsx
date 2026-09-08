"use client";

import React, { useState, useEffect, useRef } from "react";
import { Camera, Upload, X, Check, Loader2, Sparkles, Edit3, ClipboardPaste, AlertCircle } from "lucide-react";
import { cn } from "../lib/utils";
import { ImageAnnotatorModal } from "./ImageAnnotatorModal";

interface PhotoUploaderProps {
  label: string;
  description?: string;
  value?: string | null;
  onChange: (url: string) => void;
  required?: boolean;
  className?: string;
  allowAnnotation?: boolean;
}

// Client-side image compression function using HTML5 Canvas
async function compressImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.75): Promise<{ dataUrl: string; originalSize: number; compressedSize: number }> {
  return new Promise((resolve, reject) => {
    const originalSize = file.size;
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio scaling
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          const rawResult = event.target?.result as string;
          resolve({ dataUrl: rawResult, originalSize, compressedSize: rawResult.length });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to compressed JPEG Data URL
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        const compressedSize = Math.round((compressedDataUrl.length * 3) / 4);

        resolve({ dataUrl: compressedDataUrl, originalSize, compressedSize });
      };

      img.onerror = () => {
        const rawResult = event.target?.result as string;
        resolve({ dataUrl: rawResult, originalSize, compressedSize: rawResult.length });
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function PhotoUploader({
  label,
  description,
  value,
  onChange,
  required = false,
  className,
  allowAnnotation = true,
}: PhotoUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ orig: string; comp: string; ratio: number } | null>(null);
  const [showAnnotator, setShowAnnotator] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Common image processor
  const processImageFile = async (file: File) => {
    setLoading(true);
    setPasteNotice(null);

    try {
      // Compress image client-side before sending to server/state
      const compressed = await compressImage(file, 1200, 1200, 0.75);
      onChange(compressed.dataUrl);

      const ratio = Math.round((1 - compressed.compressedSize / compressed.originalSize) * 100);
      setStats({
        orig: formatBytes(compressed.originalSize),
        comp: formatBytes(compressed.compressedSize),
        ratio: Math.max(0, ratio),
      });
    } catch (err) {
      console.error("Gagal mengompresi foto:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processImageFile(file);
    // Reset file input value so re-selecting the same file triggers change
    e.target.value = "";
  };

  // Global listener for Ctrl+V paste (captures screenshots)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Don't overwrite if an image is already set
      if (value) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            processImageFile(file);
          }
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [value]);

  // Click handler for "Paste dari Clipboard" button
  const handlePasteButtonClick = async () => {
    setPasteNotice(null);
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        setPasteNotice("Tekan Ctrl+V (atau Cmd+V) di keyboard untuk menempelkan screenshot.");
        return;
      }

      const clipboardItems = await navigator.clipboard.read();
      let foundImage = false;

      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File(
            [blob],
            `screenshot-${Date.now()}.${imageType.split("/")[1] || "png"}`,
            { type: imageType }
          );
          await processImageFile(file);
          foundImage = true;
          break;
        }
      }

      if (!foundImage) {
        setPasteNotice(
          "Tidak ada gambar di clipboard. Ambil screenshot dahulu (Win+Shift+S di Windows atau Cmd+Shift+4 di Mac), lalu klik tombol ini atau tekan Ctrl+V."
        );
      }
    } catch (err: any) {
      // Typically browser permission restriction
      setPasteNotice(
        "Akses langsung clipboard dibatasi browser. Silakan langsung tekan Ctrl+V (atau Cmd+V) untuk menempelkan screenshot."
      );
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      await processImageFile(file);
    }
  };

  const clearPhoto = () => {
    onChange("");
    setStats(null);
    setPasteNotice(null);
  };

  const handleSaveAnnotation = (annotatedUrl: string) => {
    onChange(annotatedUrl);
  };

  return (
    <div className={cn("space-y-2", className)} ref={containerRef}>
      <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed border-violet-400 bg-violet-50/60 dark:bg-violet-950/40 text-violet-800 dark:text-violet-200 min-h-[160px]">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          <div className="text-center">
            <span className="block text-sm font-extrabold">Mengompresi Foto Lapangan...</span>
            <span className="block text-xs text-violet-700 dark:text-violet-300 font-medium">
              Mengoptimalkan ukuran gambar agar unggahan instan & hemat kuota
            </span>
          </div>
        </div>
      ) : value ? (
        <div className="space-y-2">
          <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-slate-900 group">
            <img
              src={value}
              alt="Preview Foto"
              className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />

            {/* Top Quick Actions */}
            <div className="absolute top-3 right-3 flex items-center gap-2">
              {allowAnnotation && (
                <button
                  type="button"
                  onClick={() => setShowAnnotator(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-lg active:scale-95 transition-all"
                  title="Beri Tanda Panah, Lingkaran & Teks"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit / Beri Tanda</span>
                </button>
              )}
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
              <div className="flex flex-col gap-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600/90 backdrop-blur-md text-white text-xs font-bold rounded-lg shadow-md w-fit">
                  <Check className="w-4 h-4" /> Foto Terlampir & Siap
                </span>
                {stats && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-black/60 backdrop-blur-md text-violet-300 text-[11px] font-mono rounded-md">
                    <Sparkles className="w-3 h-3" /> Ukuran: {stats.comp} ({stats.ratio}% lebih hemat)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {allowAnnotation && (
                  <button
                    type="button"
                    onClick={() => setShowAnnotator(true)}
                    className="inline-flex items-center justify-center p-2.5 bg-violet-600/90 hover:bg-violet-500 text-white rounded-xl active:scale-95 transition-all shadow-md min-h-[44px] min-w-[44px]"
                    title="Edit dan Tambahkan Tanda"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="inline-flex items-center justify-center p-2.5 bg-red-600/90 text-white rounded-xl hover:bg-red-700 active:scale-95 transition-all shadow-md min-h-[44px] min-w-[44px]"
                  title="Hapus foto"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Modal Editor Anotasi Gambar */}
          {allowAnnotation && showAnnotator && (
            <ImageAnnotatorModal
              imageUrl={value}
              isOpen={showAnnotator}
              onClose={() => setShowAnnotator(false)}
              onSave={handleSaveAnnotation}
            />
          )}
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "p-3 rounded-2xl border-2 border-dashed transition-all space-y-3",
            isDragging
              ? "border-violet-500 bg-violet-100/70 dark:bg-violet-950/60 scale-[1.01]"
              : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40"
          )}
        >
          {/* Options Grid: Camera, File, Paste */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Direct Camera Button */}
            <label className="relative flex flex-col items-center justify-center gap-2 p-4 min-h-[110px] rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/80 hover:bg-blue-100 hover:border-blue-400 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 cursor-pointer active:scale-98 transition-all">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="sr-only"
              />
              <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md">
                <Camera className="w-5 h-5" />
              </div>
              <div className="text-center">
                <span className="block text-xs font-bold text-blue-900 dark:text-blue-200">
                  Ambil Kamera
                </span>
                <span className="block text-[10px] text-blue-700 dark:text-blue-300 font-medium">
                  Kamera HP / Webcam
                </span>
              </div>
            </label>

            {/* File Upload Button */}
            <label className="relative flex flex-col items-center justify-center gap-2 p-4 min-h-[110px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-100 hover:border-slate-400 dark:bg-slate-800/80 dark:hover:bg-slate-800 cursor-pointer active:scale-98 transition-all">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="sr-only"
              />
              <div className="p-2.5 bg-slate-700 text-white rounded-xl shadow-md dark:bg-slate-600">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-center">
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Pilih dari Galeri
                </span>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                  Upload File Gambar
                </span>
              </div>
            </label>

            {/* Clipboard / Screenshot Paste Button */}
            <button
              type="button"
              onClick={handlePasteButtonClick}
              className="relative flex flex-col items-center justify-center gap-2 p-4 min-h-[110px] rounded-2xl border border-violet-200 dark:border-violet-900/60 bg-violet-50/80 hover:bg-violet-100 hover:border-violet-400 dark:bg-violet-950/40 dark:hover:bg-violet-900/60 cursor-pointer active:scale-98 transition-all text-left"
              title="Tempel screenshot dari clipboard atau tekan Ctrl+V"
            >
              <div className="p-2.5 bg-violet-600 text-white rounded-xl shadow-md">
                <ClipboardPaste className="w-5 h-5" />
              </div>
              <div className="text-center">
                <span className="block text-xs font-bold text-violet-900 dark:text-violet-200">
                  Paste Screenshot
                </span>
                <span className="block text-[10px] text-violet-700 dark:text-violet-300 font-medium">
                  Clipboard (Ctrl + V)
                </span>
              </div>
            </button>
          </div>

          {/* Quick Tip & Drag Indicator */}
          <div className="flex items-center justify-center gap-2 py-1 px-3 text-center">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              💡 <strong>Tips Cepat:</strong> Anda juga bisa langsung tekan shortcut{" "}
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-700 rounded text-slate-800 dark:text-slate-200">
                Ctrl + V
              </kbd>{" "}
              (atau{" "}
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-700 rounded text-slate-800 dark:text-slate-200">
                Cmd + V
              </kbd>
              ) di halaman ini untuk menempelkan screenshot, atau drag & drop file ke sini.
            </span>
          </div>

          {/* Optional notice if clipboard read has guidance */}
          {pasteNotice && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs rounded-xl animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="flex-1">
                <span>{pasteNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setPasteNotice(null)}
                className="text-amber-700 hover:text-amber-900 dark:text-amber-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
