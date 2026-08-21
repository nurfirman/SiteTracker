import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { FindingStatus } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "-";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date) + " WIB";
}

export function generateTicketCode(existingCount: number = 0): string {
  const year = new Date().getFullYear();
  const sequence = String(existingCount + 1).padStart(3, "0");
  return `CMD-${year}-${sequence}`;
}

export function getStatusDetails(status: FindingStatus) {
  switch (status) {
    case "OPEN":
      return {
        label: "Open (Temuan Baru)",
        shortLabel: "Open",
        badgeClass: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800",
        dotClass: "bg-red-500 animate-pulse",
        iconName: "AlertCircle",
        description: "Temuan belum ditangani oleh PIC",
      };
    case "RESOLVED":
      return {
        label: "Resolved (Menunggu Verifikasi PM)",
        shortLabel: "Resolved",
        badgeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
        dotClass: "bg-amber-500",
        iconName: "Clock",
        description: "PIC telah mengirimkan perbaikan, menunggu persetujuan PM",
      };
    case "CLOSED":
      return {
        label: "Closed (Selesai & Diverifikasi)",
        shortLabel: "Closed",
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
        dotClass: "bg-emerald-500",
        iconName: "CheckCircle2",
        description: "Temuan tuntas dan telah disetujui PM",
      };
    default:
      return {
        label: status,
        shortLabel: status,
        badgeClass: "bg-gray-100 text-gray-800 border-gray-300",
        dotClass: "bg-gray-400",
        iconName: "HelpCircle",
        description: "",
      };
  }
}
