"use client";

import React from "react";
import { Category, CATEGORY_LABELS } from "../types";
import { ShieldAlert, BadgeCheck, Sparkles, CalendarClock, PackageX } from "lucide-react";
import { cn } from "../lib/utils";

interface CategoryBadgeProps {
  category: Category;
  className?: string;
  showIcon?: boolean;
}

export function CategoryBadge({ category, className, showIcon = true }: CategoryBadgeProps) {
  const info = CATEGORY_LABELS[category] || {
    label: category,
    icon: "ShieldAlert",
  };

  const getIcon = () => {
    switch (category) {
      case "K3_SAFETY":
        return <ShieldAlert size={16} className="text-red-600 dark:text-red-400" />;
      case "QUALITY":
        return <BadgeCheck size={16} className="text-blue-600 dark:text-blue-400" />;
      case "KEBERSIHAN_5R":
        return <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400" />;
      case "SCHEDULE":
        return <CalendarClock size={16} className="text-amber-600 dark:text-amber-400" />;
      case "MATERIAL":
        return <PackageX size={16} className="text-purple-600 dark:text-purple-400" />;
      default:
        return <ShieldAlert size={16} />;
    }
  };


  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
        className
      )}
    >
      {showIcon && getIcon()}
      <span>{info.label}</span>
    </span>
  );
}
