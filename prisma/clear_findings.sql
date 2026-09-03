-- ====================================================================
-- SITETRACKER CMD: SCRIPT SQL PEMBERSIHAN DATA TEMUAN (NEON POSTGRESQL)
-- File: prisma/clear_findings.sql
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. CEK JUMLAH DATA TEMUAN SEBELUM DIHAPUS (QUERY MONITORING)
-- --------------------------------------------------------------------
SELECT 
    p.name AS "Nama Proyek",
    f.status AS "Status Tiket",
    COUNT(f.id) AS "Jumlah Temuan"
FROM "findings" f
LEFT JOIN "projects" p ON f.project_id = p.id
GROUP BY p.name, f.status
ORDER BY p.name, f.status;

-- Total keseluruhan temuan aktif:
SELECT COUNT(*) AS "Total Seluruh Temuan" FROM "findings";


-- --------------------------------------------------------------------
-- 2. OPSI A: BERSIHKAN SELURUH DATA TEMUAN UNTUK SEMUA PROYEK (GLOBAL)
-- --------------------------------------------------------------------
-- Perintah ini akan menghapus semua data temuan di tabel "findings".
-- Data Master Proyek ("projects") dan Akun Pengguna ("users") TETAP AMAN.

DELETE FROM "findings";

-- Alternatif reset cepat (mengosongkan tabel seketika):
-- TRUNCATE TABLE "findings" CASCADE;


-- --------------------------------------------------------------------
-- 3. OPSI B: HAPUS TEMUAN HANYA UNTUK PROYEK TERTENTU
-- --------------------------------------------------------------------
-- Contoh: Hapus temuan pada proyek yang mengandung kata 'Cimanggis'
-- (Hilangkan tanda komentar '--' jika ingin menjalankan opsi ini)

-- DELETE FROM "findings"
-- WHERE "project_id" IN (
--     SELECT "id" FROM "projects" WHERE "name" ILIKE '%Cimanggis%'
-- );


-- --------------------------------------------------------------------
-- 4. OPSI C: HAPUS HANYA TEMUAN YANG SUDAH CLOSED (SELESAI/ARSIP)
-- --------------------------------------------------------------------
-- DELETE FROM "findings" WHERE "status" = 'CLOSED';


-- --------------------------------------------------------------------
-- 5. VERIFIKASI HASIL PEMBERSIHAN
-- --------------------------------------------------------------------
SELECT COUNT(*) AS "Sisa Data Temuan Setelah Dihapus" FROM "findings";
