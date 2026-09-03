"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTheme, Theme } from "./ThemeContext";
import { Sun, Moon, Laptop, Check } from "lucide-react";

export function ThemeToggle({
  variant = "button",
  className = "",
}: {
  variant?: "button" | "dropdown" | "pill";
  className?: string;
}) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (variant === "button") {
    return (
      <button
        onClick={toggleTheme}
        className={`relative inline-flex items-center justify-center p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/50 active:scale-95 group shadow-xs ${className}`}
        title={resolvedTheme === "dark" ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
        aria-label="Toggle Dark/Light Mode"
      >
        <span className="sr-only">Toggle theme</span>
        {resolvedTheme === "dark" ? (
          <Sun className="h-4 w-4 text-violet-400 transition-transform duration-300 group-hover:rotate-45" />
        ) : (
          <Moon className="h-4 w-4 text-violet-700 transition-transform duration-300 group-hover:-rotate-12" />
        )}
      </button>
    );
  }

  if (variant === "pill") {
    return (
      <div className={`inline-flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ${className}`}>
        <button
          onClick={() => setTheme("light")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
            theme === "light"
              ? "bg-violet-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200"
          }`}
          title="Mode Terang"
        >
          <Sun size={13} />
          <span className="hidden sm:inline">Terang</span>
        </button>
        <button
          onClick={() => setTheme("dark")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
            theme === "dark"
              ? "bg-violet-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200"
          }`}
          title="Mode Gelap"
        >
          <Moon size={13} />
          <span className="hidden sm:inline">Gelap</span>
        </button>
        <button
          onClick={() => setTheme("system")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
            theme === "system"
              ? "bg-violet-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200"
          }`}
          title="Otomatis (Sistem)"
        >
          <Laptop size={13} />
          <span className="hidden sm:inline">Sistem</span>
        </button>
      </div>
    );
  }

  // Dropdown variant
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-all text-xs font-bold shadow-xs"
        title="Pilih Tema Tampilan"
      >
        {resolvedTheme === "dark" ? (
          <Moon size={14} className="text-violet-400" />
        ) : (
          <Sun size={14} className="text-violet-600" />
        )}
        <span className="capitalize">{theme === "system" ? "Sistem" : theme === "dark" ? "Gelap" : "Terang"}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
          <button
            onClick={() => {
              setTheme("light");
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              theme === "light"
                ? "bg-violet-600 text-white font-bold"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <Sun size={14} className={theme === "light" ? "text-white" : "text-violet-600"} />
              <span>Terang</span>
            </div>
            {theme === "light" && <Check size={13} />}
          </button>

          <button
            onClick={() => {
              setTheme("dark");
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              theme === "dark"
                ? "bg-violet-600 text-white font-bold"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <Moon size={14} className={theme === "dark" ? "text-white" : "text-violet-400"} />
              <span>Gelap</span>
            </div>
            {theme === "dark" && <Check size={13} />}
          </button>

          <button
            onClick={() => {
              setTheme("system");
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              theme === "system"
                ? "bg-violet-600 text-white font-bold"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <Laptop size={14} className={theme === "system" ? "text-white" : "text-slate-600 dark:text-slate-400"} />
              <span>Sistem</span>
            </div>
            {theme === "system" && <Check size={13} />}
          </button>
        </div>
      )}
    </div>
  );
}
