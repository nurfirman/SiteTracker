# Walkthrough: Standardisasi Penomoran Dokumen Laporan (DIV-YY-XXX) & Pengaturan Divisi

Perubahan format penomoran dokumen laporan resmi dan penambahan master divisi proyek telah berhasil diimplementasikan sesuai ketentuan yang diminta:

1. **Format Penomoran Dokumen Laporan**:
   - Pola: `DIV-YY-XXX`
   - **`DIV`**: Kode divisi proyek (`CMD`, `ME`, `SQCD`, `PLAN`, `JOIN`, `BM`).
   - **`YY`**: 2 digit tahun dari tanggal laporan (misal tahun 2026 menjadi `26`).
   - **`XXX`**: 3 digit nomor urut tahunan (`001`, `002`, dst) yang reset setiap pergantian tahun.

2. **Daftar 6 Divisi Resmi**:
   - `CMD`: Construction Management Division
   - `ME`: Mechanical Electrical
   - `SQCD`: Safety Quality Construction Division
   - `PLAN`: Plant Division
   - `JOIN`: Joint Division
   - `BM`: Business Management

---

## 1. File dan Modul yang Diperbarui

### a. Master Constants & Formatters (`src/constants/divisions.ts`)
- Dibuat modul [divisions.ts](file:///d:/AntiGravity/SiteTracker/src/constants/divisions.ts) yang memuat konstanta `MASTER_DIVISIONS` lengkap dengan kode, nama divisi, dan deskripsi.
- Ditambahkan fungsi pembantu:
  - `getDivisionCode(rawDivision)`: Menormalisasi input teks/string divisi lama menjadi salah satu dari 6 kode divisi resmi (fallback: `CMD`).
  - `formatReportDocNumber(divisionCode, date, sequenceNumber)`: Memformat string menjadi `DIV-YY-XXX`.

### b. Server Actions & Generator Sequence (`src/lib/actions.ts`)
- Ditambahkan fungsi:
  - `getNextReportDocNumber(rawDivision, reportDateStr)`: Menghitung nomor urut tahunan untuk kombinasi `DIV-YY`, menyimpan counter, dan me-reset urutan setiap tahun baru.
  - `previewNextReportDocNumber(rawDivision, reportDateStr)`: Melakukan pratinjau nomor dokumen berikutnya.
- Diperbarui `EmailReportPayload` dan fungsi `sendReportEmail` untuk menyertakan `reportNumber?: string`.

### c. Email Dispatcher Template (`src/lib/azureMail.ts`)
- Diperbarui `SendAzureMailOptions` dan fungsi `generateEmailReportHtml`:
  - Menampilkan baris **No. Dokumen** resmi berbadge tebal ungu di tabel meta detail email.
  - Mengirim nomor dokumen laporan langsung ke subjek dan badan email via Azure Graph API / internal simulator.

### d. Halaman Laporan Patroli (`src/app/reports/page.tsx`)
- Diganti formula penomoran default dari formula lama (`IP/PRJ/YYYYMMDD/01`) ke format baru: **`formatReportDocNumber(activeDivCode, reportDate, 1)`** &rarr; e.g. `CMD-26-001`.
- Input **Nomor Laporan / Dokumen** kini memiliki placeholder dan label otomatis `DIV-YY-XXX (KODE)`.
- Badge **No. Dok** di form cetak *Internal Patrol* dan tampilan *Rekapitulasi Eksekutif* menampilkan nomor dokumen berformat `DIV-YY-XXX`.
- Pada header proyek dicantumkan keterangan divisi terkait (e.g. `DIVISI: CMD (Construction Management Division)`).
- Modal **Kirim Email Laporan**:
  - Subjek email otomatis diawali nomor dokumen: `[DIV-YY-XXX] Laporan Patroli K3 & Mutu - ...`.
  - Kotak ringkasan lampiran dokumen menampilkan badge nomor dokumen laporan dan nama divisi.

### e. Halaman Pengaturan Admin (`src/app/admin/page.tsx`)
- Ditambahkan tab navigasi baru: **"Kode Divisi (6)"** untuk melihat daftar master divisi, deskripsi tugas, contoh penomoran `DIV-YY-XXX`, serta proyek-proyek yang terafiliasi.
- Form **Tambah Proyek Baru** dan **Edit Penugasan Proyek** kini menggunakan dropdown select standar yang berisi 6 divisi resmi (`CMD`, `ME`, `SQCD`, `PLAN`, `JOIN`, `BM`).

---

## 2. Hasil Verifikasi & Build

Perintah `npm run build` dijalankan dan selesai tanpa error (`Exit Code: 0`):
- Prisma Client digenerate dengan sukses.
- Pemeriksaan validitas tipe TypeScript dan linting lulus 100%.
- Semua 12 rute statis/dinamis terkompilasi optimal.
