"use client";

import React, { useState, useRef, useEffect } from "react";
import { Project } from "@/types";
import { Search, ChevronDown, Check, Building2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectComboboxProps {
  projects: Project[];
  value: string;
  onChange: (projectId: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function ProjectCombobox({
  projects,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = "-- Pilih / Cari Proyek Konstruksi --",
  className,
}: ProjectComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedProject = projects.find((p) => p.id === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const codeMatch = p.code?.toLowerCase().includes(q) || false;
    const nameMatch = p.name.toLowerCase().includes(q);
    const divMatch = p.division?.toLowerCase().includes(q) || false;
    return codeMatch || nameMatch || divMatch;
  });

  return (
    <div ref={dropdownRef} className={cn("relative w-full", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-4 py-3.5 min-h-[48px] text-left text-sm font-semibold rounded-2xl border-2 transition-all flex items-center justify-between gap-2 shadow-xs",
          isOpen
            ? "border-violet-500 bg-white dark:bg-slate-800 ring-2 ring-violet-500/20"
            : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600",
          disabled && "opacity-50 cursor-not-allowed",
          selectedProject ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"
        )}
      >
        <div className="flex items-center gap-2.5 truncate min-w-0">
          <Building2 size={18} className="text-violet-600 dark:text-violet-400 shrink-0" />
          {selectedProject ? (
            <span className="truncate font-bold">
              {selectedProject.code ? (
                <span className="text-violet-600 dark:text-violet-400 font-mono mr-1.5">
                  [{selectedProject.code}]
                </span>
              ) : null}
              {selectedProject.name}
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
        </div>
        <ChevronDown
          size={18}
          className={cn(
            "text-slate-400 shrink-0 transition-transform duration-200",
            isOpen && "rotate-180 text-violet-600"
          )}
        />
      </button>

      {/* Hidden input for HTML form validation if required */}
      {required && (
        <input
          type="text"
          value={value}
          onChange={() => {}}
          required
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}

      {/* Popover / Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 max-h-80 flex flex-col">
          {/* Search Box Header */}
          <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik kode (PRJ-...) atau nama proyek..."
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-violet-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* List of Projects */}
          <div className="overflow-y-auto p-1.5 space-y-1 divide-y divide-slate-100 dark:divide-slate-800/60 max-h-60">
            {filteredProjects.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 font-medium">
                Tidak ada proyek yang sesuai dengan pencarian "{searchQuery}"
              </div>
            ) : (
              filteredProjects.map((p) => {
                const isSelected = p.id === value;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onChange(p.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between gap-2 group",
                      isSelected
                        ? "bg-violet-600 text-white font-bold"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                    )}
                  >
                    <div className="truncate min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        {p.code && (
                          <span
                            className={cn(
                              "font-mono font-black px-1.5 py-0.5 rounded text-[10px]",
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300"
                            )}
                          >
                            [{p.code}]
                          </span>
                        )}
                        <span className="truncate font-semibold">{p.name}</span>
                      </div>
                      <p
                        className={cn(
                          "text-[10px] mt-0.5 truncate",
                          isSelected ? "text-violet-100" : "text-slate-400 dark:text-slate-500"
                        )}
                      >
                        {p.location} {p.division ? `• ${p.division}` : ""}
                      </p>
                    </div>

                    {isSelected && <Check size={16} className="text-white shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
