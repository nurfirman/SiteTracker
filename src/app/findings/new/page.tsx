"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Project, User, Category } from "@/types";
import { getProjects, getUsers, createFinding } from "@/lib/actions";
import { useRole } from "@/components/RoleContext";
import { PhotoUploader } from "@/components/PhotoUploader";
import { GpsButton } from "@/components/GpsButton";
import {
  HardHat,
  PlusCircle,
  MapPin,
  Send,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Building2,
  UserCheck,
} from "lucide-react";
import Link from "next/link";

export default function NewFindingPage() {
  const router = useRouter();
  const { currentUser } = useRole();

  const [projects, setProjects] = useState<Project[]>([]);
  const [availablePics, setAvailablePics] = useState<User[]>([]);

  // Form State
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedPicId, setSelectedPicId] = useState<string>("");
  const [category, setCategory] = useState<Category>("K3_SAFETY");
  const [locationDetail, setLocationDetail] = useState("");
  const [coordinates, setCoordinates] = useState("");
  const [description, setDescription] = useState("");
  const [photoFindingUrl, setPhotoFindingUrl] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successTicket, setSuccessTicket] = useState<string | null>(null);

  useEffect(() => {
    async function initData() {
      const pList = await getProjects();
      setProjects(pList);
      if (pList.length > 0) {
        setSelectedProjectId(pList[0].id);
      }
    }
    initData();
  }, []);

  // Automatically filter PIC list based on selected project
  useEffect(() => {
    async function loadPics() {
      if (!selectedProjectId) return;
      const pics = await getUsers(selectedProjectId, "PIC");
      setAvailablePics(pics);
      if (pics.length > 0) {
        setSelectedPicId(pics[0].id);
      } else {
        setSelectedPicId("");
      }
    }
    loadPics();
  }, [selectedProjectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedProjectId) {
      setErrorMsg("Mohon pilih proyek lokasi temuan.");
      return;
    }
    if (!selectedPicId) {
      setErrorMsg("Mohon pilih PIC Penanggung Jawab temuan.");
      return;
    }
    if (!locationDetail.trim()) {
      setErrorMsg("Mohon isi rincian lokasi temuan (contoh: Lantai 3 - Area Coring).");
      return;
    }
    if (!description.trim()) {
      setErrorMsg("Mohon isi deskripsi singkat temuan patroli.");
      return;
    }
    if (!photoFindingUrl) {
      setErrorMsg("Mohon lampirkan/ambil foto temuan patroli.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await createFinding({
        projectId: selectedProjectId,
        picId: selectedPicId,
        reporterId: currentUser.id,
        locationDetail,
        coordinates,
        category,
        description,
        photoFindingUrl,
      });

      if (res.success && res.finding) {
        setSuccessTicket(res.finding.ticketCode);
        setTimeout(() => {
          router.push(`/findings/${res.finding!.id}`);
        }, 1500);
      } else {
        setErrorMsg(res.message || "Gagal menyimpan temuan.");
      }
    } catch (err: any) {
      setErrorMsg("Terjadi kesalahan sistem: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={18} /> Kembali ke Dashboard
        </Link>

        <span className="px-3 py-1 bg-violet-100 dark:bg-violet-950/80 text-violet-900 dark:text-violet-300 border border-violet-300 dark:border-violet-800 text-xs font-extrabold rounded-lg">
          Role Pelapor: {currentUser.name} ({currentUser.role})
        </span>
      </div>

      {/* PENDING ROLE RESTRICTION */}
      {currentUser.role === "PENDING" ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-rose-300 dark:border-rose-900/60 p-8 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            Wewenang Belum Diatur (Status: PENDING)
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Akun Anda baru mendaftar dan belum memiliki wewenang untuk menerbitkan tiket temuan patroli baru. Silakan hubungi <strong>Administrator Proyek</strong> untuk mengonfigurasi role dan proyek penugasan Anda.
          </p>
          <div className="pt-3 flex justify-center gap-3">
            <Link
              href="/"
              className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl"
            >
              Kembali ke Dashboard
            </Link>
            <a
              href={`https://wa.me/6281234567890?text=Halo%20Admin,%20akun%20saya%20(${encodeURIComponent(
                currentUser.email
              )})%20membutuhkan%20setting%20role%20untuk%20catat%20temuan.`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition-all"
            >
              Hubungi Administrator
            </a>
          </div>
        </div>
      ) : (
        /* Main Form Card */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-900 to-violet-950 text-white border-b border-slate-800 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-600 text-white text-xs font-black rounded-lg uppercase tracking-wider">
            <HardHat size={16} /> Formulir Input Temuan Patroli CMD
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            Catat Temuan Baru Lapangan
          </h1>
          <p className="text-sm text-slate-300">
            Isi formulir dengan lengkap. Tiket temuan berstatus 🔴 OPEN akan otomatis diteruskan ke PIC terkait.
          </p>
        </div>

        {successTicket ? (
          <div className="p-12 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Tiket Berhasil Dibuat!
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-300">
              Kode Tiket: <strong className="text-violet-600 dark:text-violet-400 font-mono text-xl">{successTicket}</strong>
            </p>
            <p className="text-sm text-slate-500">
              Mengarahkan ke halaman detail temuan...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {errorMsg && (
              <div className="p-4 bg-red-50 dark:bg-red-950/60 border-2 border-red-300 dark:border-red-800 rounded-2xl flex items-center gap-3 text-red-800 dark:text-red-300 text-sm font-bold">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. PILIH PROYEK & PIC */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                  1. Proyek Konstruksi <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 min-h-[48px] text-base font-semibold rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-violet-500 focus:outline-none"
                  >
                    <option value="">-- Pilih Proyek Lapangan --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                  2. PIC Penanggung Jawab (Subkont) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedPicId}
                    onChange={(e) => setSelectedPicId(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 min-h-[48px] text-base font-semibold rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-violet-500 focus:outline-none"
                  >
                    {availablePics.length === 0 ? (
                      <option value="">-- Tidak Ada PIC untuk proyek ini --</option>
                    ) : (
                      availablePics.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* 2. KATEGORI TEMUAN */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                3. Kategori Temuan Patroli <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                required
                className="w-full px-4 py-3.5 min-h-[48px] text-base font-semibold rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-violet-500 focus:outline-none"
              >
                <option value="K3_SAFETY">🛡️ K3 / Keselamatan Kerja (APD, Barikade, Listrik)</option>
                <option value="QUALITY">🏗️ Kualitas Pekerjaan (Retak, Coring, Plesteran)</option>
                <option value="KEBERSIHAN_5R">🧹 Kebersihan 5R (Sampah Puing, Kerapian Area)</option>
                <option value="SCHEDULE">⏱️ Jadwal & Progres (Keterlambatan, Pekerja Less)</option>
                <option value="MATERIAL">📦 Material & Logistik (Kerusakan, Penyimpanan Basah)</option>
              </select>
            </div>

            {/* 3. RINCIAN LOKASI & GPS */}
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                  4. Rincian Lokasi Spesifik <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={locationDetail}
                  onChange={(e) => setLocationDetail(e.target.value)}
                  placeholder="Contoh: Lantai 3 - Area Coring Sisi Selatan"
                  required
                  className="w-full px-4 py-3.5 min-h-[48px] text-base rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-violet-500 focus:outline-none"
                />
              </div>

              {/* GPS Geolocation Button */}
              <GpsButton value={coordinates} onChange={(coords) => setCoordinates(coords)} />
            </div>

            {/* 4. DESKRIPSI SINGKAT */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                5. Deskripsi Singkat Temuan <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tuliskan temuan secara jelas dan objektif (contoh: 3 pekerja tidak menggunakan helm dan harness saat bekerja di ketinggian 5m)."
                required
                rows={4}
                className="w-full px-4 py-3.5 text-base rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-violet-500 focus:outline-none"
              />
            </div>

            {/* 5. UPLOAD FOTO TEMUAN */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <PhotoUploader
                label="6. Foto Temuan Lapangan (Foto Awal)"
                description="Ambil foto menggunakan kamera HP atau unggah gambar temuan secara jelas."
                value={photoFindingUrl}
                onChange={(url) => setPhotoFindingUrl(url)}
                required
              />
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 min-h-[56px] text-lg font-black text-white bg-violet-600 hover:bg-violet-500 rounded-2xl shadow-xl shadow-violet-500/25 active:scale-98 transition-all disabled:opacity-50"
              >
                <Send className="w-6 h-6" />
                <span>{submitting ? "Menyimpan Tiket..." : "Kirim Tiket Temuan Patroli (OPEN)"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    )}
  </div>
  );
}
