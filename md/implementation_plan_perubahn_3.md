# Rencana Implementasi Perubahan Aplikasi (ProjectTracker)

Berikut adalah ringkasan analisis dan rencana eksekusi untuk 14 poin perubahan yang diminta:

---

## 📋 Rincian 14 Poin Perubahan & Lokasi File

1. **Ganti nama siteTracker CMD menjadi ProjectTracker**
   - File: `src/components/Sidebar.tsx`, `src/components/Header.tsx`, `src/app/layout.tsx`, `src/lib/actions.ts` (companyName default), `src/app/login/page.tsx`, `src/app/reports/page.tsx`, `src/app/landing/page.tsx`, `src/components/AppLayoutShell.tsx`.
   - Mengubah brand header, judul tab browser, footer, dan watermark sistem menjadi **ProjectTracker**.

2. **Display name "PIC (Person In Charge)" diganti dengan "Action By"**
   - File: `src/app/reports/page.tsx`, `src/app/findings/new/page.tsx`, `src/app/findings/bulk/page.tsx`, `src/app/findings/[id]/page.tsx`, `src/app/admin/page.tsx`, `src/types/index.ts` (ROLE_LABELS jika ada label PIC), `src/lib/utils.ts`.

3. **Display name "Lokasi Spesifik" diganti dengan "Lokasi Area"**
   - File: `src/app/reports/page.tsx`, `src/app/findings/new/page.tsx`, `src/app/findings/bulk/page.tsx`, `src/app/findings/[id]/page.tsx`, `src/lib/utils.ts`.

4. **Display name "Pelaksana Perbaikan" diganti dengan "Action By"**
   - File: `src/app/reports/page.tsx` (di kolom konfirmasi perbaikan pada tabel temuan).

5. **Display name "Inspeksi Gabungan" diganti dengan "Patrol Gabungan"**
   - File: `src/app/reports/page.tsx`, `src/app/findings/bulk/page.tsx`.

6. **Judul Report "INTERNAL REPORT" diganti dengan "INSPECTION REPORT"**
   - File: `src/app/reports/page.tsx` (judul dokumen cetak / preview laporan utama).

7. **Header Project di laporan diganti format:**
   ```text
   Nama   : [Nama Project]
   Code   : [Project Code]
   Lokasi : [Alamat Project]
   ```
   - File: `src/app/reports/page.tsx` (bagian master header proyek laporan).

8. **Posisi Inspektor ditukar dengan Pelapor namun isinya tidak**
   - File: `src/app/reports/page.tsx`:
     - Pada baris header tabel laporan: Baris Inspektor diletakkan di posisi Pelapor sebelumnya, dan Baris Pelapor diletakkan di posisi Inspektor (label ditukar posisinya).

9. **Pelapor adalah yang membuat laporan**
   - File: `src/app/reports/page.tsx`:
     - Pelapor default otomatis diambil dari user pembuat laporan saat ini (`currentUser.name`), bukan dari temuan.

10. **No ID temuan di laporan dihapus**
    - File: `src/app/reports/page.tsx`:
      - Pada kolom nomor (`NO / ID`), hilangkan kode tiket / ID temuan (`ticketCode`), hanya tampilkan nomor urut saja (1, 2, 3, dst).

11. **Pelapor di item temuan (contoh: Pelapor: Benny SIMANJUNTAK) dihapus**
    - File: `src/app/reports/page.tsx`:
      - Di dalam kolom komentar patroli pada tabel item temuan, hapus tampilan baris nama pelapor.

12. **Kategori di item temuan laporan dihapus**
    - File: `src/app/reports/page.tsx`:
      - Di dalam kolom komentar patroli pada tabel item temuan, hapus tampilan kategori.

13. **Inputan di temuan baru: Kategori temuan patroli dihapus dan dibuat default Quality**
    - File: `src/app/findings/new/page.tsx` & `src/app/findings/bulk/page.tsx`:
      - Sembunyikan/hilangkan pilihan dropdown Kategori Temuan dari formulir input baru dan otomatis tetapkan nilai default menjadi `"QUALITY"`.

14. **PIC dan SiteManager otomatis disamakan atau PIC dan SiteManager sama**
    - File: `src/app/reports/page.tsx`, `src/app/findings/new/page.tsx`, `src/app/findings/bulk/page.tsx`:
      - Pada laporan, nama Site Manager disamakan dengan PIC/Action By proyek (atau sebaliknya otomatis tersinkronisasi), dan pada formulir otomatis menghubungkan PIC/SM.

---

## 🔍 Rencana Verifikasi
- Menjalankan `npm run build` untuk memastikan tidak ada kesalahan tipe TypeScript atau error build Next.js.
- Memeriksa tampilan laporan di `/reports` dan formulir di `/findings/new` & `/findings/bulk`.
