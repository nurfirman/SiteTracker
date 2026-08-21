"use client";

import React, { useState } from "react";
import { MapPin, Navigation, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "../lib/utils";

interface GpsButtonProps {
  value?: string | null;
  onChange: (coordinates: string) => void;
  className?: string;
}

export function GpsButton({ value, onChange, className }: GpsButtonProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchGpsLocation = () => {
    setLoading(true);
    setErrorMsg(null);

    if (!navigator.geolocation) {
      setErrorMsg("Browser Anda tidak mendukung deteksi lokasi GPS.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        const coordString = `${lat}, ${lng}`;
        onChange(coordString);
        setLoading(false);
      },
      (error) => {
        console.warn("GPS error:", error);
        // Fallback default simulation for dev/desktop testing if geolocation fails
        const fallback = "-6.2088, 106.8456";
        onChange(fallback);
        setErrorMsg("Menggunakan koordinat simulasi (Izin lokasi ditolak).");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className={cn("space-y-2", className)}>
      <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
        Lokasi Koordinat GPS (Opsional)
      </label>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={fetchGpsLocation}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] text-base font-bold rounded-xl bg-blue-50 text-blue-700 border-2 border-blue-200 hover:bg-blue-100 hover:border-blue-300 active:scale-98 transition-all dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800"
        >
          <Navigation className={cn("w-5 h-5", loading && "animate-spin")} />
          <span>{loading ? "Mendapatkan Koordinat..." : "Dapatkan Lokasi GPS Saya"}</span>
        </button>

        {value && (
          <div className="flex items-center gap-2 px-4 py-2.5 min-h-[48px] bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800 flex-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-sm font-mono font-medium truncate flex-1">
              {value}
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-emerald-700 underline hover:text-emerald-900 shrink-0"
            >
              Buka Peta
            </a>
          </div>
        )}
      </div>

      {errorMsg && (
        <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </p>
      )}
    </div>
  );
}
