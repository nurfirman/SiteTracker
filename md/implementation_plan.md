# Implementation Plan - SiteTracker CMD

Bangun web aplikasi lengkap untuk sistem pencatatan patroli & pelacakan temuan konstruksi bernama **SiteTracker CMD**, siap di-deploy ke Vercel dengan database serverless Neon (PostgreSQL) dan Prisma ORM.

## User Review Required

> [!IMPORTANT]
> - **Akses & Auth Demo**: Untuk mempermudah pengujian & demo aplikasi tanpa hambatan login/password yang rumit di lapangan, aplikasi disiapkan dengan **Role Switcher Header** (CMD, PIC, PM, BOD) serta tetap mendukung integrasi Auth (misal NextAuth/Clerk) untuk produksi.
> - **Upload Foto**: Aplikasi menyertakan handler bawaan (Base64/DataURL & Local Storage Fallback) sehingga aplikasi dapat langsung dijalankan & dites 100% tanpa wajib konfigurasi Cloudinary/Vercel Blob terlebih dahulu, namun siap dihubungkan ke Vercel Blob/Cloudinary melalui variabel lingkungan (`.env`).

## Proposed Architecture & Structure

Aplikasi menggunakan **Next.js App Router (TypeScript + Tailwind CSS + Lucide Icons + Prisma ORM)**.

```
SiteTracker/
├── prisma/
│   ├── schema.prisma           # Schema database Neon PostgreSQL
│   └── seed.ts                 # Data awal proyek, user, dan temuan sampel
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout (Inter font, Navbar, Toast context)
│   │   ├── page.tsx            # Dashboard Utama & Ringkasan Validasi PM
│   │   ├── findings/
│   │   │   ├── page.tsx        # Daftar Semua Temuan (+Filter & Search)
│   │   │   ├── new/
│   │   │   │   └── page.tsx    # Form Input Temuan Patroli (CMD) + Kamera & GPS
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Detail Temuan & Verifikasi Side-by-Side (PM)
│   │   ├── pic/
│   │   │   └── tasks/
│   │   │       └── page.tsx    # Portal Tugas Saya (PIC) & Upload Bukti Perbaikan
│   │   ├── projects/
│   │   │   └── page.tsx        # Ringkasan Proyek & Anggota Tim
│   │   └── api/                # API Routes & Server Actions
│   ├── components/
│   │   ├── Navbar.tsx          # Header Navigasi & Mobile Bottom Bar
│   │   ├── RoleSwitcher.tsx    # Selector simulasi role pengguna (CMD/PIC/PM/BOD)
│   │   ├── StatusBadge.tsx     # Badge status intuitif (Red, Yellow, Green)
│   │   ├── SideBySideModal.tsx # Modal perbandingan foto Sebelum vs Sesudah
│   │   ├── GpsButton.tsx       # Tombol "Dapatkan Lokasi GPS Saya"
│   │   ├── UI/                 # Core UI Components (Button, Card, Input, Modal)
│   │   └── FindingCard.tsx     # Kartu tampilan temuan
│   ├── lib/
│   │   ├── db.ts               # Inisialisasi Prisma Client (Neon support)
│   │   ├── utils.ts            # Helper tanggal, kode tiket, format GPS
│   │   └── actions.ts          # Server Actions untuk CRUD & Mutasi Status
│   └── types/
│       └── index.ts            # Definisi TypeScript Interface & Enum
├── public/                     # Asset publik & gambar placeholder
├── .env.example                # Template variabel lingkungan Neon & Vercel
├── tailwind.config.ts          # Konfigurasi Tailwind & Aksesibilitas
└── package.json
```

---

## Proposed Database Schema (`prisma/schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  CMD
  PIC
  PM
  BOD
}

enum Category {
  K3_SAFETY
  QUALITY
  KEBERSIHAN_5R
  SCHEDULE
  MATERIAL
}

enum FindingStatus {
  OPEN
  RESOLVED
  CLOSED
}

model Project {
  id        String    @id @default(uuid())
  name      String
  location  String
  createdAt DateTime  @default(now()) @map("created_at")
  users     User[]
  findings  Finding[]

  @@map("projects")
}

model User {
  id          String   @id @default(uuid())
  name        String
  email       String   @unique
  role        Role
  phoneNumber String   @map("phone_number")
  projectId   String?  @map("project_id")
  project     Project? @relation(fields: [projectId], references: [id])

  findingsAssigned Finding[] @relation("PicFindings")
  findingsReported Finding[] @relation("ReporterFindings")

  @@map("users")
}

model Finding {
  id                 String        @id @default(uuid())
  ticketCode         String        @unique @map("ticket_code")
  projectId          String        @map("project_id")
  project            Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  picId              String        @map("pic_id")
  pic                User          @relation("PicFindings", fields: [picId], references: [id])
  reporterId         String        @map("reporter_id")
  reporter           User          @relation("ReporterFindings", fields: [reporterId], references: [id])
  locationDetail     String        @map("location_detail")
  coordinates        String?
  category           Category
  description        String        @db.Text
  photoFindingUrl    String        @map("photo_finding_url")
  status             FindingStatus @default(OPEN)
  picResponse        String?       @map("pic_response") @db.Text
  photoResolutionUrl String?       @map("photo_resolution_url")
  rejectionNote      String?       @map("rejection_note") @db.Text
  createdAt          DateTime      @default(now()) @map("created_at")
  resolvedAt         DateTime?     @map("resolved_at")
  closedAt           DateTime?     @map("closed_at")

  @@map("findings")
}
```

---

## User Interface & Accessibility Specifications

1. **Aksesibilitas Tinggi (WCAG AA compliant)**:
   - Font: Inter / Plus Jakarta Sans.
   - Base Font Size: `text-base` (16px), judul `text-xl` hingga `text-3xl`.
   - Touch Target: Seluruh tombol & input minimal `min-h-[48px]` dan padding `py-3 px-4`.
2. **Skema Warna Status**:
   - 🔴 **OPEN**: Background Merah Lembut (`bg-red-500/10 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800`), Icon AlertCircle.
   - 🟡 **RESOLVED**: Background Kuning/Oranye (`bg-amber-500/10 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800`), Icon Clock/Hourglass.
   - 🟢 **CLOSED**: Background Hijau (`bg-emerald-500/10 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800`), Icon CheckCircle2.
3. **Optimasi Lapangan (Smartphone/Tablet)**:
   - Floating Action Button (FAB) / Shortcut cepat input temuan di bagian bawah layar HP.
   - Trigger kamera langsung (`capture="environment"`).
   - Deteksi GPS 1-klik dengan tampilan feedback status koordinat.
4. **Validasi PM / Side-by-Side View**:
   - Modal atau tampilan perbandingan foto "Sebelum (Foto Temuan)" vs "Sesudah (Foto Perbaikan)" berdampingan dengan slider/grid interaktif.
   - Tombol Aksi Langsung:
     - 🟢 **Setujui & Selesaikan** (Ubah ke CLOSED)
     - 🔴 **Tolak / Minta Perbaikan Ulang** (Kembali ke OPEN + Input Catatan Revisi)

---

## Verification Plan

### Automated Verification
- Run `npm run build` to verify standard TypeScript & Next.js build compilation.
- Seed database using `npx prisma db seed` or dynamic fallback API.

### Manual Verification
- Test input form CMD with photo preview & GPS simulation.
- Test PIC tasks portal to submit resolution response & upload photo.
- Test PM Dashboard & Side-by-Side approval/rejection modal.
- Test filters (Project, Status, Category) & search.
