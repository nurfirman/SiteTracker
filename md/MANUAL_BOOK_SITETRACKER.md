# 📘 BUKU PANDUAN PENGGUNA (USER MANUAL) SITETRACKER CMD
*Sistem Pelacakan, Pelaporan Patroli Lapangan & Validasi Kualitas Terintegrasi*

---

## 📑 DAFTAR ISI
1. [Pengenalan Aplikasi](#1-pengenalan-aplikasi)
2. [Akses & Peran Pengguna (Role & Permissions)](#2-akses--peran-pengguna)
3. [Alur Utama Sistem (Workflow Overview)](#3-alur-utama-sistem-workflow-overview)
4. [Panduan 1: Pelaporan Temuan Patroli (Reporting Finding)](#4-panduan-1-pelaporan-temuan-patroli)
   - [A. Input Cepat Patroli Banyak Sekaligus (Bulk Finding)](#a-input-cepat-patroli-banyak-sekaligus-bulk-finding)
   - [B. Input Temuan Tunggal (Single Finding)](#b-input-temuan-tunggal)
   - [C. Fitur Anotasi Foto (Coret/Tandai Masalah)](#c-fitur-anotasi-foto-coret-lingkari-masalah)
5. [Panduan 2: Tindak Lanjut oleh PIC Lapangan (Resolution)](#5-panduan-2-tindak-lanjut-oleh-pic-lapangan-resolution)
6. [Panduan 3: Validasi & Approval Temuan (Close Out)](#6-panduan-3-validasi--approval-temuan-close-out)
7. [Panduan 4: Penyusunan Laporan Resmi, Arsip DB & Ekspor PDF](#7-panduan-4-penyusunan-laporan-resmi-arsip-db--ekspor-pdf)
8. [Tanya Jawab & Tips Praktis (FAQ)](#8-tanya-jawab--tips-praktis-faq)

---

## 1. Pengenalan Aplikasi

**SiteTracker CMD** adalah platform digital berbasis web terintegrasi yang dirancang untuk mempermudah operasional inspeksi patroli proyek konstruksi. Sistem ini mencakup pencatatan temuan K3 & Kualitas, penugasan perbaikan ke PIC, pemantauan status real-time, validasi perbaikan sebelum-dan-sesudah (*Before vs After*), hingga penerbitan laporan berkala resmi berstandar korporat.

![Halaman Login & Autentikasi](file:///d:/AntiGravity/SiteTracker/docs/screenshots/01_login_page.png)

### Keunggulan Utama:
- ⚡ **Input Sangat Cepat di Lapangan:** Mendukung input multi-temuan langsung dari ponsel / tablet (*Bulk Input*).
- 📸 **Anotasi Foto Lapangan:** Memungkinkan inspektor melingkari atau mencoret bagian cacat/bahaya pada foto temuan.
- 🔄 **Validasi Komparatif Realistis:** Verifikasi penyelesaian pekerjaan dengan membandingkan foto awal dan foto hasil perbaikan secara berdampingan.
- 📑 **Ekspor Dokumen Otomatis:** Format cetak standar dokumen berita acara internal patrol, siap diunduh PDF atau dikirim via email.

---

## 2. Akses & Peran Pengguna

| Peran (Role) | Tanggung Jawab Utama | Hak Akses Fitur |
| :--- | :--- | :--- |
| **CMD (Safety / Quality Inspector)** | Melakukan patroli, mencatat temuan, menerbitkan laporan resmi, dan memvalidasi pekerjaan. | Input temuan (Single/Bulk), Buat Laporan Patroli, Arsip Laporan, Validasi Temuan. |
| **PIC (Person In Charge / Pelaksana Proyek)** | Menerima daftar temuan pekerjaan, melakukan perbaikan di lapangan, dan mengunggah bukti perbaikan. | Menu Tugas PIC (Task List), Update progres perbaikan, Unggah foto perbaikan (*Before-After*). |
| **SM / PM (Site Manager / Project Manager)** | Mengawasi performa seluruh tim di proyek, memvalidasi hasil perbaikan, dan menandatangani laporan. | Validasi Temuan, Monitoring Dashboard, Approval Laporan Patroli. |
| **GM / BOD / Advisor** | Meninjau performa lintas proyek secara menyeluruh dan memantau analitik KPI. | Monitoring Dashboard tingkat tinggi, Akses Review Temuan & Laporan Eksekutif. |

![Dashboard Operasional SiteTracker CMD](file:///d:/AntiGravity/SiteTracker/docs/screenshots/02_dashboard_cmd.png)

---

## 3. Alur Utama Sistem (Workflow Overview)

```
[1. Patroli Lapangan (CMD)] 
        ↓
[2. Input Temuan (Bulk / Single + Anotasi)] 
        ↓
[Tiket Berstatus OPEN] ──(Notifikasi ke PIC)──→ [3. PIC Perbaikan Lapangan]
                                                        ↓
                                              [4. Unggah Foto Bukti & Keterangan]
                                                        ↓
                                              [Tiket Berstatus RESOLVED]
                                                        ↓
                                              [5. Validasi CMD / SM / PM]
                                               ↙                     ↘
                             (Jika Ditolak) ↙                         ↘ (Jika Disetujui)
                    [Kembali ke Status OPEN]                   [Tiket Berstatus CLOSED]
                                                                          ↓
                                                               [6. Laporan Resmi & PDF]
```

---

## 4. Panduan 1: Pelaporan Temuan Patroli

### A. Input Cepat Patroli Banyak Sekaligus (Bulk Finding)
*Sangat disarankan saat patroli lapangan langsung agar pencatatan berjalan kilat tanpa bolak-balik form.*

![Antarmuka Input Patroli Bulk](file:///d:/AntiGravity/SiteTracker/docs/screenshots/05_input_bulk_finding.png)

1. Buka menu **Daftar Temuan** (`/findings`), klik tombol **"⚡ Input Patroli Bulk"** (`/findings/bulk`).
2. Tentukan **Metadata Bersama** di bagian atas: Proyek target, Tanggal patroli, dan PIC Default.
3. Masukkan baris temuan: Foto temuan, Kategori, Lokasi Spesifik, dan Catatan ringkas.
4. Klik **"+ Tambah Baris Temuan"** untuk item berikutnya.
5. Klik **"Simpan & Terbitkan Semua Temuan"**. Seluruh tiket dibuat serentak ke database.

---

### B. Input Temuan Tunggal (Single Finding)
Gunakan metode ini jika Anda ingin mencatat satu temuan mendalam dengan detail koordinat GPS presisi dan beberapa sudut foto sekaligus:

![Formulir Input Temuan Tunggal](file:///d:/AntiGravity/SiteTracker/docs/screenshots/04_input_single_finding.png)

1. Buka menu **Daftar Temuan** (`/findings`), klik **"+ Tambah Temuan Baru"**.
2. Isi formulir: Tanggal, Proyek, PIC, Kategori, Lokasi & Koordinat GPS, Keterangan, dan Upload Foto.
3. Klik **"Kirim Laporan Temuan"**.

---

## 5. Panduan 2: Tindak Lanjut oleh PIC Lapangan (Resolution)

![Daftar Tugas PIC Lapangan](file:///d:/AntiGravity/SiteTracker/docs/screenshots/06_pic_task_list.png)

1. PIC masuk ke sistem dan membuka menu **Tugas PIC** (`/pic/tasks`).
2. Sistem otomatis memfilter dan hanya menampilkan tiket **OPEN** yang menjadi tanggung jawab PIC tersebut.
3. Klik pada tiket temuan untuk melihat detail deskripsi dan foto awal masalah (*Before*).
4. Setelah perbaikan fisik selesai:
   - Klik tombol **"Tindak Lanjut / Respon Temuan"**.
   - Masukkan **Keterangan Perbaikan**.
   - Unggah **Foto Bukti Perbaikan (*After*)**.
5. Klik **"Kirim Penyelesaian"**. Status tiket otomatis berubah menjadi **RESOLVED** (Menunggu Validasi).

---

## 6. Panduan 3: Validasi & Approval Temuan (Close Out)

Tahap ini dilakukan oleh **CMD**, **Site Manager (SM)**, atau **Project Manager (PM)**:

![Daftar Temuan Patroli Lapangan](file:///d:/AntiGravity/SiteTracker/docs/screenshots/03_findings_list.png)

1. Buka menu **Daftar Temuan** (`/findings`).
2. Temuan yang siap diverifikasi akan berstatus **RESOLVED** (Warna Oranye/Kuning).
3. Klik tombol **"Validasi / Cek Hasil"** pada kartu temuan.
4. Modal komparasi visual terbuka (Foto *Before* di sisi kiri vs Foto *After* di sisi kanan).
5. **Keputusan:**
   - **Setujui (Approve):** Klik tombol hijau. Tiket resmi berganti status menjadi **CLOSED**.
   - **Tolak (Reject):** Klik tombol merah dan ketikkan alasan penolakan (contoh: *Pembersihan belum tuntas di area sudut*). Tiket kembali ke status **OPEN** agar diperbaiki ulang oleh PIC.

---

## 7. Panduan 4: Penyusunan Laporan Resmi, Arsip DB & Ekspor PDF

Menu Laporan Patroli (`/reports`) digunakan untuk merangkum seluruh hasil inspeksi ke dalam Berita Acara Patroli Resmi.

![Halaman Penyusunan Laporan Patroli Resmi](file:///d:/AntiGravity/SiteTracker/docs/screenshots/07_reports_page.png)

### A. Konfigurasi Laporan
1. Pilih **Proyek**, **PIC**, dan **Jenis Inspeksi** (Rutin / Middle / Final / Inspeksi Gabungan).
2. Tentukan **Nomor Dokumen**, **Nama Pengawas**, daftar **Inspektor yang Hadir**, dan nama **Site Manager**.

### B. Simpan ke Database & Pemanggilan Ulang (Recall)
- Klik **"💾 Simpan ke DB"** di pojok kanan atas untuk menyimpan laporan dan merekatkan seluruh temuan terkait.
- Klik **"📁 Arsip Laporan CMD"** untuk membuka modal riwayat seluruh dokumen masa lalu dan memanggilnya kembali (*Recall*) secara instan.

![Modal Arsip Laporan CMD](file:///d:/AntiGravity/SiteTracker/docs/screenshots/08_reports_archive_modal.png)

### C. Cetak / Ekspor PDF Standar Proyek
1. Klik tombol **"🖨️ Cetak / Ekspor PDF"**.
2. Dialog cetak peramban (*Print Preview*) akan terbuka dengan tata letak dokumen bersih siap cetak:
   - Kop surat & logo resmi proyek.
   - Tabel ringkasan inspeksi & daftar inspektor hadir.
   - Matriks perbandingan foto Before vs After temuan.
   - Kolom tanda tangan resmi pihak Inspektor, PIC, dan Site Manager.
3. Pilih printer tujuan **"Save as PDF"** / **"Simpan sebagai PDF"** lalu klik **Save**.

---
*Manual Book SiteTracker CMD — Versi 1.0 (2026)*
