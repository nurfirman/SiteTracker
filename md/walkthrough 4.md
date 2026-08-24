# Walkthrough: Restrukturisasi Akses Multi-Proyek & Isolasi Tugas PIC

Laporan ini merangkum penyelesaian restrukturisasi hak akses proyek dan penanganan tugas pada **SiteTracker CMD** sesuai kebutuhan operasional lapangan.

---

## 1. Hierarki & Matriks Hak Akses Proyek yang Diperbarui

| Peran (Role) | Ruang Lingkup Proyek (*Project Scope*) | Hak Akses Halaman "Tugas Saya" (`/pic/tasks`) | Visibilitas Kasus & Temuan |
| :--- | :--- | :--- | :--- |
| **`CMD` (Patrol Inspector)** | **Semua Proyek (Global)** | Pemantauan & audit seluruh temuan OPEN lintas proyek | Dapat melihat dan mencatat temuan di **semua proyek** |
| **`BOD` (Direksi / Exec)** | **Semua Proyek (Global)** | Pemantauan makro seluruh temuan OPEN lintas proyek | Dapat melihat **semua proyek & semua kasus** |
| **`PM` (Project Manager)** | **Multi-Proyek** *(1 PM dapat memegang beberapa proyek)* | Verifikasi, evaluasi SLA, dan monitoring multi-site | Melihat & memvalidasi temuan di **proyek-proyek binaannya** |
| **`SM` (Site Manager)** 🌟 *Baru* | **Multi-Proyek Lapangan** *(1 SM dapat memegang beberapa proyek)* | Memonitor & merespon perbaikan di seluruh site binaannya | Mengawasi & mengkoordinasikan PIC di **proyek-proyek binaannya** |
| **`PIC` (PIC Proyek)** | **Terisolasi Khusus Proyeknya Saja** | **HANYA** melihat & merespon tugas di proyek penugasannya | **Terisolasi:** PIC Ciawi hanya melihat Ciawi, PIC SCBD hanya melihat SCBD |
| **`ADMIN` (SuperAdmin)** | **Semua Proyek** | Pengawasan penuh dan testing alur kerja | Mengelola master proyek, alokasi PIC/SM, dan matriks peran |

---

## 2. Perubahan & Penguatan Sistem yang Dilakukan

### A. Isolasi Ketat Tugas PIC (`/pic/tasks` & Server Action)
- **Filter Query Eksklusif:**
  - Saat **Bambang Wijaya (PIC Site Ciawi)** membuka `/pic/tasks`, sistem hanya memuat temuan berstatus `OPEN` di proyek `Pembangunan Jembatan Layang Ciawi` (`CMD-2026-005 - Pier 2 Ciawi`). **Tidak ada satupun temuan SCBD yang bocor ke PIC Ciawi.**
  - Saat **Ahmad Fauzi (PIC Site SCBD)** login, sistem hanya memuat temuan di proyek `Proyek Tower Gedung A - SCBD` (`CMD-2026-001` & `CMD-2026-004`).
- **Server Guard Enforcement (`resolveFinding`):**
  - Di tingkat Server Action `src/lib/actions.ts`, ditambahkan validasi kepemilikan proyek. Jika PIC mencoba merespon ID tiket dari proyek lain, server akan menolak dengan pesan:
    > *"Akses ditolak: Anda hanya berwenang merespon temuan pada proyek penugasan Anda sendiri."*

### B. Penambahan Peran Site Manager (SM) & Multi-Project Assignment
- Menambahkan peran **`SM`** ke dalam `Role` enum Prisma & TypeScript.
- Menambahkan persona baru: **`Ir. Aris Munandar (Site Manager SCBD & Ciawi)`** dengan `projectIds: ["proj-1", "proj-2"]`.
- Menyediakan tab pemilih filter site di halaman `/pic/tasks` untuk peran SM, PM, CMD, dan BOD agar dapat berganti tinjauan antar proyek binaan dengan mudah.

### C. Pembaruan Matriks Wewenang di Halaman Administrator (`/admin`)
- Matriks izin peran (*Role Matrix*) kini mencantumkan baris khusus **"Cakupan Visibilitas Kasus & Proyek"** serta kolom tersendiri untuk peran **SM (Site Manager)**.

---

## 3. Hasil Pengujian & Verifikasi Build

```bash
> npx next build

✔ Compiled successfully
✓ Generating static pages (12/12)
✓ Finalizing page optimization
```
Semua 12 rute halaman terkompilasi dengan **0 error** dan siap digunakan.
