"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-slate-200/80 dark:bg-slate-800/80",
        className
      )}
      {...props}
    />
  );
}

/**
 * Skeleton Loader khusus untuk Card Temuan (FindingCard)
 */
export function FindingCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs overflow-hidden flex flex-col justify-between animate-pulse">
      <div className="space-y-3">
        {/* Header: Ticket Code & Status Pill */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24 rounded-lg" />
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-lg" />
          </div>
        </div>

        {/* Category Pill */}
        <Skeleton className="h-6 w-28 rounded-lg" />

        {/* Description & Location */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-3/4 rounded-md" />
          <Skeleton className="h-3 w-1/2 rounded-md mt-1" />
        </div>

        {/* Image Thumbnail Placeholder */}
        <Skeleton className="h-44 w-full rounded-2xl" />

        {/* Meta Info */}
        <div className="pt-2 flex justify-between items-center">
          <Skeleton className="h-3 w-24 rounded-md" />
          <Skeleton className="h-3 w-20 rounded-md" />
        </div>
      </div>

      {/* Footer Action Buttons */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
      </div>
    </div>
  );
}

/**
 * Skeleton Grid untuk Dashboard & Halaman Temuan
 */
export function FindingCardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <FindingCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton Loader untuk Baris Tabel (Reports & Admin)
 */
export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr className="animate-pulse border-b border-slate-200 dark:border-slate-800">
      {Array.from({ length: cols }).map((_, idx) => (
        <td key={idx} className="p-3.5">
          <Skeleton className="h-4 w-full max-w-[120px] rounded-md" />
        </td>
      ))}
    </tr>
  );
}

/**
 * Skeleton Loader untuk Summary Metrics Cards
 */
export function MetricsCardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-28 rounded-md" />
            <Skeleton className="h-10 w-10 rounded-2xl" />
          </div>
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-3 w-3/4 rounded-md" />
        </div>
      ))}
    </div>
  );
}
