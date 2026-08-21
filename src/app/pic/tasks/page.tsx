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

  // Active form state for responding to a task
  const [activeTask, setActiveTask] = useState<Finding | null>(null);
  const [picResponse, setPicResponse] = useState("");
  const [photoResolutionUrl, setPhotoResolutionUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadTasks = async () => {
    setLoading(true);
    try {
      // Fetch open tasks for PIC or all open if non-PIC user is testing portal
      const allFindings = await getFindings({
        status: "OPEN",
        picId: currentUser.role === "PIC" ? currentUser.id : undefined,
      });
      setTasks(allFindings);
    } catch (e) {
      console.error("Gagal memuat tugas PIC:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [currentUser]);

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

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Header Portal PIC */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/30 border border-purple-400/40 text-purple-300 text-xs font-extrabold rounded-full backdrop-blur-md">
            <CheckSquare size={16} /> Portal Penanganan PIC Lapangan
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            Tugas Saya (Tindak Lanjut Temuan)
          </h1>
          <p className="text-sm text-slate-300">
            Daftar temuan 🔴 OPEN yang perlu Anda perbaiki dan unggah bukti foto hasil pekerjaan.
          </p>
        </div>

        <div className="px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-xs space-y-1">
          <span className="block text-slate-400">Pengguna Aktif:</span>
          <span className="block font-extrabold text-sm text-purple-300">
            {currentUser.name} ({currentUser.role})
          </span>
        </div>
      </div>

      {/* Main Task List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Temuan Belum Ditangani ({tasks.length} Tiket OPEN)
          </h2>
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
              Seluruh temuan temuan patroli di area Anda telah ditindaklanjuti. Luar biasa!
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
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-black px-3 py-1 bg-slate-900 text-white rounded-lg">
                      {task.ticketCode}
                    </span>
                    <StatusBadge status="OPEN" size="sm" />
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
