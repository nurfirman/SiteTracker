"use client";

import React, { useState, useEffect } from "react";
import { Finding, Project } from "@/types";
import { getFindings, getProjects } from "@/lib/actions";
import { formatDate, getSlaStatus } from "@/lib/utils";
import {
  Printer,
  FileText,
  HardHat,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  Download,
  Filter,
} from "lucide-react";

export default function ReportsPage() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [fList, pList] = await Promise.all([
          getFindings({ projectId: selectedProject }),
          getProjects(),
        ]);
        setFindings(fList);
        setProjects(pList);
      } catch (err) {
        console.error("Gagal memuat data laporan:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedProject]);

  const totalFindings = findings.length;
  const totalOpen = findings.filter((f) => f.status === "OPEN").length;
  const totalResolved = findings.filter((f) => f.status === "RESOLVED").length;
  const totalClosed = findings.filter((f) => f.status === "CLOSED").length;
  const totalOverdue = findings.filter(
    (f) => f.status !== "CLOSED" && getSlaStatus(f.dueDate, f.status).isOverdue
  ).length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 sm:p-8 font-sans print:p-0 print:bg-white print:text-black">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Action Bar (Hidden when printing) */}
        <div className="print:hidden bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500 text-xs font-black tracking-widest uppercase">
              <FileText size={16} /> Laporan Patroli Eksekutif
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Cetak / Ekspor Rekapitulasi Temuan (PDF)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Gunakan tombol cetak di bawah ini untuk menyimpan laporan resmi format PDF untuk rapat mingguan proyek.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white min-h-[44px]"
            >
              <option value="ALL">Semua Proyek Aktif</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-sm rounded-xl shadow-lg transition-all min-h-[44px]"
            >
              <Printer size={18} />
              <span>Cetak Laporan / PDF</span>
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div className="bg-white dark:bg-slate-900 print:bg-white print:text-black p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl print:shadow-none print:border-none space-y-8">
          {/* Document Letterhead Header */}
          <div className="border-b-2 border-slate-900 dark:border-slate-700 print:border-black pb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500 text-slate-950 rounded-2xl print:bg-black print:text-white">
                <HardHat size={36} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white print:text-black tracking-tight">
                  SITETRACKER CMD
                </h2>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 print:text-slate-700">
                  LAPORAN HASIL PATROLI LAPANGAN & PENGAWASAN K3 / MUTU
                </p>
                <p className="text-[11px] text-slate-500 print:text-slate-600">
                  Standard Operating Procedure: ISO 45001 & ISO 9001
                </p>
              </div>
            </div>

            <div className="text-right text-xs text-slate-600 dark:text-slate-400 print:text-slate-700 space-y-1">
              <p className="font-bold text-slate-900 dark:text-white print:text-black">
                Tanggal Cetak: {formatDate(new Date())}
              </p>
              <p>Filter Proyek: <span className="font-bold">{selectedProject === "ALL" ? "Seluruh Proyek" : projects.find(p => p.id === selectedProject)?.name}</span></p>
              <p>Status Sistem: <span className="font-bold text-emerald-600">Resmi & Diverifikasi</span></p>
            </div>
          </div>

          {/* Executive Summary Metrics Cards */}
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white print:text-black uppercase tracking-wider mb-3">
              Ringkasan Statistik Temuan
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 print:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-700 print:border-slate-300">
                <p className="text-xs font-bold text-slate-500 print:text-slate-700">Total Temuan</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white print:text-black mt-1">{totalFindings}</p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-950/40 print:bg-red-50 rounded-2xl border border-red-200 dark:border-red-800 print:border-red-300">
                <p className="text-xs font-bold text-red-600 print:text-red-800">Status OPEN 🔴</p>
                <p className="text-2xl font-black text-red-700 dark:text-red-400 print:text-red-800 mt-1">{totalOpen}</p>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 print:bg-amber-50 rounded-2xl border border-amber-200 dark:border-amber-800 print:border-amber-300">
                <p className="text-xs font-bold text-amber-600 print:text-amber-800">Status RESOLVED 🟡</p>
                <p className="text-2xl font-black text-amber-700 dark:text-amber-400 print:text-amber-800 mt-1">{totalResolved}</p>
              </div>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 print:bg-emerald-50 rounded-2xl border border-emerald-200 dark:border-emerald-800 print:border-emerald-300">
                <p className="text-xs font-bold text-emerald-600 print:text-emerald-800">Status CLOSED 🟢</p>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 print:text-emerald-800 mt-1">{totalClosed}</p>
              </div>
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 print:bg-rose-50 rounded-2xl border border-rose-200 dark:border-rose-800 print:border-rose-300 col-span-2 sm:col-span-1">
                <p className="text-xs font-bold text-rose-600 print:text-rose-800">OVERDUE SLA ⚠️</p>
                <p className="text-2xl font-black text-rose-700 dark:text-rose-400 print:text-rose-800 mt-1">{totalOverdue}</p>
              </div>
            </div>
          </div>

          {/* Detailed Findings Table */}
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white print:text-black uppercase tracking-wider mb-4">
              Daftar Detail Tiket Patroli Lapangan
            </h3>

            {loading ? (
              <div className="py-12 text-center text-slate-500 font-bold">Memuat data laporan...</div>
            ) : findings.length === 0 ? (
              <div className="py-12 text-center text-slate-500">Tidak ada temuan terdaftar untuk filter ini.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-300 dark:border-slate-700 print:border-black bg-slate-100 dark:bg-slate-800 print:bg-slate-200 text-slate-900 dark:text-white print:text-black font-extrabold">
                      <th className="p-3">Kode Tiket</th>
                      <th className="p-3">Proyek & Lokasi</th>
                      <th className="p-3">Kategori</th>
                      <th className="p-3">Deskripsi Masalah</th>
                      <th className="p-3">PIC</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Tgl Lapor / SLA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 print:divide-slate-300">
                    {findings.map((item) => {
                      const sla = getSlaStatus(item.dueDate, item.status);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 print:hover:bg-transparent">
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-white print:text-black whitespace-nowrap">
                            {item.ticketCode}
                          </td>
                          <td className="p-3">
                            <p className="font-bold text-slate-900 dark:text-white print:text-black">{item.project?.name || "-"}</p>
                            <p className="text-[11px] text-slate-500 print:text-slate-700">{item.locationDetail}</p>
                          </td>
                          <td className="p-3 font-semibold text-slate-800 dark:text-slate-200 print:text-black">
                            {item.category}
                          </td>
                          <td className="p-3 text-slate-700 dark:text-slate-300 print:text-black max-w-xs leading-relaxed">
                            {item.description}
                          </td>
                          <td className="p-3 font-medium text-slate-800 dark:text-slate-200 print:text-black whitespace-nowrap">
                            {item.pic?.name || "Unassigned"}
                          </td>
                          <td className="p-3 whitespace-nowrap font-extrabold">
                            <span
                              className={`px-2.5 py-1 rounded-md text-[10px] ${
                                item.status === "OPEN"
                                  ? "bg-red-100 text-red-800 print:bg-red-100"
                                  : item.status === "RESOLVED"
                                  ? "bg-amber-100 text-amber-800 print:bg-amber-100"
                                  : "bg-emerald-100 text-emerald-800 print:bg-emerald-100"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="p-3 text-[11px] whitespace-nowrap">
                            <p className="text-slate-600 print:text-black">{formatDate(item.createdAt)}</p>
                            <p className={`font-bold text-[10px] ${sla.isOverdue ? "text-red-600" : "text-slate-500"}`}>
                              {sla.label}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Signatures Footer Block for Official Printouts */}
          <div className="pt-12 border-t border-slate-300 dark:border-slate-800 print:border-slate-400 grid grid-cols-3 gap-8 text-center text-xs">
            <div>
              <p className="text-slate-500 font-bold mb-12">Disiapkan Oleh (Inspector CMD)</p>
              <p className="font-extrabold text-slate-900 dark:text-white print:text-black uppercase">( Budi Santoso )</p>
              <p className="text-[11px] text-slate-500">Field QC & Safety Officer</p>
            </div>
            <div>
              <p className="text-slate-500 font-bold mb-12">Ditindaklanjuti (PIC Lapangan)</p>
              <p className="font-extrabold text-slate-900 dark:text-white print:text-black uppercase">( Ahmad Fauzi )</p>
              <p className="text-[11px] text-slate-500">Site Engineer Subkontraktor</p>
            </div>
            <div>
              <p className="text-slate-500 font-bold mb-12">Disetujui Oleh (Project Manager)</p>
              <p className="font-extrabold text-slate-900 dark:text-white print:text-black uppercase">( Ir. H. Hendra Gunawan )</p>
              <p className="text-[11px] text-slate-500">Project Manager Utama</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
