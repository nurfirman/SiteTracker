"use client";

import React, { useState } from "react";
import { Camera, Upload, X, Check, Loader2, Sparkles } from "lucide-react";
import { cn } from "../lib/utils";

interface PhotoUploaderProps {
  label: string;
  description?: string;
  value?: string | null;
  onChange: (url: string) => void;
  required?: boolean;
  className?: string;
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
}: PhotoUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ orig: string; comp: string; ratio: number } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

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

  const clearPhoto = () => {
    onChange("");
    setStats(null);
  };

  return (
    <div className={cn("space-y-2", className)}>
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
        <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-slate-900 group">
          <img
            src={value}
            alt="Preview Foto"
            className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Direct Camera Button */}
          <label className="relative flex flex-col items-center justify-center gap-2 p-4 min-h-[100px] rounded-2xl border-2 border-dashed border-blue-400 bg-blue-50/80 hover:bg-blue-100 hover:border-blue-500 dark:bg-blue-950/50 dark:border-blue-800 dark:hover:bg-blue-900/70 cursor-pointer active:scale-98 transition-all">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="sr-only"
            />
            <div className="p-3 bg-blue-600 text-white rounded-full shadow-md">
              <Camera className="w-6 h-6" />
            </div>
            <div className="text-center">
              <span className="block text-sm font-bold text-blue-900 dark:text-blue-200">
                Ambil Foto Kamera
              </span>
              <span className="block text-xs text-blue-700 dark:text-blue-300 font-medium">
                Kamera HP (Otomatis Kompres)
              </span>
            </div>
          </label>

          {/* File Upload Button */}
          <label className="relative flex flex-col items-center justify-center gap-2 p-4 min-h-[100px] rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400 dark:bg-slate-800/60 dark:border-slate-700 dark:hover:bg-slate-800 cursor-pointer active:scale-98 transition-all">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="sr-only"
            />
            <div className="p-3 bg-slate-700 text-white rounded-full shadow-md dark:bg-slate-600">
              <Upload className="w-6 h-6" />
            </div>
            <div className="text-center">
              <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                Pilih dari Galeri
              </span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">
                Upload File Gambar
              </span>
            </div>
          </label>
        </div>
      )}
    </div>
  );
}
