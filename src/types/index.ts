export type Role = "CMD" | "PIC" | "SM" | "PM" | "GM" | "BOD" | "ADMIN" | "PENDING";

export type Category = 
  | "K3_SAFETY" 
  | "QUALITY" 
  | "KEBERSIHAN_5R" 
  | "SCHEDULE" 
  | "MATERIAL";

export type FindingStatus = "OPEN" | "RESOLVED" | "CLOSED";

export interface Project {
  id: string;
  code?: string | null;
  name: string;
  location: string;
  division?: string | null;
  pmId?: string | null;
  pm?: User | null;
  gmId?: string | null;
  gm?: User | null;
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
    badgeClass: "bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
    description: "Akses Semua Kasus: Patroli lapangan, catat temuan baru, dan audit kepatuhan.",
  },
  PIC: {
    label: "PIC Proyek (Subkon / Site Eng)",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
    description: "Akses Terisolasi Khusus Proyek Sendiri: Hanya dapat melihat & merespon tugas proyeknya.",
  },
  SM: {
    label: "Site Manager (SM)",
    badgeClass: "bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800",
    description: "Akses Multi-Proyek Lapangan: Mengawasi & mengkoordinasikan PIC di beberapa site proyek.",
  },
  PM: {
    label: "Project Manager (PM)",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    description: "Akses Multi-Proyek: Evaluasi SLA, memvalidasi dan menyetujui penutupan temuan.",
  },
  GM: {
    label: "General Manager (GM)",
    badgeClass: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
    description: "Akses Divisi / Wilayah: Supervisi PM & PIC, pemantauan eskalasi dan kepatuhan patroli.",
  },
  BOD: {
    label: "Board of Directors (BOD)",
    badgeClass: "bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
    description: "Akses Semua Kasus: Pemantau makro eksekutif, KPI kepatuhan seluruh proyek.",
  },
  ADMIN: {
    label: "Administrator Sistem",
    badgeClass: "bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800",
    description: "Pengelola Master Proyek, Penugasan PIC/SM/PM, dan Konfigurasi Matriks.",
  },
  PENDING: {
    label: "Menunggu Penugasan Admin",
    badgeClass: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
    description: "Akun baru terdaftar. Menunggu administrator menentukan role dan proyek penugasan.",
  },
};

