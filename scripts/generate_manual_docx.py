import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def add_heading_1(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = "Arial"
    run.font.size = Pt(16)
    run.font.bold = True
    run.font.color.rgb = RGBColor(30, 41, 59) # Slate 800
    return p

def add_heading_2(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = "Arial"
    run.font.size = Pt(13)
    run.font.bold = True
    run.font.color.rgb = RGBColor(79, 70, 229) # Indigo 600
    return p

def add_body_p(doc, text, bold_prefix=""):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.font.name = "Calibri"
        r_pre.font.size = Pt(11)
        r_pre.font.bold = True
        r_pre.font.color.rgb = RGBColor(15, 23, 42)
    r = p.add_run(text)
    r.font.name = "Calibri"
    r.font.size = Pt(11)
    r.font.color.rgb = RGBColor(51, 65, 85)
    return p

def add_callout(doc, text, title="TIPS / CATATAN PENTING"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    set_cell_background(cell, "EEF2FF") # Indigo 50
    set_cell_margins(cell, top=140, bottom=140, left=180, right=180)
    
    # Border styling via XML
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="24" w:space="0" w:color="4F46E5"/><w:top w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/></w:tcBorders>')
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(2)
    r1 = p.add_run(f"💡 {title}\n")
    r1.font.name = "Arial"
    r1.font.bold = True
    r1.font.size = Pt(10.5)
    r1.font.color.rgb = RGBColor(67, 56, 202)
    
    r2 = p.add_run(text)
    r2.font.name = "Calibri"
    r2.font.size = Pt(10)
    r2.font.color.rgb = RGBColor(30, 41, 59)
    
    # Empty space after table
    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_before = Pt(2)
    p_after.paragraph_format.space_after = Pt(4)

def add_screenshot_box(doc, img_path, caption):
    if not os.path.exists(img_path):
        print(f"Warning: Image not found at {img_path}")
        return
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(2)
    run = p.add_run()
    run.add_picture(img_path, width=Inches(6.2))
    
    p_cap = doc.add_paragraph()
    p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap.paragraph_format.space_before = Pt(0)
    p_cap.paragraph_format.space_after = Pt(10)
    r_cap = p_cap.add_run(f"Gambar: {caption}")
    r_cap.font.name = "Calibri"
    r_cap.font.size = Pt(9.5)
    r_cap.font.italic = True
    r_cap.font.color.rgb = RGBColor(100, 116, 139)

def build_manual_docx():
    doc = Document()
    
    # Page Margins: 1 inch all around
    sections = doc.sections
    for s in sections:
        s.top_margin = Inches(0.8)
        s.bottom_margin = Inches(0.8)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)
        
    # COVER / HEADER
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(24)
    p_title.paragraph_format.space_after = Pt(4)
    r_t = p_title.add_run("BUKU PANDUAN PENGGUNA (USER MANUAL)")
    r_t.font.name = "Arial"
    r_t.font.size = Pt(22)
    r_t.font.bold = True
    r_t.font.color.rgb = RGBColor(30, 41, 59)
    
    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(16)
    r_sub = p_sub.add_run("SITETRACKER CMD — Sistem Digitalisasi Patroli & Validasi Mutu Fisik Konstruksi")
    r_sub.font.name = "Calibri"
    r_sub.font.size = Pt(13)
    r_sub.font.color.rgb = RGBColor(79, 70, 229)
    r_sub.font.bold = True
    
    # Meta Box Table
    tbl_meta = doc.add_table(rows=2, cols=2)
    tbl_meta.alignment = WD_TABLE_ALIGNMENT.CENTER
    for r in tbl_meta.rows:
        for c in r.cells:
            set_cell_background(c, "F8FAFC")
            set_cell_margins(c, top=80, bottom=80, left=100, right=100)
    tbl_meta.cell(0, 0).paragraphs[0].add_run("Versi Dokumen: 1.0 (Lengkap Screenshot)").font.size = Pt(10)
    tbl_meta.cell(0, 1).paragraphs[0].add_run("Tanggal Terbit: September 2026").font.size = Pt(10)
    tbl_meta.cell(1, 0).paragraphs[0].add_run("Target Pengguna: CMD, PIC, SM, PM, Direksi").font.size = Pt(10)
    tbl_meta.cell(1, 1).paragraphs[0].add_run("Platform: Web Responsive (Desktop & Mobile)").font.size = Pt(10)
    
    doc.add_paragraph().paragraph_format.space_after = Pt(12)
    
    # SECTION 1
    add_heading_1(doc, "1. Pengenalan Aplikasi SiteTracker CMD")
    add_body_p(doc, "SiteTracker CMD adalah sistem manajemen digital terintegrasi untuk pengawasan kepatuhan K3 (ISO 45001) dan pelacakan temuan mutu fisik konstruksi (ISO 9001). Aplikasi ini menghubungkan pihak Pemeriksa Lapangan (CMD/Safety), Pelaksana Lapangan (PIC Subkon), dan Manajemen Proyek (Site Manager / Project Manager) dalam satu alur kerja real-time.")
    
    add_body_p(doc, "Tersedia pembagian hak akses (Role-Based Access) yang jelas:")
    add_body_p(doc, "Melakukan inspeksi patroli, mencatat tiket temuan, memverifikasi perbaikan, dan menerbitkan laporan resmi berkala.", "• CMD (Central Management / Safety Inspector): ")
    add_body_p(doc, "Melihat daftar pekerjaan yang harus diperbaiki pada proyeknya, serta mengunggah bukti hasil perbaikan (Before vs After).", "• PIC (Person In Charge / Pelaksana): ")
    add_body_p(doc, "Memantau SLA proyek, memvalidasi hasil perbaikan, dan menandatangani berita acara laporan patroli.", "• Site Manager (SM) & Project Manager (PM): ")
    add_body_p(doc, "Memantau dashboard KPI makro dan analitik seluruh proyek.", "• Direksi (GM / BOD / Advisor): ")
    
    add_heading_2(doc, "Halaman Masuk (Login & Akses Cepat)")
    add_body_p(doc, "Pengguna dapat masuk menggunakan email dan password terdaftar. Sistem telah dilengkapi fitur pemulihan kata sandi (Reset Password via OTP) serta akun instan tersinkronisasi database Neon Cloud.")
    add_screenshot_box(doc, "docs/screenshots/01_login_page.png", "Halaman Login & Autentikasi Pengguna")
    
    # SECTION 2
    add_heading_1(doc, "2. Dashboard & Pemantauan Operasional")
    add_body_p(doc, "Setelah masuk, pimpinan dan tim disajikan ringkasan visual berupa:")
    add_body_p(doc, "Jumlah temuan Berstatus OPEN (Menunggu Tindakan), RESOLVED (Menunggu Validasi), dan CLOSED (Tuntas).", "• Statistik Utama: ")
    add_body_p(doc, "Peringatan otomatis temuan yang mendekati batas waktu atau melebihi batas penanganan.", "• Status SLA (Due Date): ")
    add_body_p(doc, "Grafik sebaran isu pada kategori K3 Safety, Mutu/Quality, Kebersihan 5R, Schedule, dan Material.", "• Distribusi Kategori: ")
    add_screenshot_box(doc, "docs/screenshots/02_dashboard_cmd.png", "Dashboard Utama SiteTracker CMD")

    # SECTION 3
    add_heading_1(doc, "3. Panduan Pelaporan Temuan (Reporting Finding)")
    add_body_p(doc, "Dalam mencatat ketidaksesuaian di lapangan, SiteTracker menyediakan 2 mode input:")
    
    add_heading_2(doc, "A. Mode Input Cepat (⚡ Input Patroli Bulk) — Disarankan di Lapangan")
    add_body_p(doc, "Fitur ini dirancang khusus untuk mempercepat pencatatan inspektur saat berkeliling di lapangan. Cukup tentukan proyek dan tanggal patroli satu kali di header, kemudian tambahkan beberapa baris temuan sekaligus tanpa perlu berpindah-pindah form.")
    add_body_p(doc, "Buka menu Daftar Temuan, lalu klik tombol '⚡ Input Patroli Bulk' di pojok kanan atas.", "Langkah 1: ")
    add_body_p(doc, "Tentukan Proyek Target, Tanggal Inspeksi, dan PIC Utama.", "Langkah 2: ")
    add_body_p(doc, "Unggah foto temuan, pilih kategori bahaya, isi detail lokasi/lantai, dan catat instruksi perbaikan.", "Langkah 3: ")
    add_body_p(doc, "Klik '+ Tambah Baris Temuan' untuk item berikutnya.", "Langkah 4: ")
    add_body_p(doc, "Klik tombol 'Simpan & Terbitkan Semua Temuan'. Seluruh tiket akan dibuat serentak dengan nomor unik.", "Langkah 5: ")
    add_screenshot_box(doc, "docs/screenshots/05_input_bulk_finding.png", "Antarmuka Input Cepat Patroli Bulk Multi-Temuan")
    add_callout(doc, "Fitur Anotasi Foto: Anda dapat mengklik tombol coret/anotasi pada foto untuk melingkari bagian bahaya dengan garis merah atau memberi tanda panah agar titik masalah sangat jelas bagi PIC!", "TIPS EFISIENSI PATROLI")

    add_heading_2(doc, "B. Mode Input Temuan Tunggal (Single Finding)")
    add_body_p(doc, "Bila Anda memerlukan pencatatan mendalam lengkap dengan titik koordinat GPS presisi dan beberapa sudut foto sekaligus, gunakan form input tunggal pada menu '+ Tambah Temuan Baru'.")
    add_screenshot_box(doc, "docs/screenshots/04_input_single_finding.png", "Formulir Input Temuan Tunggal Detail Lengkap")

    # SECTION 4
    add_heading_1(doc, "4. Panduan Respon & Tindak Lanjut oleh PIC")
    add_body_p(doc, "Pihak Pelaksana / Subkontraktor (PIC) bertanggung jawab mengeksekusi perbaikan fisik di area kerja:")
    add_body_p(doc, "PIC masuk ke sistem dan langsung diarahkan ke menu 'Tugas PIC' (/pic/tasks).", "Langkah 1: ")
    add_body_p(doc, "Sistem memfilter dan hanya menampilkan tiket temuan berstatus OPEN yang menjadi wewenang PIC tersebut.", "Langkah 2: ")
    add_body_p(doc, "Klik pada tiket untuk melihat foto masalah awal (Before) dan instruksi dari inspektor.", "Langkah 3: ")
    add_body_p(doc, "Lakukan tindakan fisik perbaikan di lapangan.", "Langkah 4: ")
    add_body_p(doc, "Klik 'Tindak Lanjut', unggah foto hasil perbaikan (After), dan isi penjelasan tindakan yang telah dikerjakan.", "Langkah 5: ")
    add_body_p(doc, "Klik 'Kirim Penyelesaian'. Tiket otomatis berganti status menjadi RESOLVED (Kuning).", "Langkah 6: ")
    add_screenshot_box(doc, "docs/screenshots/06_pic_task_list.png", "Daftar Tugas Kerja PIC Lapangan")

    # SECTION 5
    add_heading_1(doc, "5. Panduan Validasi Perbaikan (Approval / Close Out)")
    add_body_p(doc, "Untuk menjamin mutu dan kebenaran fisik, hasil perbaikan PIC tidak langsung ditutup otomatis, melainkan harus divalidasi oleh CMD, Site Manager, atau PM.")
    add_body_p(doc, "Buka menu 'Daftar Temuan' (/findings) dan cari tiket dengan status RESOLVED.", "Langkah 1: ")
    add_body_p(doc, "Klik tombol 'Validasi / Cek Hasil' pada kartu temuan.", "Langkah 2: ")
    add_body_p(doc, "Modal Side-by-Side akan terbuka membandingkan Foto Masalah (Before) di sisi kiri dan Foto Perbaikan (After) di sisi kanan.", "Langkah 3: ")
    add_body_p(doc, "Pilih keputusan verifikasi:\n• Setujui (Approve): Tiket resmi tuntas dan berganti status menjadi CLOSED.\n• Tolak (Reject): Tuliskan catatan alasan penolakan (misal: 'Area sekitar belum dibersihkan'). Tiket kembali ke status OPEN agar diperbaiki ulang oleh PIC.", "Langkah 4: ")
    add_screenshot_box(doc, "docs/screenshots/03_findings_list.png", "Daftar Seluruh Temuan dengan Filter Status & Tombol Validasi")

    # SECTION 6
    add_heading_1(doc, "6. Penyusunan Laporan Resmi, Arsip DB & Ekspor PDF")
    add_body_p(doc, "Menu Laporan Patroli (/reports) digunakan untuk menyusun Berita Acara Inspeksi Fisik resmi standar korporat.")
    
    add_heading_2(doc, "A. Konfigurasi Dokumen Laporan")
    add_body_p(doc, "Pengawas dapat mengatur:")
    add_body_p(doc, "Pilihan Proyek, Tanggal Patroli, dan PIC.", "• Filter Data: ")
    add_body_p(doc, "Rutin, Middle, Final, atau Inspeksi Gabungan (Joint Inspection).", "• Jenis Inspeksi: ")
    add_body_p(doc, "Nomor dokumen resmi (misal: PTR-2026-001), nama Pengawas Utama, daftar personel yang hadir saat patroli, dan nama Site Manager.", "• Metadata Legalitas: ")
    add_screenshot_box(doc, "docs/screenshots/07_reports_page.png", "Halaman Penyusunan Laporan Berita Acara Patroli Resmi")

    add_heading_2(doc, "B. Penyimpanan ke Database & Pemanggilan Ulang (Recall)")
    add_body_p(doc, "Klik tombol '💾 Simpan ke DB' di pojok kanan atas. Laporan akan tersimpan aman di database Cloud Neon dan seluruh temuan di dalamnya otomatis terhubung ke nomor laporan tersebut.")
    add_body_p(doc, "Untuk melihat atau mencetak kembali laporan patroli masa lalu, klik tombol '📁 Arsip Laporan CMD'. Daftar laporan akan muncul dan dapat dipanggil ulang (Recall) secara instan.", "Pemanggilan Ulang: ")
    add_screenshot_box(doc, "docs/screenshots/08_reports_archive_modal.png", "Modal Arsip & Riwayat Laporan Tersimpan")

    add_heading_2(doc, "C. Cetak & Ekspor PDF Standar Proyek")
    add_body_p(doc, "Klik tombol '🖨️ Cetak / Ekspor PDF'. Sistem akan menampilkan lembar kerja bersih yang siap dicetak ke printer fisik atau disimpan sebagai file PDF (Save as PDF). Format dokumen mencakup header proyek, tabel perbandingan Before-After temuan, dan kolom tanda tangan basah/digital 3 pihak (Inspektor, PIC, dan Site Manager).")

    # SECTION 7
    add_heading_1(doc, "7. Tanya Jawab & Kendala Umum (FAQ)")
    add_body_p(doc, "Tombol validasi (Approve/Reject) hanya diberikan pada wewenang CMD, SM, PM, GM, dan ADMIN untuk menjaga independensi mutu.", "T: Mengapa PIC tidak bisa menutup tiket sendiri? \nJ: ")
    add_body_p(doc, "Ketikkan nomor laporan atau nama proyek pada kotak pencarian di modal 'Arsip Laporan CMD' untuk langsung menemukannya.", "T: Bagaimana cara mencari laporan yang dibuat bulan lalu? \nJ: ")
    add_body_p(doc, "Gunakan fitur Anotasi Foto. Cukup klik ikon pensil pada foto temuan sebelum mengirim laporan.", "T: Bagaimana menandai kabel yang bahaya pada foto? \nJ: ")

    # Save to file
    out_dir = "d:/AntiGravity/SiteTracker/docs"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "MANUAL_BOOK_SITETRACKER.docx")
    doc.save(out_path)
    print("SUCCESS: DOCX generated at", out_path)

if __name__ == "__main__":
    build_manual_docx()
