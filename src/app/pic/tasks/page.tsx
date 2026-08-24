"use client";

import React, { useState, useEffect } from "react";
import { Finding } from "@/types";
import { getFindings, resolveFinding } from "@/lib/actions";
import { useRole } from "@/components/RoleContext";
import { StatusBadge } from "@/components/StatusBadge";
import { PhotoUploader } from "@/components/PhotoUploader";
import { formatDate } from "@/lib/utils";
import {
  CheckSquare,
  AlertCircle,
  MapPin,
  Clock,
  Send,
  X,
  Sparkles,
  CheckCircle2,
  Calendar,
} from "lucide-react";

export default function PicTasksPage() {
  const { currentUser } = useRole();
  const [tasks, setTasks] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("ALL");

  // Active form state for responding to a task
  const [activeTask, setActiveTask] = useState<Finding | null>(null);
  const [picResponse, setPicResponse] = useState("");
  const [photoResolutionUrl, setPhotoResolutionUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadTasks = async () => {
    setLoading(true);
    try {
      let filterParams: any = { status: "OPEN" };

      if (currentUser.role === "PIC") {
        // PIC is strictly isolated to their assigned project(s) or their pic ID
        const allowedProjects = currentUser.projectIds && currentUser.projectIds.length > 0
          ? currentUser.projectIds
          : (currentUser.projectId ? [currentUser.projectId] : []);

        if (allowedProjects.length > 0) {
          filterParams.projectIds = allowedProjects;
        } else {
          filterParams.picId = currentUser.id;
        }
      } else if (currentUser.role === "SM") {
        // Site Manager is scoped to their managed projects
        if (currentUser.projectIds && currentUser.projectIds.length > 0) {
          if (selectedProjectFilter !== "ALL") {
            filterParams.projectId = selectedProjectFilter;
          } else {
            filterParams.projectIds = currentUser.projectIds;
          }
        }
      } else {
        // PM, CMD, BOD, ADMIN can view all projects or filter specifically
        if (selectedProjectFilter !== "ALL") {
          filterParams.projectId = selectedProjectFilter;
        }
      }

      const allFindings = await getFindings(filterParams);
      setTasks(allFindings);
    } catch (e) {
      console.error("Gagal memuat tugas PIC:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [currentUser, selectedProjectFilter]);

  const handleOpenResponseForm = (task: Finding) => {
    setActiveTask(task);
    setPicResponse("");
    setPhotoResolutionUrl("");
    setErrorMsg(null);
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask) return;
    setErrorMsg(null);

    if (!picResponse.trim()) {
      setErrorMsg("Mohon tuliskan penjelasan perbaikan yang telah dilakukan.");
      return;
    }
    if (!photoResolutionUrl) {
      setErrorMsg("Mohon unggah foto bukti hasil perbaikan.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await resolveFinding({
        findingId: activeTask.id,
        picResponse,
        photoResolutionUrl,
      });

      if (res.success) {
        setActiveTask(null);
        loadTasks();
      } else {
        setErrorMsg(res.message || "Gagal menyimpan perbaikan.");
      }
    } catch (err: any) {
      setErrorMsg("Terjadi kesalahan: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isStrictPic = currentUser.role === "PIC";
  const isSm = currentUser.role === "SM";
  const isPmOrExec = currentUser.role === "PM" || currentUser.role === "BOD" || currentUser.role === "CMD" || currentUser.role === "ADMIN";

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Header Portal Penanganan Tugas */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/30 border border-purple-400/40 text-purple-300 text-xs font-extrabold rounded-full backdrop-blur-md">
            <CheckSquare size={16} /> Portal Tugas & Respon Lapangan
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            Tugas Saya (Tindak Lanjut Temuan)
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl">
            {isStrictPic
              ? "Daftar temuan 🔴 OPEN yang terisolasi khusus untuk proyek penugasan Anda. Unggah bukti foto hasil pekerjaan di bawah."
              : isSm
              ? "Portal Pengawasan Site Manager (SM) untuk memonitor & merespon progres temuan di beberapa proyek site binaan Anda."
              : "Portal Pengawasan Manajemen & Auditor: Memantau dan menguji alur tindak lanjut temuan seluruh proyek."}
          </p>
        </div>

        <div className="px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-xs space-y-1.5 min-w-[240px]">
          <span className="block text-slate-400 font-semibold">Pengguna & Hak Akses:</span>
          <div className="flex items-center justify-between gap-2">
            <span className="font-extrabold text-sm text-purple-300 truncate">
              {currentUser.name}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-950 text-purple-300 border border-purple-700 shrink-0">
              {currentUser.role}
            </span>
          </div>

          {isStrictPic && currentUser.project && (
            <div className="flex items-center gap-1.5 text-yellow-400 font-bold text-[11px] pt-1.5 border-t border-slate-700/80">
              <MapPin size={13} className="shrink-0" />
              <span className="truncate">Area Proyek: {currentUser.project.name}</span>
            </div>
          )}

          {isSm && (
            <div className="flex items-center gap-1.5 text-teal-300 font-bold text-[11px] pt-1.5 border-t border-slate-700/80">
              <Sparkles size={13} className="shrink-0" />
              <span>Multi-Proyek (SM Area Jabodetabek)</span>
            </div>
          )}

          {isPmOrExec && (
            <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px] pt-1.5 border-t border-slate-700/80">
              <Sparkles size={13} className="shrink-0" />
              <span>Pengawasan Global (Semua Kasus)</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Task List & Project Filter for multi-project users */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Temuan Belum Ditangani</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800">
                {tasks.length} Tiket OPEN
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isStrictPic
                ? `Hanya menampilkan temuan di proyek ${currentUser.project?.name || "penugasan Anda"}.`
                : "Menampilkan temuan sesuai wewenang proyek Anda."}
            </p>
          </div>

          {/* Project Switcher filter if role is SM, PM, CMD, BOD */}
          {!isStrictPic && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                Filter Site:
              </span>
              <select
                value={selectedProjectFilter}
                onChange={(e) => setSelectedProjectFilter(e.target.value)}
                className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="ALL">Semua Proyek Wewenang ({isSm ? "Multi-Site SM" : "Semua Site"})</option>
                <option value="proj-1">Tower Gedung A - SCBD</option>
                <option value="proj-2">Jembatan Layang Ciawi</option>
                <option value="proj-3">RS Medika Utama Surabaya</option>
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500">
            Memuat tugas temuan...
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Tidak Ada Tugas Tertunda!
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Seluruh temuan patroli di area proyek Anda telah ditindaklanjuti atau belum ada temuan baru.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-red-200 dark:border-red-900/60 shadow-md p-6 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-black px-3 py-1 bg-slate-900 text-white rounded-lg">
                      {task.ticketCode}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {task.project && (
                        <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                          {task.project.name.split(" - ")[0]}
                        </span>
                      )}
                      <StatusBadge status="OPEN" size="sm" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                      {task.description}
                    </h3>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-1.5">
                      <MapPin size={16} className="text-red-500 shrink-0" />
                      <span>{task.locationDetail}</span>
                    </p>
                  </div>

                  {/* Foto Temuan Awal */}
                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 h-48 border border-slate-200 dark:border-slate-800">
                    <img
                      src={task.photoFindingUrl}
                      alt="Foto Temuan"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-3 py-1 bg-red-600/90 text-white text-xs font-bold rounded-lg backdrop-blur-md">
                      🔴 Foto Temuan Awal
                    </div>
                  </div>

                  {/* Rejection Note jika ini hasil penolakan PM */}
                  {task.rejectionNote && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-300 rounded-xl text-xs text-red-800 dark:text-red-300 font-semibold space-y-1">
                      <span className="font-extrabold block">⚠️ Catatan Perbaikan Ulang dari PM:</span>
                      <p>"{task.rejectionNote}"</p>
                    </div>
                  )}

                  <div className="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} /> Dilaporkan: {formatDate(task.createdAt)}
                    </span>
                    <span>Pelapor: {task.reporter?.name.split(" ")[0]}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenResponseForm(task)}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] text-base font-extrabold text-white bg-amber-600 hover:bg-amber-700 rounded-2xl shadow-lg hover:shadow-amber-600/20 active:scale-95 transition-all"
                >
                  <CheckSquare size={20} />
                  <span>Tindak Lanjuti (Kirim Bukti Perbaikan)</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL FORM TINDAK LANJUT PIC */}
      {activeTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-5 bg-amber-500 text-slate-950">
              <div className="flex items-center gap-2 font-black text-lg">
                <Sparkles size={22} />
                <span>Form Bukti Perbaikan ({activeTask.ticketCode})</span>
              </div>
              <button
                onClick={() => setActiveTask(null)}
                className="p-2 hover:bg-amber-600 rounded-xl transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="p-6 space-y-6">
              {errorMsg && (
                <div className="p-4 bg-red-50 text-red-800 rounded-2xl border border-red-300 text-sm font-bold flex items-center gap-2">
                  <AlertCircle size={20} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-xs font-extrabold uppercase text-slate-500">
                  Temuan Yang Diperbaiki:
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  "{activeTask.description}"
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  📍 {activeTask.locationDetail}
                </p>
              </div>

              {/* Input Respon / Keterangan */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                  Respon & Rincian Perbaikan Lapangan <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={picResponse}
                  onChange={(e) => setPicResponse(e.target.value)}
                  placeholder="Jelaskan tindakan perbaikan yang telah dilakukan (contoh: Telah dilakukan pembersihan puing, pemasangan barikade K3, dan pengecatan ulang)."
                  required
                  rows={4}
                  className="w-full px-4 py-3.5 text-base rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Upload Foto Hasil Perbaikan */}
              <PhotoUploader
                label="Foto Bukti Perbaikan (Foto Sesudah)"
                description="Ambil foto atau unggah gambar bukti perbaikan yang selesai dikerjakan."
                value={photoResolutionUrl}
                onChange={(url) => setPhotoResolutionUrl(url)}
                required
              />

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTask(null)}
                  className="px-5 py-3.5 min-h-[48px] text-base font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-all dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] text-base font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
                >
                  <Send size={18} />
                  <span>{submitting ? "Mengirim..." : "Kirim Bukti Perbaikan (Ubah ke RESOLVED)"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
