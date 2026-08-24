export type Role = "CMD" | "PIC" | "SM" | "PM" | "BOD" | "ADMIN";

export type Category = 
  | "K3_SAFETY" 
  | "QUALITY" 
  | "KEBERSIHAN_5R" 
  | "SCHEDULE" 
  | "MATERIAL";

export type FindingStatus = "OPEN" | "RESOLVED" | "CLOSED";

export interface Project {
  id: string;
  name: string;
  location: string;
  createdAt: string | Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phoneNumber: string;
  password?: string;
  projectId?: string | null;
  projectIds?: string[];
  project?: Project | null;
}

export interface Finding {
  id: string;
  ticketCode: string;
  projectId: string;
  project?: Project;
  picId: string;
  pic?: User;
  reporterId: string;
  reporter?: User;
  locationDetail: string;
  coordinates?: string | null;
  category: Category;
  description: string;
  photoFindingUrl: string;
  status: FindingStatus;
  picResponse?: string | null;
  photoResolutionUrl?: string | null;
  rejectionNote?: string | null;
  createdAt: string | Date;
  dueDate?: string | Date | null;
  resolvedAt?: string | Date | null;
  closedAt?: string | Date | null;
}

export const CATEGORY_LABELS: Record<Category, { label: string; icon: string; description: string }> = {
  K3_SAFETY: {
    label: "K3 / Keselamatan",
    icon: "ShieldAlert",
    description: "Isu keselamatan kerja, APD, barikade, kelistrikan, & bahaya kerja.",
  },
  QUALITY: {
    label: "Kualitas Pekerjaan",
    icon: "BadgeCheck",
    description: "Cacat fisik, penyimpangan gambar teknis, retak, coring, pemasangan.",
  },
  KEBERSIHAN_5R: {
    label: "Kebersihan 5R",
    icon: "Sparkles",
    description: "Sampah material, lokasi kumuh, sisa bahan, kerapian area patroli.",
  },
  SCHEDULE: {
    label: "Jadwal & Progres",
    icon: "CalendarClock",
    description: "Keterlambatan tahapan kerja, minim pekerja, kemacetan alat berat.",
  },
  MATERIAL: {
    label: "Material & Logistik",
    icon: "PackageWarning",
    description: "Material rusak, penyimpanan basah, kekurangan stok bahan bangunan.",
  },
};

export const ROLE_LABELS: Record<Role, { label: string; badgeClass: string; description: string }> = {
  CMD: {
    label: "Tim CMD / Patrol Inspector",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200",
    description: "Akses Semua Kasus: Patroli lapangan, catat temuan baru, dan audit kepatuhan.",
  },
  PIC: {
    label: "PIC Proyek (Subkon / Site Eng)",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/40 dark:text-purple-200",
    description: "Akses Terisolasi Khusus Proyek Sendiri: Hanya dapat melihat & merespon tugas proyeknya.",
  },
  SM: {
    label: "Site Manager (SM)",
    badgeClass: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/40 dark:text-teal-200",
    description: "Akses Multi-Proyek Lapangan: Mengawasi & mengkoordinasikan PIC di beberapa site proyek.",
  },
  PM: {
    label: "Project Manager (PM)",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200",
    description: "Akses Multi-Proyek: Evaluasi SLA, memvalidasi dan menyetujui penutupan temuan.",
  },
  BOD: {
    label: "Board of Directors (BOD)",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200",
    description: "Akses Semua Kasus: Pemantau makro eksekutif, KPI kepatuhan seluruh proyek.",
  },
  ADMIN: {
    label: "Administrator Sistem",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
    description: "Pengelola Master Proyek, Penugasan PIC/SM/PM, dan Konfigurasi Matriks.",
  },
};

