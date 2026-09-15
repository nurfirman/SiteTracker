"use client";

import React, { useState, useRef } from "react";
import {
  Camera,
  Upload,
  X,
  Loader2,
  Edit3,
  ClipboardPaste,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "../lib/utils";
import { ImageAnnotatorModal } from "./ImageAnnotatorModal";

interface MultiPhotoUploaderProps {
  label?: string;
  description?: string;
  values: string[];
  onChange: (urls: string[]) => void;
  maxPhotos?: number;
  required?: boolean;
  className?: string;
  allowAnnotation?: boolean;
}

// Client-side image compression function using HTML5 Canvas
async function compressImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.75
): Promise<{ dataUrl: string; originalSize: number; compressedSize: number }> {
  return new Promise((resolve, reject) => {
    const originalSize = file.size;
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

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

export function MultiPhotoUploader({
  label = "Foto Temuan",
  description,
  values = [],
  onChange,
  maxPhotos = 4,
  required = false,
  className,
  allowAnnotation = true,
}: MultiPhotoUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [activeAnnotateIndex, setActiveAnnotateIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const remainingSlots = Math.max(0, maxPhotos - values.length);

  // Process a single file or multiple files
  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;
    if (values.length >= maxPhotos) {
      setPasteNotice(`Batas maksimal ${maxPhotos} foto telah tercapai.`);
      return;
    }

    setLoading(true);
    setPasteNotice(null);

    try {
      const allowedFiles = files.slice(0, remainingSlots);
      const newUrls: string[] = [];

      for (const file of allowedFiles) {
        if (!file.type.startsWith("image/")) continue;
        const compressed = await compressImage(file, 1200, 1200, 0.75);
        newUrls.push(compressed.dataUrl);
      }

      if (newUrls.length > 0) {
        onChange([...values, ...newUrls].slice(0, maxPhotos));
      }
    } catch (err) {
      console.error("Gagal mengompresi foto:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    await processFiles(files);
    e.target.value = "";
  };

  const handleCameraChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    await processFiles(files);
    e.target.value = "";
  };

  // Clipboard paste listener
  const handlePasteButtonClick = async () => {
    setPasteNotice(null);
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        setPasteNotice("Tekan Ctrl+V (atau Cmd+V) di keyboard untuk menempelkan screenshot.");
        return;
      }

      const clipboardItems = await navigator.clipboard.read();
      const files: File[] = [];

      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          files.push(
            new File(
              [blob],
              `screenshot-${Date.now()}.${imageType.split("/")[1] || "png"}`,
              { type: imageType }
            )
          );
        }
      }

      if (files.length > 0) {
        await processFiles(files);
      } else {
        setPasteNotice(
          "Tidak ada gambar di clipboard. Ambil screenshot dahulu (Win+Shift+S / Cmd+Shift+4), lalu klik tombol ini atau tekan Ctrl+V."
        );
      }
    } catch {
      setPasteNotice(
        "Akses langsung clipboard dibatasi browser. Silakan langsung tekan Ctrl+V di halaman ini."
      );
    }
  };

  const removePhoto = (indexToRemove: number) => {
    const updated = values.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  const handleSaveAnnotation = (annotatedUrl: string) => {
    if (activeAnnotateIndex === null) return;
    const updated = [...values];
    updated[activeAnnotateIndex] = annotatedUrl;
    onChange(updated);
    setActiveAnnotateIndex(null);
  };

  // Drag & drop
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
    const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    await processFiles(files);
  };

  return (
    <div className={cn("space-y-2", className)} ref={containerRef}>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
          {label} {required && <span className="text-red-500">*</span>}
          <span className="ml-1.5 text-[11px] font-normal text-slate-500">
            ({values.length}/{maxPhotos} Foto)
          </span>
        </label>
        {values.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[11px] font-semibold text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Hapus Semua
          </button>
        )}
      </div>

      {description && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">{description}</p>
      )}

      {/* Grid foto yang telah diupload */}
      {values.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {values.map((photoUrl, idx) => (
            <div
              key={idx}
              className="relative group rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-900 aspect-4/3"
            >
              <img
                src={photoUrl}
                alt={`Foto ${idx + 1}`}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 pointer-events-none" />

              {/* Badge Nomor Urut */}
              <div className="absolute top-1.5 left-1.5">
                <span
                  className={cn(
                    "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-sm",
                    idx === 0 ? "bg-violet-600" : "bg-slate-700/90"
                  )}
                >
                  {idx === 0 ? "Foto 1 (Utama)" : `Foto ${idx + 1}`}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                {allowAnnotation && (
                  <button
                    type="button"
                    onClick={() => setActiveAnnotateIndex(idx)}
                    className="p-1 bg-amber-500 text-slate-950 rounded hover:bg-amber-400 shadow transition-colors"
                    title="Beri Tanda / Anotasi"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="p-1 bg-red-600 text-white rounded hover:bg-red-700 shadow transition-colors"
                  title="Hapus foto ini"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          {/* Slot Tambah Foto Jika Kurang Dari Max */}
          {values.length < maxPhotos && (
            <div className="aspect-4/3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 flex flex-col items-center justify-center gap-1 p-2 text-center">
              <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full hover:text-violet-600 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileInputChange}
                  className="sr-only"
                />
                <Plus className="w-5 h-5 text-slate-400 hover:text-violet-600" />
                <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 mt-1">
                  + Tambah Foto
                </span>
                <span className="text-[9px] text-slate-400">
                  (Sisa {remainingSlots})
                </span>
              </label>
            </div>
          )}
        </div>
      )}

      {/* Area Upload Baru (Jika belum ada foto sama sekali) */}
      {values.length === 0 && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "p-3 rounded-2xl border-2 border-dashed transition-all space-y-2",
            isDragging
              ? "border-violet-500 bg-violet-100/70 dark:bg-violet-950/60 scale-[1.01]"
              : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40"
          )}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border border-dashed border-violet-400 bg-violet-50/60 text-violet-800 dark:text-violet-200">
              <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
              <span className="text-xs font-bold">Mengompresi Foto Lapangan...</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {/* Direct Camera */}
              <label className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-950/40 cursor-pointer active:scale-98 transition-all">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleCameraChange}
                  className="sr-only"
                />
                <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
                  <Camera className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-blue-900 dark:text-blue-200">
                  Kamera HP
                </span>
              </label>

              {/* Gallery / Multiple Upload */}
              <label className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-100 dark:bg-slate-800 cursor-pointer active:scale-98 transition-all">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileInputChange}
                  className="sr-only"
                />
                <div className="p-2 bg-slate-700 text-white rounded-lg shadow-sm dark:bg-slate-600">
                  <Upload className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  Galeri (1-4 Foto)
                </span>
              </label>

              {/* Paste Screenshot */}
              <button
                type="button"
                onClick={handlePasteButtonClick}
                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-violet-200 dark:border-violet-900/60 bg-violet-50/80 hover:bg-violet-100 dark:bg-violet-950/40 cursor-pointer active:scale-98 transition-all"
              >
                <div className="p-2 bg-violet-600 text-white rounded-lg shadow-sm">
                  <ClipboardPaste className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-violet-900 dark:text-violet-200">
                  Paste (Ctrl+V)
                </span>
              </button>
            </div>
          )}

          <p className="text-[10px] text-center text-slate-500 dark:text-slate-400">
            Dapat memilih langsung hingga 4 foto sekaligus dari galeri atau kamera
          </p>
        </div>
      )}

      {/* Notice alert jika ada pesan */}
      {pasteNotice && (
        <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs rounded-lg animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <span className="flex-1 text-[11px]">{pasteNotice}</span>
          <button
            type="button"
            onClick={() => setPasteNotice(null)}
            className="text-amber-700 hover:text-amber-900"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Modal Editor Anotasi Gambar */}
      {allowAnnotation && activeAnnotateIndex !== null && values[activeAnnotateIndex] && (
        <ImageAnnotatorModal
          imageUrl={values[activeAnnotateIndex]}
          isOpen={activeAnnotateIndex !== null}
          onClose={() => setActiveAnnotateIndex(null)}
          onSave={handleSaveAnnotation}
        />
      )}
    </div>
  );
}
