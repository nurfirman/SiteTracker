"use client";

import React, { useState, useEffect } from "react";
import { Finding, Project, Category, FindingStatus } from "@/types";
import { getFindings, getProjects, validateFinding } from "@/lib/actions";
import { useRole } from "@/components/RoleContext";
import { StatusBadge } from "@/components/StatusBadge";
import { FindingCard } from "@/components/FindingCard";
import { FindingCardGridSkeleton } from "@/components/SkeletonLoader";
import { SideBySideModal } from "@/components/SideBySideModal";
import Link from "next/link";
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  PlusCircle,
  Filter,
  RefreshCw,
  Search,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  CheckSquare,
  Sliders,
  Phone,
} from "lucide-react";

export default function DashboardPage() {
  const { currentUser } = useRole();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedProject, setSelectedProject] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal Side-by-side
  const [selectedModalFinding, setSelectedModalFinding] = useState<Finding | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedFindings, fetchedProjects] = await Promise.all([
        getFindings({
          projectId: selectedProject,
          category: selectedCategory as Category,
          status: selectedStatus as FindingStatus,
          search: searchQuery,
        }),
        getProjects(),
      ]);
      setFindings(fetchedFindings);
      setProjects(fetchedProjects);
    } catch (err) {
      console.error("Gagal memuat data dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser.role === "PIC" && currentUser.projectId) {
      setSelectedProject(currentUser.projectId);
    } else {
      setSelectedProject("ALL");
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [selectedProject, selectedCategory, selectedStatus, currentUser]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Stats calculation
  const totalOpen = findings.filter((f) => f.status === "OPEN").length;
  const totalResolved = findings.filter((f) => f.status === "RESOLVED").length;
  const totalClosed = findings.filter((f) => f.status === "CLOSED").length;
  const totalAll = findings.length;

  const resolvedForValidation = findings.filter((f) => f.status === "RESOLVED");

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleApproveFinding = async (findingId: string) => {
    const res = await validateFinding({ findingId, action: "APPROVE" });
    if (res.success) {
      showToast("Berhasil menyetujui perbaikan. Status tiket CLOSED.");
    }
    loadData();
  };

  const handleRejectFinding = async (findingId: string, note: string) => {
    const res = await validateFinding({ findingId, action: "REJECT", rejectionNote: note });
    if (res.success) {
      showToast("Perbaikan ditolak dan dikembalikan ke status OPEN untuk revisi.");
    }
    loadData();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 bg-slate-900 text-white rounded-2xl border border-violet-500/50 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="text-violet-400 w-5 h-5 shrink-0" />
          <span className="text-xs font-extrabold">{toastMessage}</span>
        </div>
      )}

      {/* Banner & Greeting Header */}
      <div className="bg-gradient-to-r from-violet-100/90 via-violet-50 to-white dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-800 dark:to-violet-950 border border-violet-200 dark:border-slate-800 p-6 sm:p-8 rounded-3xl text-slate-900 dark:text-white shadow-sm dark:shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-100 dark:bg-violet-950/80 border border-violet-300 dark:border-violet-800/80 text-violet-900 dark:text-violet-300 text-xs font-extrabold rounded-full backdrop-blur-md">
            <ShieldCheck size={14} className="text-violet-600 dark:text-violet-400" />
            <span>
              {currentUser.role === "PENDING"
                ? "Menunggu Penugasan Role & Proyek dari Administrator"
                : currentUser.role === "PIC"
                ? `Portal Penanggung Jawab Proyek (${currentUser.project?.name || "Site Lapangan"})`
                : currentUser.role === "ADMIN"
                ? "Portal Administrator Master Proyek & Hak Akses"
                : "Sistem Patroli K3 & Mutu Konstruksi"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Selamat Datang, {currentUser.name}!
          </h1>
          <p className="text-sm text-slate-700 dark:text-slate-300 max-w-2xl leading-relaxed font-medium">
            {currentUser.role === "PENDING"
              ? "Akun Anda telah berhasil terdaftar. Saat ini status akun Anda masih dalam proses peninjauan oleh Administrator. Data temuan proyek akan ditampilkan di sini setelah peran dan penugasan proyek Anda disetujui."
              : currentUser.role === "PIC"
              ? "Tampilan antarmuka Anda terisolasi khusus proyek penugasan. Tindak lanjuti temuan yang masih berstatus OPEN dan unggah bukti perbaikan."
              : currentUser.role === "ADMIN"
              ? "Kelola master proyek, penugasan PIC, setting toleransi SLA kategori, dan konfigurasi wewenang peran sistem."
              : "Sistem pemantauan temuan patroli lapangan real-time untuk memastikan keselamatan K3 (ISO 45001) dan mutu fisik proyek (ISO 9001)."}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {["CMD", "PM", "SM", "ADMIN"].includes(currentUser.role) && (
            <Link
              href="/findings/new"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] text-sm font-black text-white bg-violet-600 hover:bg-violet-500 rounded-2xl shadow-md shadow-violet-500/25 active:scale-95 transition-all"
            >
              <PlusCircle size={20} />
              <span>+ Catat Temuan Baru</span>
            </Link>
          )}

          {currentUser.role === "PIC" && (
            <Link
              href="/pic/tasks"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] text-sm font-black text-white bg-violet-600 hover:bg-violet-500 rounded-2xl shadow-md shadow-violet-500/25 active:scale-95 transition-all"
            >
              <CheckSquare size={20} />
              <span>Tindak Lanjut Tugas ({totalOpen})</span>
            </Link>
          )}

          {currentUser.role === "ADMIN" && (
            <Link
              href="/admin"
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 min-h-[48px] text-sm font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl border border-slate-200 dark:border-slate-700 transition-all shadow-xs"
            >
              <Sliders size={18} />
              <span>Pengaturan Admin</span>
            </Link>
          )}

          <button
            onClick={loadData}
            className="inline-flex items-center justify-center p-3.5 min-h-[48px] min-w-[48px] text-slate-700 dark:text-white bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl border border-slate-200 dark:border-slate-700 transition-all active:scale-95 shadow-xs"
            title="Muat ulang data"
          >
            <RefreshCw size={18} className={loading ? "animate-spin text-violet-600" : ""} />
          </button>
        </div>
      </div>

      {/* JIKA USER BERSTATUS PENDING: KOSONGKAN TEMUAN & TAMPILKAN EMPTY STATE INFORMATIF */}
      {currentUser.role === "PENDING" ? (
        <div className="p-8 sm:p-12 bg-white dark:bg-slate-900 border-2 border-dashed border-amber-300 dark:border-amber-800/80 rounded-3xl text-center space-y-5 shadow-sm">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
            <Clock size={32} />
          </div>
          <div className="space-y-2 max-w-lg mx-auto">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              Data Temuan Proyek Dikosongkan
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Halo <strong>{currentUser.name}</strong>, akun Anda masih berstatus <strong>PENDING</strong> (menunggu persetujuan Admin). Seluruh indikator KPI dan daftar temuan proyek dikosongkan sampai Administrator menghubungkan akun Anda ke peran (Role) dan proyek kerja.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <a
              href={`https://wa.me/6281234567890?text=Halo%20Admin%20SiteTracker,%20saya%20sudah%20mendaftar%20dengan%20nama%20${encodeURIComponent(
                currentUser.name
              )}%20(${encodeURIComponent(currentUser.email)}),%20mohon%20bantuannya%20untuk%20aktivasi%20wewenang%20role%20dan%20proyek%20saya.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl shadow-md shadow-emerald-600/20 transition-all active:scale-95"
            >
              <Phone size={16} />
              <span>Hubungi Administrator untuk Aktivasi</span>
            </a>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 px-5 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-2xl transition-all active:scale-95"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              <span>Cek Status Aktivasi</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* SUMMARY CARDS (RINGKASAN STATUS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card OPEN */}
            <div className="p-6 bg-white dark:bg-slate-900 border-2 border-red-200 dark:border-red-900/60 rounded-3xl shadow-sm hover:shadow-md transition-all space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-wider uppercase text-red-800 dark:text-red-400">
                  Temuan Open (Perlu Tindakan)
                </span>
            <div className="p-2.5 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-2xl">
              <AlertCircle size={24} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900 dark:text-white">
              {totalOpen}
            </span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Tiket Open</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-400 font-medium">
            Memerlukan perbaikan segera oleh PIC Lapangan.
          </p>
        </div>

        {/* Card RESOLVED */}
        <div className="p-6 bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-amber-900/60 rounded-3xl shadow-sm hover:shadow-md transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black tracking-wider uppercase text-amber-900 dark:text-amber-400">
              Menunggu Validasi PM
            </span>
            <div className="p-2.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-2xl">
              <Clock size={24} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900 dark:text-white">
              {totalResolved}
            </span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Tiket Resolved</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-400 font-medium">
            PIC sudah kirim perbaikan. Siap diverifikasi PM.
          </p>
        </div>

        {/* Card CLOSED */}
        <div className="p-6 bg-white dark:bg-slate-900 border-2 border-emerald-200 dark:border-emerald-900/60 rounded-3xl shadow-sm hover:shadow-md transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black tracking-wider uppercase text-emerald-900 dark:text-emerald-400">
              Selesai & Diverifikasi (Closed)
            </span>
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-2xl">
              <CheckCircle2 size={24} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900 dark:text-white">
              {totalClosed}
            </span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Tiket Closed</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-400 font-medium">
            Tuntas dikerjakan dan telah disetujui PM.
          </p>
        </div>

        {/* Card TOTAL */}
        <div className="p-6 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-md transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black tracking-wider uppercase text-slate-800 dark:text-slate-400">
              Total Temuan Patroli
            </span>
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 rounded-2xl">
              <Layers size={24} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900 dark:text-white">
              {totalAll}
            </span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Tiket Total</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-400 font-medium">
            {currentUser.role === "PIC" ? "Total temuan pada proyek ini." : "Akumulasi temuan patroli di seluruh proyek."}
          </p>
        </div>
      </div>

      {/* SECTION VALIDASI PM (SIDE-BY-SIDE HIGHLIGHT) */}
      {(["PM", "BOD", "ADMIN", "SM"].includes(currentUser.role) || resolvedForValidation.length > 0) && (
        <div className="p-6 bg-violet-50/70 dark:bg-violet-950/20 border-2 border-violet-300 dark:border-violet-800/80 rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-600 text-white font-extrabold text-xs rounded-lg uppercase tracking-wider mb-1">
                <Clock size={14} /> Antrean Validasi PM / BOD
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Verifikasi Hasil Perbaikan PIC ({resolvedForValidation.length} Tiket Menunggu)
              </h2>
            </div>

            <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
              Bandingkan foto sebelum & sesudah untuk memberikan persetujuan
            </span>
          </div>

          {resolvedForValidation.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-violet-200 dark:border-violet-900 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Tidak Ada Antrean Validasi
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                Seluruh perbaikan yang dikirim PIC telah diverifikasi oleh PM.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resolvedForValidation.map((finding) => (
                <div
                  key={finding.id}
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-violet-200 dark:border-violet-800 shadow-sm space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-900 text-white rounded-md">
                        {finding.ticketCode}
                      </span>
                      <StatusBadge status="RESOLVED" size="sm" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2">
                      {finding.description}
                    </h4>
                    <p className="text-xs text-slate-700 dark:text-slate-400 truncate flex items-center gap-1 font-medium">
                      <Building2 size={12} className="shrink-0 text-violet-600 dark:text-violet-400" />
                      <span>{finding.locationDetail}</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedModalFinding(finding)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] text-sm font-extrabold text-white bg-violet-600 hover:bg-violet-500 rounded-xl shadow-sm transition-all active:scale-95"
                  >
                    <span>Tinjau Side-by-Side</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FILTER & DAFTAR TEMUAN UTAMA */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Daftar Temuan Patroli Lapangan
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Pilih tab status atau gunakan filter proyek & kategori untuk meninjau temuan.
            </p>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-x-auto">
            <button
              onClick={() => setSelectedStatus("ALL")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                selectedStatus === "ALL"
                  ? "bg-violet-600 text-white shadow-md"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              Semua ({totalAll})
            </button>
            <button
              onClick={() => setSelectedStatus("OPEN")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                selectedStatus === "OPEN"
                  ? "bg-red-600 text-white shadow-md"
                  : "text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50"
              }`}
            >
              <AlertCircle size={14} />
              <span>Open ({totalOpen})</span>
            </button>
            <button
              onClick={() => setSelectedStatus("RESOLVED")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                selectedStatus === "RESOLVED"
                  ? "bg-amber-600 text-white shadow-md"
                  : "text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50"
              }`}
            >
              <Clock size={14} />
              <span>Resolved ({totalResolved})</span>
            </button>
            <button
              onClick={() => setSelectedStatus("CLOSED")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                selectedStatus === "CLOSED"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
              }`}
            >
              <CheckCircle2 size={14} />
              <span>Closed ({totalClosed})</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kode tiket (CMD-2026-001), deskripsi, atau lokasi..."
                className="w-full pl-12 pr-4 py-3 min-h-[48px] text-sm font-semibold rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 min-h-[48px] text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-2xl transition-all"
            >
              Cari
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Filter Proyek */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Filter Proyek:
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                disabled={currentUser.role === "PIC"}
                className="w-full px-3 py-2.5 min-h-[44px] text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-60"
              >
                {currentUser.role !== "PIC" && <option value="ALL">Semua Proyek</option>}
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Kategori */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Filter Kategori:
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2.5 min-h-[44px] text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="ALL">Semua Kategori</option>
                <option value="K3_SAFETY">K3 / Keselamatan</option>
                <option value="QUALITY">Kualitas Pekerjaan</option>
                <option value="KEBERSIHAN_5R">Kebersihan 5R</option>
                <option value="SCHEDULE">Jadwal & Progres</option>
                <option value="MATERIAL">Material & Logistik</option>
              </select>
            </div>

            {/* Filter Status */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Filter Status Tiket:
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2.5 min-h-[44px] text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="ALL">Semua Status (OPEN, RESOLVED, CLOSED)</option>
                <option value="OPEN">OPEN (Temuan Belum Ditangani)</option>
                <option value="RESOLVED">RESOLVED (Menunggu Verifikasi PM)</option>
                <option value="CLOSED">CLOSED (Selesai & Diverifikasi)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Grid Finding Cards */}
        {loading ? (
          <FindingCardGridSkeleton count={6} />
        ) : findings.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
            <Filter className="w-12 h-12 text-slate-400 mx-auto opacity-50" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Tidak Ada Temuan Ditemukan
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Coba sesuaikan filter proyek atau kata kunci pencarian Anda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {findings.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                onOpenSideBySide={(f) => setSelectedModalFinding(f)}
                currentUserRole={currentUser.role}
              />
            ))}
          </div>
        )}
      </div>
        </>
      )}

      {/* Modal Side by Side Verification */}
      <SideBySideModal
        finding={selectedModalFinding}
        isOpen={!!selectedModalFinding}
        onClose={() => setSelectedModalFinding(null)}
        onApprove={handleApproveFinding}
        onReject={handleRejectFinding}
        isPmOrBod={currentUser.role === "PM" || currentUser.role === "BOD" || currentUser.role === "ADMIN"}
      />
    </div>
  );
}
