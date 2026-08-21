"use client";

import React, { useState, useEffect } from "react";
import { Finding, Project, Category, FindingStatus } from "@/types";
import { getFindings, getProjects, validateFinding } from "@/lib/actions";
import { useRole } from "@/components/RoleContext";
import { StatusBadge } from "@/components/StatusBadge";
import { FindingCard } from "@/components/FindingCard";
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
    loadData();
  }, [selectedProject, selectedCategory, selectedStatus]);

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

  const handleApproveFinding = async (findingId: string) => {
    await validateFinding({ findingId, action: "APPROVE" });
    loadData();
  };

  const handleRejectFinding = async (findingId: string, note: string) => {
    await validateFinding({ findingId, action: "REJECT", rejectionNote: note });
    loadData();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Banner & Greeting Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-yellow-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/20 border border-yellow-400/30 text-yellow-300 text-xs font-extrabold rounded-full backdrop-blur-md">
            <Sparkles size={14} /> Dashboard Sistem Patroli Konstruksi
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Selamat Datang, {currentUser.name}!
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl">
            Sistem pencatatan & pemantauan temuan patroli lapangan real-time untuk memastikan keselamatan K3 dan kualitas fisik proyek.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/findings/new"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] text-base font-extrabold text-slate-950 bg-yellow-400 hover:bg-yellow-300 rounded-2xl shadow-lg hover:shadow-yellow-500/20 active:scale-95 transition-all"
          >
            <PlusCircle size={22} />
            <span>+ Catat Temuan Baru</span>
          </Link>

          <button
            onClick={loadData}
            className="inline-flex items-center justify-center p-3.5 min-h-[48px] min-w-[48px] text-white bg-slate-800/80 hover:bg-slate-700 rounded-2xl border border-slate-700 transition-all active:scale-95"
            title="Muat ulang data"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS (RINGKASAN STATUS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card OPEN */}
        <div className="p-6 bg-white dark:bg-slate-900 border-2 border-red-200 dark:border-red-900/60 rounded-3xl shadow-sm hover:shadow-md transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold tracking-wider uppercase text-red-700 dark:text-red-400">
              Temuan Open (Belum Ditangani)
            </span>
            <div className="p-2.5 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-300 rounded-2xl">
              <AlertCircle size={24} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900 dark:text-white">
              {totalOpen}
            </span>
            <span className="text-xs font-semibold text-slate-500">Tiket 🔴</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Memerlukan perbaikan segera oleh PIC Lapangan.
          </p>
        </div>

        {/* Card RESOLVED */}
        <div className="p-6 bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-amber-900/60 rounded-3xl shadow-sm hover:shadow-md transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold tracking-wider uppercase text-amber-800 dark:text-amber-400">
              Menunggu Validasi PM
            </span>
            <div className="p-2.5 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-300 rounded-2xl">
              <Clock size={24} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900 dark:text-white">
              {totalResolved}
            </span>
            <span className="text-xs font-semibold text-slate-500">Tiket 🟡</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            PIC sudah kirim perbaikan. Siap diverifikasi PM.
          </p>
        </div>

        {/* Card CLOSED */}
        <div className="p-6 bg-white dark:bg-slate-900 border-2 border-emerald-200 dark:border-emerald-900/60 rounded-3xl shadow-sm hover:shadow-md transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold tracking-wider uppercase text-emerald-800 dark:text-emerald-400">
              Selesai & Diverifikasi (Closed)
            </span>
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 rounded-2xl">
              <CheckCircle2 size={24} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900 dark:text-white">
              {totalClosed}
            </span>
            <span className="text-xs font-semibold text-slate-500">Tiket 🟢</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Tuntas dikerjakan dan telah disetujui PM.
          </p>
        </div>

        {/* Card TOTAL */}
        <div className="p-6 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-md transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold tracking-wider uppercase text-slate-600 dark:text-slate-400">
              Total Semua Temuan
            </span>
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl">
              <Layers size={24} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900 dark:text-white">
              {totalAll}
            </span>
            <span className="text-xs font-semibold text-slate-500">Tiket Total</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Akumulasi temuan patroli di seluruh proyek.
          </p>
        </div>
      </div>

      {/* SECTION VALIDASI PM (SIDE-BY-SIDE HIGHLIGHT) */}
      <div className="p-6 bg-amber-500/10 border-2 border-amber-300/80 dark:border-amber-800/80 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-slate-950 font-extrabold text-xs rounded-lg uppercase tracking-wider mb-1">
              <Clock size={14} /> Antrean Validasi PM / BOD
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Verifikasi Hasil Perbaikan PIC ({resolvedForValidation.length} Tiket Menunggu)
            </h2>
          </div>

          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            Bandingkan foto sebelum & sesudah untuk memberikan persetujuan
          </span>
        </div>

        {resolvedForValidation.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-amber-200 dark:border-amber-900 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Tidak Ada Antrean Validasi
            </h3>
            <p className="text-sm text-slate-500">
              Seluruh perbaikan yang dikirim PIC telah diverifikasi oleh PM.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resolvedForValidation.map((finding) => (
              <div
                key={finding.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-amber-300 dark:border-amber-800 shadow-md space-y-4 flex flex-col justify-between"
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
                  <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                    📍 {finding.locationDetail}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedModalFinding(finding)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] text-sm font-extrabold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition-all active:scale-95"
                >
                  <span>Tinjau & Verifikasi Side-by-Side</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FILTER & DAFTAR TEMUAN UTAMA */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Daftar Temuan Patroli Lapangan
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Gunakan filter di bawah untuk mempersempit daftar proyek dan status.
            </p>
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
                className="w-full pl-12 pr-4 py-3 min-h-[48px] text-base rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-amber-500 dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 min-h-[48px] text-base font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-2xl transition-all"
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
                className="w-full px-3 py-2.5 min-h-[44px] text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="ALL">Semua Proyek (Semua Location)</option>
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
                <option value="OPEN">🔴 OPEN (Temuan Belum Ditangani)</option>
                <option value="RESOLVED">🟡 RESOLVED (Menunggu Verifikasi PM)</option>
                <option value="CLOSED">🟢 CLOSED (Selesai & Diverifikasi)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Grid Finding Cards */}
        {loading ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-500" />
            <p className="text-sm font-semibold">Memuat data temuan patroli...</p>
          </div>
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

      {/* Modal Side by Side Verification */}
      <SideBySideModal
        finding={selectedModalFinding}
        isOpen={!!selectedModalFinding}
        onClose={() => setSelectedModalFinding(null)}
        onApprove={handleApproveFinding}
        onReject={handleRejectFinding}
        isPmOrBod={currentUser.role === "PM" || currentUser.role === "BOD"}
      />
    </div>
  );
}
