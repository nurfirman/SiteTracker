"use client";

import React, { useState, useEffect } from "react";
import { Finding, Project, Category, FindingStatus } from "@/types";
import { getFindings, getProjects, validateFinding } from "@/lib/actions";
import { useRole } from "@/components/RoleContext";
import { FindingCard } from "@/components/FindingCard";
import { SideBySideModal } from "@/components/SideBySideModal";
import Link from "next/link";
import {
  ClipboardList,
  Search,
  Filter,
  PlusCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";

export default function AllFindingsPage() {
  const { currentUser } = useRole();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedProject, setSelectedProject] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedModalFinding, setSelectedModalFinding] = useState<Finding | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fList, pList] = await Promise.all([
        getFindings({
          projectId: selectedProject,
          category: selectedCategory as Category,
          status: selectedStatus as FindingStatus,
          search: searchQuery,
        }),
        getProjects(),
      ]);
      setFindings(fList);
      setProjects(pList);
    } catch (e) {
      console.error("Gagal memuat temuan:", e);
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

  const handleApproveFinding = async (findingId: string) => {
    await validateFinding({ findingId, action: "APPROVE" });
    loadData();
  };

  const handleRejectFinding = async (findingId: string, note: string) => {
    await validateFinding({ findingId, action: "REJECT", rejectionNote: note });
    loadData();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 text-xs font-bold rounded-lg mb-1">
            <ClipboardList size={14} /> Daftar Arsip Temuan
          </span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Semua Temuan Patroli Lapangan
          </h1>
          <p className="text-sm text-slate-500">
            Daftar lengkap seluruh tiket temuan K3, Kualitas, 5R, Jadwal, dan Material.
          </p>
        </div>

        <Link
          href="/findings/new"
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] text-base font-extrabold text-slate-950 bg-yellow-400 hover:bg-yellow-300 rounded-2xl shadow-md active:scale-95 transition-all"
        >
          <PlusCircle size={20} />
          <span>+ Tambah Temuan</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Tiket (CMD-2026-001), Lokasi, atau Deskripsi..."
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
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              Proyek:
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2.5 min-h-[44px] text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="ALL">Semua Proyek</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              Kategori:
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

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              Status Tiket:
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

      {/* Grid Results */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 space-y-2">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-500" />
          <p className="text-sm font-semibold">Memuat daftar temuan...</p>
        </div>
      ) : findings.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <Filter className="w-12 h-12 text-slate-400 mx-auto opacity-50" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Tidak Ada Temuan Sesuai Filter
          </h3>
          <p className="text-sm text-slate-500">
            Coba ubah kriteria pencarian atau pilih filter proyek lainnya.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {findings.map((f) => (
            <FindingCard
              key={f.id}
              finding={f}
              onOpenSideBySide={(modalFinding) => setSelectedModalFinding(modalFinding)}
              currentUserRole={currentUser.role}
            />
          ))}
        </div>
      )}

      {/* Modal Side by side */}
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
