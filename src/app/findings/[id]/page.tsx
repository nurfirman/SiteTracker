"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Finding } from "@/types";
import { getFindingById, validateFinding, resolveFinding, updateFinding, getUsers } from "@/lib/actions";
import { useRole } from "@/components/RoleContext";
import { StatusBadge } from "@/components/StatusBadge";
import { CategoryBadge } from "@/components/CategoryBadge";
import { PhotoUploader } from "@/components/PhotoUploader";
import { GpsButton } from "@/components/GpsButton";
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
  AlertTriangle,
  Sparkles,
  Send,
  Pencil,
  X,
  Save,
} from "lucide-react";
import Link from "next/link";

export default function FindingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useRole();

  const id = params?.id as string;
  const [finding, setFinding] = useState<Finding | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit Modal State (Poin 1)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCategory, setEditCategory] = useState<string>("K3_SAFETY");
  const [editCustomCategory, setEditCustomCategory] = useState<string>("");
  const [editInspectionDate, setEditInspectionDate] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editLocationDetail, setEditLocationDetail] = useState<string>("");
  const [editCoordinates, setEditCoordinates] = useState<string>("");
  const [editPicId, setEditPicId] = useState<string>("");
  const [editPhotoFindingUrl, setEditPhotoFindingUrl] = useState<string>("");
  const [availablePics, setAvailablePics] = useState<any[]>([]);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // PIC inline form state
  const [showPicForm, setShowPicForm] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(true);
  const [noPhotoReason, setNoPhotoReason] = useState("");
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

  const openEditModal = async () => {
    if (!finding) return;
    const isCustom = !["K3_SAFETY", "QUALITY", "KEBERSIHAN_5R", "SCHEDULE", "MATERIAL"].includes(finding.category);
    setEditCategory(isCustom ? "CUSTOM" : finding.category);
    setEditCustomCategory(isCustom ? finding.category : "");
    const rawDate = finding.inspectionDate || finding.createdAt;
    const dateStr = rawDate
      ? (typeof rawDate === "string" ? rawDate.split("T")[0] : new Date(rawDate).toISOString().split("T")[0])
      : new Date().toISOString().split("T")[0];
    setEditInspectionDate(dateStr);
    setEditDescription(finding.description || "");
    setEditLocationDetail(finding.locationDetail || "");
    setEditCoordinates(finding.coordinates || "");
    setEditPicId(finding.picId || "");
    setEditPhotoFindingUrl(finding.photoFindingUrl || "");
    setEditError(null);

    try {
      const pics = await getUsers(finding.projectId, "PIC");
      setAvailablePics(pics);
    } catch (e) {
      console.error("Gagal memuat daftar PIC:", e);
    }
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finding) return;
    setEditError(null);

    const finalCategory = editCategory === "CUSTOM" ? editCustomCategory.trim() : editCategory;
    if (editCategory === "CUSTOM" && !finalCategory) {
      setEditError("Nama kategori patroli custom wajib diisi.");
      return;
    }

    setSubmittingEdit(true);
    try {
      const res = await updateFinding({
        findingId: finding.id,
        category: finalCategory as any,
        description: editDescription.trim() || "Hanya Foto Patroli Lapangan",
        locationDetail: editLocationDetail.trim() || "-",
        coordinates: editCoordinates,
        photoFindingUrl: editPhotoFindingUrl || finding.photoFindingUrl,
        picId: editPicId || finding.picId,
        inspectionDate: editInspectionDate,
      });

      if (res.success) {
        setShowEditModal(false);
        await loadDetail();
      } else {
        setEditError(res.message || "Gagal mengedit data temuan.");
      }
    } catch (err: any) {
      setEditError("Terjadi kesalahan sistem: " + err.message);
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handlePicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finding) return;
    if (!picResponse.trim()) return;
    if (hasPhoto && !photoResolutionUrl) return;
    if (!hasPhoto && !noPhotoReason.trim()) return;

    setSubmittingPic(true);
    await resolveFinding({
      findingId: finding.id,
      picResponse,
      photoResolutionUrl: hasPhoto ? photoResolutionUrl : undefined,
      hasResolutionPhoto: hasPhoto,
      noPhotoReason: !hasPhoto ? noPhotoReason : undefined,
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

  const canEdit = currentUser.role !== "PIC" && currentUser.role !== "PENDING";
  const canVerify = finding.status === "RESOLVED" && (
    currentUser.id === finding.reporterId ||
    ["PM", "GM", "BOD", "ADMIN", "Advisor"].includes(currentUser.role)
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link
          href="/findings"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={18} /> Semua Temuan
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <button
              onClick={openEditModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 border border-violet-300 dark:border-violet-800 rounded-xl hover:bg-violet-100 transition-colors shadow-xs"
              title="Edit Data Temuan"
            >
              <Pencil size={13} />
              <span>Edit Temuan</span>
            </button>
          )}
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
            <div className="flex items-center gap-3 flex-wrap text-xs font-semibold text-slate-500">
              {finding.inspectionDate && (
                <span className="flex items-center gap-1 text-violet-600 dark:text-violet-400 font-bold bg-violet-50 dark:bg-violet-950/60 px-2.5 py-1 rounded-lg">
                  <Calendar size={13} /> Tanggal Inspeksi: {formatDate(finding.inspectionDate).replace(" WIB", "")}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar size={13} /> Dibuat: {formatDate(finding.createdAt)}
              </span>
            </div>
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
                ) : finding.status === "CLOSED" || finding.status === "RESOLVED" ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-amber-500 p-6 text-center bg-amber-950/20">
                    <CheckCircle2 className="w-10 h-10 mb-2 text-amber-500" />
                    <span className="text-sm font-bold text-amber-900 dark:text-amber-200">
                      Diselesaikan Tanpa Foto
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                      {finding.noPhotoReason || finding.rejectionNote || "Perbaikan diselesaikan secara administratif/sistem"}
                    </span>
                  </div>
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
            currentUser.role === "PENDING" ? (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2.5">
                <AlertTriangle size={18} className="shrink-0 text-rose-600 dark:text-rose-400" />
                <span>
                  Akun Anda masih berstatus <strong>PENDING</strong>. Anda belum diizinkan merespon atau mengunggah perbaikan sebelum Administrator menetapkan Role dan Proyek penugasan Anda.
                </span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  Tiket ini berstatus 🔴 <strong>OPEN</strong>. Penanggung Jawab (PIC) dapat mengunggah bukti perbaikan.
                </div>
                <button
                  type="button"
                  onClick={() => setShowPicForm(true)}
                  className="w-full sm:w-auto px-6 py-3.5 min-h-[48px] text-base font-extrabold text-white bg-violet-600 hover:bg-violet-500 rounded-2xl shadow-lg shadow-violet-500/25 active:scale-95 transition-all"
                >
                  Tindak Lanjuti Tiket (Unggah Perbaikan)
                </button>
              </div>
            )
          )}

          {/* Form inline PIC */}
          {showPicForm && (
            <form onSubmit={handlePicSubmit} className="space-y-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 border-violet-300 dark:border-violet-800 shadow-sm">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Form Tindak Lanjut Perbaikan Lapangan
              </h3>

              {/* Pilihan: Ada Foto / Tidak Ada Foto (Poin 8: Default Ada Foto) */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                  Bukti Foto Perbaikan Lapangan <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setHasPhoto(true)}
                    className={`py-2.5 px-3.5 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      hasPhoto
                        ? "border-violet-600 bg-violet-50 text-violet-900 dark:bg-violet-950/60 dark:text-violet-200 dark:border-violet-500 shadow-xs"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${hasPhoto ? "border-violet-600 bg-violet-600" : "border-slate-400"}`}>
                      {hasPhoto && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <span>📷 Ada Foto (Default)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHasPhoto(false)}
                    className={`py-2.5 px-3.5 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      !hasPhoto
                        ? "border-amber-600 bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-500 shadow-xs"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${!hasPhoto ? "border-amber-600 bg-amber-600" : "border-slate-400"}`}>
                      {!hasPhoto && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <span>🚫 Tidak Ada Foto</span>
                  </button>
                </div>
              </div>

              {/* 1. UPLOAD FOTO ATAU ALASAN TANPA FOTO (URUTAN FOTO DULU BARU DESKRIPSI) */}
              {hasPhoto ? (
                <PhotoUploader
                  label="Foto Bukti Perbaikan *"
                  description="Lampirkan foto hasil perbaikan. Anda dapat menandai atau menambahkan caption/panah pada foto."
                  value={photoResolutionUrl}
                  onChange={(url) => setPhotoResolutionUrl(url)}
                  required
                  allowAnnotation={true}
                />
              ) : (
                <div className="space-y-1.5 p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800">
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-200">
                    Alasan Tidak Melampirkan Foto <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={noPhotoReason}
                    onChange={(e) => setNoPhotoReason(e.target.value)}
                    placeholder="Contoh: Pekerjaan administratif / sistem..."
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              )}

              {/* 2. DESKRIPSI PERBAIKAN LAPANGAN */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                  Respon & Keterangan Perbaikan <span className="text-red-500">*</span>
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
                  disabled={submittingPic || !picResponse.trim() || (hasPhoto && !photoResolutionUrl) || (!hasPhoto && !noPhotoReason.trim())}
                  className="px-6 py-3 min-h-[48px] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md disabled:opacity-50"
                >
                  {submittingPic ? "Menyimpan..." : "Kirim Respon Perbaikan (RESOLVED - Menunggu Verifikasi)"}
                </button>
              </div>
            </form>
          )}

          {/* PM / Reporter Verification Controls (Poin 2) */}
          {finding.status === "RESOLVED" && !showRejectForm && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-amber-50/80 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800">
              <div className="text-sm text-slate-700 dark:text-slate-300">
                Tiket ini berstatus 🟡 <strong>RESOLVED (Telah Diperbaiki PIC)</strong>.
                {canVerify
                  ? " Sebagai Pelapor atau Project Manager / Management, silakan tinjau foto perbaikan di atas dan berikan verifikasi:"
                  : ` Menunggu verifikasi dari Pelapor (${finding.reporter?.name || "CMD"}) atau Project Manager.`}
              </div>

              {canVerify && (
                <div className="flex flex-wrap gap-3 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(true)}
                    disabled={submittingPm}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[46px] text-sm font-bold text-red-700 bg-red-100 hover:bg-red-200 border border-red-300 rounded-2xl transition-all"
                  >
                    <XCircle size={18} />
                    <span>Tolak / Perbaikan Ulang</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePmApprove}
                    disabled={submittingPm}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[46px] text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-lg transition-all"
                  >
                    <CheckCircle2 size={18} />
                    <span>Setujui & Selesaikan (CLOSED)</span>
                  </button>
                </div>
              )}
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
                Tiket ini telah 🟢 <strong>CLOSED (Selesai & Diverifikasi)</strong>. Seluruh perbaikan telah tuntas disetujui.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Edit Temuan (Poin 1) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 to-violet-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center text-white">
                  <Pencil size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black">Edit Data Temuan Patroli</h3>
                  <p className="text-xs text-slate-300">Tiket: {finding.ticketCode}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {editError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-300 rounded-xl text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{editError}</span>
                </div>
              )}

              {/* Tanggal Inspeksi */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Calendar size={14} className="text-violet-600" />
                  Tanggal Inspeksi Lapangan *
                </label>
                <input
                  type="date"
                  value={editInspectionDate}
                  onChange={(e) => setEditInspectionDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Kategori */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Kategori Temuan *
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="K3_SAFETY">🛡️ K3 / Keselamatan Kerja</option>
                  <option value="QUALITY">🏗️ Kualitas Pekerjaan</option>
                  <option value="KEBERSIHAN_5R">🧹 Kebersihan 5R</option>
                  <option value="SCHEDULE">⏱️ Jadwal & Progres</option>
                  <option value="MATERIAL">📦 Material & Logistik</option>
                  <option value="CUSTOM">✏️ Kategori Lainnya (Custom)</option>
                </select>
                {editCategory === "CUSTOM" && (
                  <input
                    type="text"
                    value={editCustomCategory}
                    onChange={(e) => setEditCustomCategory(e.target.value)}
                    placeholder="Tulis nama kategori custom..."
                    required
                    className="w-full mt-2 px-3 py-2 text-xs rounded-lg border border-violet-300 bg-violet-50 dark:bg-violet-950/40 text-slate-900 dark:text-white"
                  />
                )}
              </div>

              {/* PIC */}
              {availablePics.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    PIC Penanggung Jawab
                  </label>
                  <select
                    value={editPicId}
                    onChange={(e) => setEditPicId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {availablePics.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Rincian Lokasi */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex justify-between">
                  <span>Rincian Lokasi Spesifik</span>
                  <span className="text-[11px] font-normal text-slate-500">(Opsional)</span>
                </label>
                <input
                  type="text"
                  value={editLocationDetail}
                  onChange={(e) => setEditLocationDetail(e.target.value)}
                  placeholder="Contoh: Lantai 3 - Area Kolom Selatan"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Koordinat GPS */}
              <GpsButton value={editCoordinates} onChange={(coords) => setEditCoordinates(coords)} />

              {/* Ganti Foto Temuan (Opsional) */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <PhotoUploader
                  label="Foto Temuan (Awal) *"
                  description="Ganti foto atau edit anotasi jika diperlukan."
                  value={editPhotoFindingUrl}
                  onChange={(url) => setEditPhotoFindingUrl(url)}
                  allowAnnotation={true}
                />
              </div>

              {/* Deskripsi Temuan */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex justify-between">
                  <span>Deskripsi Temuan Lapangan</span>
                  <span className="text-[11px] font-normal text-slate-500">(Opsional - default: &quot;Hanya Foto Patroli Lapangan&quot;)</span>
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Deskripsi temuan..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-black text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-md disabled:opacity-50"
                >
                  <Save size={16} />
                  <span>{submittingEdit ? "Menyimpan..." : "Simpan Perubahan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
