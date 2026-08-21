"use client";

import React from "react";
import { Finding } from "../types";
import { StatusBadge } from "./StatusBadge";
import { CategoryBadge } from "./CategoryBadge";
import { formatDate } from "../lib/utils";
import { MapPin, UserCheck, Calendar, Eye, ArrowRight, CheckSquare } from "lucide-react";
import Link from "next/link";

interface FindingCardProps {
  finding: Finding;
  onOpenSideBySide?: (finding: Finding) => void;
  onQuickResolve?: (finding: Finding) => void;
  currentUserRole?: string;
}

export function FindingCard({
  finding,
  onOpenSideBySide,
  onQuickResolve,
  currentUserRole,
}: FindingCardProps) {
  return (
    <div className="group relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between">
      {/* Header Card */}
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="px-3 py-1 bg-slate-900 text-white font-mono text-xs font-bold rounded-lg tracking-wider">
            {finding.ticketCode}
          </span>
          <StatusBadge status={finding.status} size="sm" />
        </div>

        <div className="flex items-center gap-2">
          <CategoryBadge category={finding.category} />
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-blue-600 transition-colors">
            {finding.description}
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <MapPin size={16} className="text-red-500 shrink-0" />
            <span className="truncate">{finding.locationDetail}</span>
          </p>
        </div>

        {/* Thumbnail Image Comparison Preview */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 h-44 mt-2">
          <img
            src={finding.photoFindingUrl}
            alt="Foto Temuan"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {finding.photoResolutionUrl && (
            <div className="absolute top-2 right-2 px-2.5 py-1 bg-emerald-600/90 text-white text-xs font-extrabold rounded-lg backdrop-blur-md shadow-md">
              ✓ Ada Bukti Perbaikan
            </div>
          )}
          {finding.project && (
            <div className="absolute bottom-2 left-2 right-2 px-3 py-1.5 bg-black/60 backdrop-blur-md text-white text-xs font-semibold rounded-xl truncate">
              {finding.project.name}
            </div>
          )}
        </div>

        {/* Metadata Footer */}
        <div className="pt-2 flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1">
              <Calendar size={13} /> {formatDate(finding.createdAt)}
            </span>
            <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
              <UserCheck size={13} className="text-blue-500" /> PIC: {finding.pic?.name.split(" ")[0] || "PIC"}
            </span>
          </div>
        </div>
      </div>

      {/* Card Action Buttons */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex gap-2">
        {onOpenSideBySide && (
          <button
            onClick={() => onOpenSideBySide(finding)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] text-xs font-extrabold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-xs transition-all dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:hover:bg-slate-700"
          >
            <Eye size={16} />
            <span>Lihat Foto Perbandingan</span>
          </button>
        )}

        {currentUserRole === "PIC" && finding.status === "OPEN" && onQuickResolve && (
          <button
            onClick={() => onQuickResolve(finding)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] text-xs font-extrabold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition-all active:scale-95"
          >
            <CheckSquare size={16} />
            <span>Tindak Lanjuti</span>
          </button>
        )}

        <Link
          href={`/findings/${finding.id}`}
          className="inline-flex items-center justify-center p-2.5 min-h-[44px] text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all dark:text-slate-300 dark:hover:bg-slate-700"
          title="Buka Detail Lengkap"
        >
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}
