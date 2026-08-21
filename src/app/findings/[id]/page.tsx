"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Finding } from "@/types";
import { getFindingById, validateFinding, resolveFinding } from "@/lib/actions";
import { useRole } from "@/components/RoleContext";
import { StatusBadge } from "@/components/StatusBadge";
import { CategoryBadge } from "@/components/CategoryBadge";
import { PhotoUploader } from "@/components/PhotoUploader";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Navigation,
  AlertCircle,
  Sparkles,
  Send,
} from "lucide-react";
import Link from "next/link";

export default function FindingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useRole();

  const id = params?.id as string;
  const [finding, setFinding] = useState<Finding | null>(null);
  const [loading, setLoading] = useState(true);

  // PIC inline form state
  const [showPicForm, setShowPicForm] = useState(false);
  const [picResponse, setPicResponse] = useState("");
  const [photoResolutionUrl, setPhotoResolutionUrl] = useState("");
  const [submittingPic, setSubmittingPic] = useState(false);

  // PM reject state
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");
  const [submittingPm, setSubmittingPm] = useState(false);

  const loadDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getFindingById(id);
      setFinding(data);
    } catch (e) {
      console.error("Gagal memuat detail temuan:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const handlePicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finding) return;
    if (!picResponse.trim() || !photoResolutionUrl) return;

    setSubmittingPic(true);
    await resolveFinding({
      findingId: finding.id,
      picResponse,
      photoResolutionUrl,
    });
    setSubmittingPic(false);
    setShowPicForm(false);
    loadDetail();
  };

  const handlePmApprove = async () => {
    if (!finding) return;
    setSubmittingPm(true);
    await validateFinding({ findingId: finding.id, action: "APPROVE" });
    setSubmittingPm(false);
    loadDetail();
  };

  const handlePmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finding || !rejectionNote.trim()) return;

    setSubmittingPm(true);
    await validateFinding({
      findingId: finding.id,
      action: "REJECT",
      rejectionNote,
    });
    setSubmittingPm(false);
    setShowRejectForm(false);
    loadDetail();
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500 font-semibold">
        Memuat detail tiket temuan...
      </div>
    );
  }

  if (!finding) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border space-y-4">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold">Tiket Temuan Tidak Ditemukan</h2>
        <Link href="/" className="inline-block px-4 py-2 bg-slate-900 text-white rounded-xl">
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/findings"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={18} /> Semua Temuan
        </Link>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-black px-3 py-1 bg-slate-900 text-white rounded-lg">
            {finding.ticketCode}
          </span>
          <StatusBadge status={finding.status} size="md" />
        </div>
      </div>

      {/* Main Detail Content Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        {/* Header Info */}
        <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CategoryBadge category={finding.category} />
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Calendar size={14} /> Dilaporkan: {formatDate(finding.createdAt)}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {finding.description}
          </h1>

          <div className="flex flex-wrap gap-4 text-sm font-semibold text-slate-700 dark:text-slate-300 pt-2">
            <span className="flex items-center gap-1.5">
              <MapPin size={18} className="text-red-500" /> Location:{" "}
              <strong>{finding.locationDetail}</strong>
            </span>
            {finding.project && (
              <span className="text-slate-500">
                Proyek: <strong>{finding.project.name}</strong>
              </span>
            )}
          </div>

          {finding.coordinates && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-800 dark:text-blue-200 font-mono">
              <Navigation size={14} />
              <span>GPS: {finding.coordinates}</span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(finding.coordinates)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-bold text-blue-600 hover:text-blue-900"
              >
                Peta
              </a>
            </div>
          )}

          {/* People Involved */}
          <div className="flex flex-wrap gap-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="space-y-0.5">
              <span className="text-slate-400 block font-semibold">Pelapor Patroli (CMD):</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                {finding.reporter?.name || "Budi Santoso (CMD)"}
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="text-slate-400 block font-semibold">PIC Penanggung Jawab:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                {finding.pic?.name || "Ahmad Fauzi (PIC)"}
              </span>
            </div>
          </div>
        </div>

        {/* Respon PIC jika ada */}
        {finding.picResponse && (
          <div className="p-6 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900 space-y-2">
            <span className="text-xs font-black uppercase text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <Sparkles size={16} /> Laporan Perbaikan PIC
            </span>
            <p className="text-base font-bold text-slate-900 dark:text-amber-100">
              "{finding.picResponse}"
            </p>
            {finding.resolvedAt && (
              <span className="text-xs text-amber-700 dark:text-amber-400 block">
                Selesai ditindaklanjuti pada: {formatDate(finding.resolvedAt)}
              </span>
            )}
          </div>
        )}

        {/* Catatan Penolakan PM jika ada */}
        {finding.rejectionNote && (
          <div className="p-6 bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900 space-y-2">
            <span className="text-xs font-black uppercase text-red-800 dark:text-red-300 flex items-center gap-1.5">
              <AlertCircle size={16} /> Catatan Perbaikan Ulang dari PM
            </span>
            <p className="text-base font-bold text-red-900 dark:text-red-200">
              "{finding.rejectionNote}"
            </p>
          </div>
        )}

        {/* SIDE BY SIDE PHOTO DISPLAY */}
        <div className="p-6 sm:p-8 space-y-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">
            Dokumentasi Foto Lapangan (Sebelum vs Sesudah)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Foto Temuan Awal */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3 py-1.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-300 font-extrabold text-xs">
                <span>🔴 Foto Sebelum (Temuan Awal CMD)</span>
              </div>
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-200 dark:border-slate-700 aspect-video shadow-md">
                <img
                  src={finding.photoFindingUrl}
                  alt="Foto Temuan Awal"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Foto Hasil Perbaikan */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 font-extrabold text-xs">
                <span>🟢 Foto Sesudah (Bukti Perbaikan PIC)</span>
              </div>
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-200 dark:border-slate-700 aspect-video shadow-md">
                {finding.photoResolutionUrl ? (
                  <img
                    src={finding.photoResolutionUrl}
                    alt="Foto Perbaikan PIC"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                    <Clock className="w-10 h-10 mb-2 opacity-40 text-amber-500" />
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                      Belum Ada Foto Perbaikan
                    </span>
                    <span className="text-xs text-slate-400">
                      PIC belum mengunggah bukti hasil perbaikan
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls Section */}
        <div className="p-6 sm:p-8 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 space-y-4">
          {/* PIC Tindak Lanjut Form Trigger */}
          {finding.status === "OPEN" && !showPicForm && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-slate-600 dark:text-slate-300">
                Tiket ini berstatus 🔴 <strong>OPEN</strong>. Penanggung Jawab (PIC) dapat mengunggah bukti perbaikan.
              </div>
              <button
                type="button"
                onClick={() => setShowPicForm(true)}
                className="w-full sm:w-auto px-6 py-3.5 min-h-[48px] text-base font-extrabold text-white bg-amber-600 hover:bg-amber-700 rounded-2xl shadow-lg active:scale-95 transition-all"
              >
                Tindak Lanjuti Tiket (Unggah Perbaikan)
              </button>
            </div>
          )}

          {/* Form inline PIC */}
          {showPicForm && (
            <form onSubmit={handlePicSubmit} className="space-y-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 border-amber-300">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Form Tindak Lanjut Perbaikan Lapangan
              </h3>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                  Respon & Keterangan Perbaikan *
                </label>
                <textarea
                  value={picResponse}
                  onChange={(e) => setPicResponse(e.target.value)}
                  placeholder="Jelaskan perbaikan yang sudah diselesaikan..."
                  required
                  rows={3}
                  className="w-full px-4 py-3 text-base rounded-xl border border-slate-300 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <PhotoUploader
                label="Foto Bukti Perbaikan *"
                value={photoResolutionUrl}
                onChange={(url) => setPhotoResolutionUrl(url)}
                required
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPicForm(false)}
                  className="px-4 py-2 text-slate-600 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingPic || !picResponse.trim() || !photoResolutionUrl}
                  className="px-6 py-3 min-h-[48px] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md disabled:opacity-50"
                >
                  {submittingPic ? "Mengirim..." : "Kirim Perbaikan (Ubah ke RESOLVED)"}
                </button>
              </div>
            </form>
          )}

          {/* PM Approve / Reject Controls */}
          {finding.status === "RESOLVED" && !showRejectForm && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-slate-600 dark:text-slate-300">
                Tiket ini berstatus 🟡 <strong>RESOLVED</strong>. Project Manager (PM) dapat memverifikasi perbaikan.
              </div>

              <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowRejectForm(true)}
                  disabled={submittingPm}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] text-base font-bold text-red-700 bg-red-100 hover:bg-red-200 border border-red-300 rounded-2xl transition-all"
                >
                  <XCircle size={20} />
                  <span>Tolak / Perbaikan Ulang</span>
                </button>

                <button
                  type="button"
                  onClick={handlePmApprove}
                  disabled={submittingPm}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] text-base font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-lg transition-all"
                >
                  <CheckCircle2 size={20} />
                  <span>Setujui & Selesaikan (CLOSED)</span>
                </button>
              </div>
            </div>
          )}

          {/* Form inline Reject PM */}
          {showRejectForm && (
            <form onSubmit={handlePmReject} className="space-y-3 bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 border-red-300">
              <label className="block text-sm font-bold text-red-800 dark:text-red-300">
                Alasan Penolakan / Catatan Perbaikan Ulang (Wajib):
              </label>
              <textarea
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                placeholder="Tuliskan catatan perbaikan yang belum memenuhi standar..."
                required
                rows={3}
                className="w-full px-4 py-3 text-base rounded-xl border-2 border-red-300 dark:bg-slate-800 dark:text-white"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="px-4 py-2 font-bold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingPm || !rejectionNote.trim()}
                  className="px-6 py-3 min-h-[48px] text-white bg-red-600 hover:bg-red-700 font-extrabold rounded-xl shadow-md disabled:opacity-50"
                >
                  {submittingPm ? "Mengirim..." : "Kirim Catatan Penolakan (Kembalikan ke OPEN)"}
                </button>
              </div>
            </form>
          )}

          {finding.status === "CLOSED" && (
            <div className="p-4 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-900 dark:text-emerald-200 text-sm font-bold rounded-2xl flex items-center gap-3">
              <CheckCircle2 size={24} className="text-emerald-600" />
              <div>
                Tiket ini telah 🟢 <strong>CLOSED (Selesai & Diverifikasi)</strong>. Seluruh perbaikan telah tuntas disetujui PM.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
