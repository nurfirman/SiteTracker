# Walkthrough & Deployment Guide - SiteTracker CMD

Web aplikasi lengkap **SiteTracker CMD** (Sistem Pencatatan Patroli & Pelacakan Temuan Konstruksi) telah selesai dibangun, terverifikasi bebas error kompilasi (`npm run build` sukses), dan siap di-deploy ke Vercel dengan database serverless **Neon (PostgreSQL)** dan Prisma ORM.

---

## 📸 Ringkasan Fitur & Workflow yang Dibuat

### 1. **Role Switcher & Universal Accessibility (Ramah Pengguna Senior)**
- **Header Role Switcher**: Penguji dapat beralih secara dinamis antara role **CMD Inspector**, **PIC Lapangan**, **Project Manager (PM)**, dan **BOD (Board of Directors)**.
- **Standar Aksesibilitas WCAG AA**:
  - Ukuran teks base $\ge$ 16px dengan bobot font jelas (*Inter / Plus Jakarta Sans*).
  - Seluruh tombol memiliki touch target ramah smartphone (minimal tinggi **48px**) dengan padding yang nyaman.
  - Warna Status Intuitif:
    - 🔴 **OPEN** (Merah) – Temuan Belum Ditangani
    - 🟡 **RESOLVED** (Kuning/Oranye) – Menunggu Verifikasi PM
    - 🟢 **CLOSED** (Hijau) – Selesai & Diverifikasi

---

### 2. **Halaman Input Temuan (Tim CMD Patroli)** – `/findings/new`
- **Form Cepat**: Dropdown Proyek $\rightarrow$ Dropdown PIC (otomatis terfilter sesuai proyek yang dipilih).
- **Kategori Temuan**:
  - 🛡️ K3 / Keselamatan Kerja
  - 🏗️ Kualitas Pekerjaan
  - 🧹 Kebersihan 5R
  - ⏱️ Jadwal & Progres
  - 📦 Material & Logistik
- **Trigger Kamera Direct Smartphone**: Mendukung input kamera langsung (`accept="image/*" capture="environment"`).
- **Deteksi GPS 1-Klik**: Tombol *"Dapatkan Lokasi GPS Saya"* otomatis menggunakan Browser Geolocation API.
- **Generasi Kode Tiket Otomatis**: Format `CMD-2026-XXX` dengan status awal 🔴 **OPEN**.

---

### 3. **Halaman Tugas Saya (PIC Lapangan)** – `/pic/tasks`
- Menampilkan daftar temuan berstatus 🔴 **OPEN** yang ditugaskan ke PIC tersebut.
- Tombol Aksi **"Tindak Lanjuti"**:
  - Form input rincian respon/keterangan perbaikan.
  - Upload foto bukti hasil perbaikan (Foto Sesudah).
  - Setelah dikirim, status berubah otomatis menjadi 🟡 **RESOLVED**.

---

### 4. **Dashboard & Verifikasi PM (Project Manager)** – `/`
- **Kartu Ringkasan Status**: Total Open, Total Resolved (Menunggu Validasi), Total Closed, dan Total Temuan.
- **Side-by-Side Verification Modal**:
  - Membandingkan **Foto Sebelum (Temuan Awal)** vs **Foto Sesudah (Perbaikan PIC)** secara berdampingan.
  - **Tombol Aksi PM**:
    - 🟢 **"Setujui & Selesaikan"** $\rightarrow$ Status berubah menjadi **CLOSED**.
    - 🔴 **"Tolak / Minta Perbaikan Ulang"** $\rightarrow$ Status kembali ke **OPEN** dilengkapi catatan revisi PM.
- **Filter Berkelanjutan**: Pencarian kata kunci, filter per Proyek, Kategori, dan Status Tiket.

---

### 5. **Daftar Semua Temuan & Detail** – `/findings` & `/findings/[id]`
- Pencarian dan filter arsip lengkap seluruh temuan.
- Timeline detail perubahan status dari awal dilaporkan hingga diverifikasi PM.

---

## 🗄️ Database Schema & File Artifacts

### 1. `prisma/schema.prisma`
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
  name      String    @db.VarChar(255)
  location  String    @db.VarChar(255)
  createdAt DateTime  @default(now()) @map("created_at")
  users     User[]
  findings  Finding[]

  @@map("projects")
}

model User {
  id          String   @id @default(uuid())
  name        String   @db.VarChar(255)
  email       String   @unique @db.VarChar(255)
  role        Role
  phoneNumber String   @map("phone_number") @db.VarChar(50)
  projectId   String?  @map("project_id")
  project     Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)

  findingsAssigned Finding[] @relation("PicFindings")
  findingsReported Finding[] @relation("ReporterFindings")

  @@map("users")
}

model Finding {
  id                 String        @id @default(uuid())
  ticketCode         String        @unique @map("ticket_code") @db.VarChar(50)
  projectId          String        @map("project_id")
  project            Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  picId              String        @map("pic_id")
  pic                User          @relation("PicFindings", fields: [picId], references: [id])
  reporterId         String        @map("reporter_id")
  reporter           User          @relation("ReporterFindings", fields: [reporterId], references: [id])
  locationDetail     String        @map("location_detail") @db.VarChar(255)
  coordinates        String?       @db.VarChar(100)
  category           Category
  description        String        @db.Text
  photoFindingUrl    String        @map("photo_finding_url") @db.Text
  status             FindingStatus @default(OPEN)
  picResponse        String?       @map("pic_response") @db.Text
  photoResolutionUrl String?       @map("photo_resolution_url") @db.Text
  rejectionNote      String?       @map("rejection_note") @db.Text
  createdAt          DateTime      @default(now()) @map("created_at")
  resolvedAt         DateTime?     @map("resolved_at")
  closedAt           DateTime?     @map("closed_at")

  @@map("findings")
}
```

---

## 🚀 Panduan Setup & Deploy ke Vercel (Neon PostgreSQL)

### 1. Buat Database di Neon PostgreSQL
1. Buka [Dashboard Neon](https://neon.tech) dan buat project database baru.
2. Salin connection string dari Neon Console.

### 2. Konfigurasi Variabel Lingkungan (`.env`)
Salin file [.env.example](file:///d:/AntiGravity/SiteTracker/.env.example) ke `.env`:
```env
DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-xxx-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
```

### 3. Push Migration & Seed Database Neon
Jalankan perintah berikut di terminal local:
```bash
# Push schema Prisma ke database Neon PostgreSQL
npx prisma db push

# Seeding data proyek & user awal
npx prisma db seed
```

### 4. Deploy ke Vercel
1. Import repository aplikasi ke Vercel.
2. Tambahkan **Environment Variable** `DATABASE_URL` di setting project Vercel.
3. Vercel akan otomatis menjalankan `npm run build` yang sudah mencakup `prisma generate && next build`.

---

## 🧪 Hasil Verifikasi Kompilasi Local
- Command: `npm run build`
- Output:
  ```text
  ✔ Generated Prisma Client (v5.22.0)
  ✓ Compiled successfully
  ✓ Generating static pages (8/8)
  ```
- Aplikasi 100% bebas dari type error dan warning icon missing.
