import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { FindingStatus } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Mendapatkan Base URL aplikasi secara dinamis (mendukung localhost, Vercel preview/production, dan custom domain)
 */
export function getAppBaseUrl(): string {
  // 1. Custom URL dari environment variable
  if (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.trim() !== "") {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, "");
  }
  // 2. Vercel Production Custom Domain / Aliases
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, "")}`;
  }
  // 3. Vercel Branch / Preview URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  // 4. Browser window context fallback
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  // 5. Default local dev
  return "http://localhost:3000";
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
  const randomSuffix = Math.floor(100 + Math.random() * 900); // 3-digit random number to prevent race conditions
  return `CMD-${year}-${sequence}-${randomSuffix}`;
}

export function calculateDueDate(category: string, createdAtDate: Date = new Date()): Date {
  const due = new Date(createdAtDate.getTime());
  // K3 Safety has strict 24-hour SLA; Quality & others get 48 hours
  if (category === "K3_SAFETY") {
    due.setHours(due.getHours() + 24);
  } else {
    due.setHours(due.getHours() + 48);
  }
  return due;
}

export function getSlaStatus(dueDateInput?: string | Date | null, status?: string) {
  if (!dueDateInput || status === "CLOSED") {
    return { label: "SLA OK", isOverdue: false, badgeClass: "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300" };
  }

  const dueDate = typeof dueDateInput === "string" ? new Date(dueDateInput) : dueDateInput;
  const now = new Date();
  const diffHours = Math.round((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));

  if (diffHours < 0) {
    return {
      label: `OVERDUE (${Math.abs(diffHours)}j lalu)`,
      isOverdue: true,
      badgeClass: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/80 dark:text-red-300 animate-pulse",
    };
  } else if (diffHours <= 12) {
    return {
      label: `SLA < ${diffHours}j lagi`,
      isOverdue: false,
      badgeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300",
    };
  } else {
    return {
      label: `SLA ${diffHours}j lagi`,
      isOverdue: false,
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300",
    };
  }
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

export function exportFindingsToCsv(findings: any[], filename = "rekap_temuan_sitetracker.csv") {
  const headers = [
    "Kode Tiket",
    "Proyek",
    "Kategori",
    "Lokasi Spesifik",
    "Deskripsi Temuan",
    "PIC Penanggung Jawab",
    "Pelapor (CMD)",
    "Status",
    "Tanggal Dibuat",
    "Due Date SLA",
    "Respon PIC",
    "Tanggal Selesai",
    "Catatan Rejection PM"
  ];

  const escapeCsv = (str: any) => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = findings.map((f) => [
    escapeCsv(f.ticketCode),
    escapeCsv(f.project?.name || f.projectId),
    escapeCsv(f.category),
    escapeCsv(f.locationDetail),
    escapeCsv(f.description),
    escapeCsv(f.pic?.name || f.picId),
    escapeCsv(f.reporter?.name || f.reporterId),
    escapeCsv(f.status),
    escapeCsv(f.createdAt),
    escapeCsv(f.dueDate),
    escapeCsv(f.picResponse),
    escapeCsv(f.resolvedAt),
    escapeCsv(f.rejectionNote)
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((r) => r.join(","))
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
