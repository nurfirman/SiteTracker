"use client";

import React, { useState } from "react";
import { Finding } from "../types";
import { StatusBadge } from "./StatusBadge";
import { CategoryBadge } from "./CategoryBadge";
import { formatDate } from "../lib/utils";
import {
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
  UserCheck,
  Calendar,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface SideBySideModalProps {
  finding: Finding | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (findingId: string) => Promise<void>;
  onReject: (findingId: string, note: string) => Promise<void>;
  isPmOrBod?: boolean;
}

export function SideBySideModal({
  finding,
  isOpen,
  onClose,
  onApprove,
  onReject,
  isPmOrBod = true,
}: SideBySideModalProps) {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !finding) return null;

  const handleApproveClick = async () => {
    setSubmitting(true);
    await onApprove(finding.id);
    setSubmitting(false);
    onClose();
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionNote.trim()) return;
    setSubmitting(true);
    await onReject(finding.id, rejectionNote);
    setSubmitting(false);
    setRejectMode(false);
    setRejectionNote("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-slate-900 text-white font-mono text-sm font-extrabold rounded-lg shadow-sm">
              {finding.ticketCode}
            </span>
            <StatusBadge status={finding.status} size="md" />
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-all dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Tutup Modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Detail Informasi Temuan */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CategoryBadge category={finding.category} />
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Calendar size={14} /> Dilaporkan: {formatDate(finding.createdAt)}
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                {finding.description}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-medium">
                <MapPin size={16} className="text-red-500 shrink-0" />
                <span>{finding.locationDetail}</span>
                {finding.project && (
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    ({finding.project.name})
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 pt-2 text-xs border-t border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <UserCheck size={14} className="text-blue-500" /> Reporter (CMD):{" "}
                <strong className="text-slate-800 dark:text-slate-200">{finding.reporter?.name || "CMD Patrol"}</strong>
              </span>
              <span className="flex items-center gap-1">
                <UserCheck size={14} className="text-purple-500" /> PIC Penanganan:{" "}
                <strong className="text-slate-800 dark:text-slate-200">{finding.pic?.name || "PIC Lapangan"}</strong>
              </span>
            </div>
          </div>

          {/* Catatan Penanganan PIC jika ada */}
          {finding.picResponse && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-200 dark:border-amber-800 rounded-2xl space-y-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Sparkles size={16} /> Respon / Bukti Tindak Lanjut PIC
              </span>
              <p className="text-sm font-semibold text-slate-900 dark:text-amber-100">
                "{finding.picResponse}"
              </p>
              {finding.resolvedAt && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Waktu Selesai Tindak Lanjut: {formatDate(finding.resolvedAt)}
                </p>
              )}
            </div>
          )}

          {/* Rejection Note jika ada */}
          {finding.rejectionNote && (
            <div className="p-4 bg-red-50 dark:bg-red-950/40 border-2 border-red-200 dark:border-red-800 rounded-2xl space-y-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-red-800 dark:text-red-300 flex items-center gap-1.5">
                <AlertCircle size={16} /> Catatan Perbaikan Ulang (PM)
              </span>
              <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                "{finding.rejectionNote}"
              </p>
            </div>
          )}

          {/* SIDE BY SIDE IMAGE COMPARISON */}
          <div className="space-y-2">
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span>Perbandingan Foto (Sebelum vs Sesudah)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Foto Sebelum (Temuan Awal) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-3 py-1.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-300 font-extrabold text-xs">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-red-500" />
                    <span>Foto Sebelum (Temuan Awal)</span>
                  </span>
                </div>
                <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-slate-950 shadow-md aspect-video">
                  <img
                    src={finding.photoFindingUrl}
                    alt="Foto Temuan Awal"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Foto Sesudah (Hasil Perbaikan PIC) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 font-extrabold text-xs">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span>Foto Sesudah (Hasil Perbaikan PIC)</span>
                  </span>
                </div>
                <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-slate-950 shadow-md aspect-video">
                  {finding.photoResolutionUrl ? (
                    <img
                      src={finding.photoResolutionUrl}
                      alt="Foto Hasil Perbaikan"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 p-4 text-center">
                      <AlertCircle className="w-10 h-10 mb-2 opacity-50 text-amber-500" />
                      <span className="text-sm font-semibold">Belum Ada Foto Perbaikan</span>
                      <span className="text-xs text-slate-400">PIC belum mengunggah bukti</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700">
          {rejectMode ? (
            <form onSubmit={handleRejectSubmit} className="space-y-3">
              <label className="block text-sm font-bold text-red-800 dark:text-red-300">
                Alasan / Catatan Penolakan Perbaikan (Wajib diisi):
              </label>
              <textarea
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                placeholder="Contoh: Pekerjaan plesteran masih terlihat kasar dan belum dicat ulang sesuai standar."
                required
                rows={3}
                className="w-full px-4 py-3 text-base rounded-xl border-2 border-red-300 focus:border-red-500 focus:outline-none dark:bg-slate-900 dark:text-white"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRejectMode(false)}
                  className="px-5 py-3 min-h-[48px] text-base font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-all dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || !rejectionNote.trim()}
                  className="px-6 py-3 min-h-[48px] text-base font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {submitting ? "Mengirim..." : "Kirim Catatan Revisi (Ubah ke OPEN)"}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
                {finding.status === "RESOLVED"
                  ? "Status tiket saat ini RESOLVED. PM dapat menyetujui atau menolak perbaikan."
                  : `Status tiket: ${finding.status}`}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-3 min-h-[48px] text-base font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-all dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Tutup
                </button>

                {isPmOrBod && finding.status === "RESOLVED" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setRejectMode(true)}
                      disabled={submitting}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[48px] text-base font-bold text-red-700 bg-red-100 hover:bg-red-200 border border-red-300 rounded-xl shadow-xs transition-all active:scale-95 dark:bg-red-950/60 dark:text-red-200 dark:border-red-800"
                    >
                      <XCircle size={20} />
                      <span>Tolak / Perbaikan Ulang</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleApproveClick}
                      disabled={submitting}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[48px] text-base font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg hover:shadow-emerald-600/20 transition-all active:scale-95"
                    >
                      <CheckCircle2 size={20} />
                      <span>Setujui & Selesaikan (CLOSED)</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
