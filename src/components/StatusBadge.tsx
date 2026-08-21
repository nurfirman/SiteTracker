"use client";

import React from "react";
import { FindingStatus } from "../types";
import { getStatusDetails, cn } from "../lib/utils";
import { AlertCircle, Clock, CheckCircle2 } from "lucide-react";

interface StatusBadgeProps {
  status: FindingStatus;
  size?: "sm" | "md" | "lg";
  showDescription?: boolean;
  className?: string;
}

export function StatusBadge({ status, size = "md", showDescription = false, className }: StatusBadgeProps) {
  const details = getStatusDetails(status);

  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs font-semibold rounded-md gap-1.5",
    md: "px-3 py-1.5 text-sm font-bold rounded-lg gap-2 min-h-[36px]",
    lg: "px-4 py-2 text-base font-extrabold rounded-xl gap-2.5 min-h-[48px]",
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22,
  };

  const IconComponent =
    status === "OPEN" ? AlertCircle : status === "RESOLVED" ? Clock : CheckCircle2;

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <span
        className={cn(
          "inline-flex items-center border shadow-xs tracking-wide transition-all",
          sizeClasses[size],
          details.badgeClass,
          className
        )}
      >
        <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", details.dotClass)} />
        <IconComponent size={iconSizes[size]} className="shrink-0" />
        <span>{details.shortLabel}</span>
      </span>
      {showDescription && (
        <span className="text-xs text-gray-600 dark:text-gray-400 font-normal">
          {details.description}
        </span>
      )}
    </div>
  );
}
