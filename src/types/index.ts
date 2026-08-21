export type Role = "CMD" | "PIC" | "PM" | "BOD";

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
  projectId?: string | null;
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
    label: "Tim CMD / Inspector",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200",
    description: "Petugas Patroli Lapangan yang mencatat temuan & buat tiket.",
  },
  PIC: {
    label: "PIC Lapangan (Subkont/Site Eng)",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/40 dark:text-purple-200",
    description: "Penanggung Jawab Area yang menindaklanjuti & kirim bukti perbaikan.",
  },
  PM: {
    label: "Project Manager (PM)",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200",
    description: "Penilai & Verifikator akhir hasil perbaikan temuan.",
  },
  BOD: {
    label: "Board of Directors (BOD)",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200",
    description: "Executive Management pemantau kinerjanya seluruh proyek.",
  },
};
