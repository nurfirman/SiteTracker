"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Project, User, InspectionType, Category } from "@/types";
import {
  getProjects,
  getUsers,
  createBulkPatrolFindings,
  previewNextReportDocNumber,
} from "@/lib/actions";
import { useRole } from "@/components/RoleContext";
import { MultiPhotoUploader } from "@/components/MultiPhotoUploader";
import { ProjectCombobox } from "@/components/ProjectCombobox";
import {
  FileText,
  PlusCircle,
  Building2,
  Calendar,
  Users,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Copy,
  Plus,
  ArrowLeft,
  Loader2,
  Save,
  RotateCcw,
  Sparkles,
  Printer,
  ExternalLink,
  ChevronDown,
  Layers,
  MapPin,
  ClipboardList,
} from "lucide-react";

interface FindingDraftItem {
  tempId: string;
  category: Category;
  customCategory?: string;
  locationDetail: string;
  description: string;
  photoFindingUrls: string[];
  picId: string;
}

const STORAGE_KEY = "sitetracker_bulk_patrol_draft_v1";

export default function BulkPatrolPage() {
  const router = useRouter();
  const { currentUser } = useRole();

  const [projects, setProjects] = useState<Project[]>([]);
  const [availablePics, setAvailablePics] = useState<User[]>([]);

  // Master Header State
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [inspectionDate, setInspectionDate] = useState<string>(todayStr);
  const [inspectionType, setInspectionType] = useState<InspectionType>("ROUTINE");
  const [inspectorName, setInspectorName] = useState<string>("");
  const [presentInspectors, setPresentInspectors] = useState<string>("");
  const [siteManagerName, setSiteManagerName] = useState<string>("");
  const [defaultPicId, setDefaultPicId] = useState<string>("");
  const [reportNumberPreview, setReportNumberPreview] = useState<string>("");

  // Items State
  const [items, setItems] = useState<FindingDraftItem[]>([
    {
      tempId: "item-1",
      category: "QUALITY",
      locationDetail: "",
      description: "",
      photoFindingUrls: [],
      picId: "",
    },
  ]);

  // Status & UI State
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [draftSavedTime, setDraftSavedTime] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    reportNumber: string;
    findingsCount: number;
  } | null>(null);

  // Load initial projects
  useEffect(() => {
    async function init() {
      try {
        const pList = await getProjects();
        setProjects(pList);
        if (pList.length > 0) {
          setSelectedProjectId(pList[0].id);
        }
        if (currentUser?.name) {
          setInspectorName(currentUser.name);
        }
      } catch (e) {
        console.error("Gagal memuat proyek:", e);
      } finally {
        setLoadingInitial(false);
      }
    }
    init();
  }, [currentUser]);

  // Load PICs when project changes & preview doc number
  useEffect(() => {
    async function onProjectChange() {
      if (!selectedProjectId) return;
      try {
        const pics = await getUsers(selectedProjectId, "PIC");
        setAvailablePics(pics);

        const targetProj = projects.find((p) => p.id === selectedProjectId);
        if (pics.length > 0) {
          setDefaultPicId((prev) => prev || pics[0].id);
        }

        // Preview doc number
        const docPreview = await previewNextReportDocNumber(
          targetProj?.division,
          inspectionDate
        );
        setReportNumberPreview(docPreview);
      } catch (err) {
        console.error("Gagal sinkronisasi data proyek:", err);
      }
    }
    onProjectChange();
  }, [selectedProjectId, inspectionDate, projects]);

  // Restore draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
          setItems(parsed.items);
        }
        if (parsed.selectedProjectId) setSelectedProjectId(parsed.selectedProjectId);
        if (parsed.inspectionDate) setInspectionDate(parsed.inspectionDate);
        if (parsed.inspectionType) setInspectionType(parsed.inspectionType);
        if (parsed.inspectorName) setInspectorName(parsed.inspectorName);
        if (parsed.presentInspectors) setPresentInspectors(parsed.presentInspectors);
        if (parsed.siteManagerName) setSiteManagerName(parsed.siteManagerName);
        if (parsed.defaultPicId) setDefaultPicId(parsed.defaultPicId);
        setDraftSavedTime(parsed.savedAt || "Sebelumnya");
      }
    } catch {
      // Abaikan jika parsing gagal
    }
  }, []);

  // Auto-save draft to localStorage
  useEffect(() => {
    if (loadingInitial) return;
    const timer = setTimeout(() => {
      try {
        const payload = {
          selectedProjectId,
          inspectionDate,
          inspectionType,
          inspectorName,
          presentInspectors,
          siteManagerName,
          defaultPicId,
          items,
          savedAt: new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        setDraftSavedTime(payload.savedAt);
      } catch {
        // Abaikan jika kuota localstorage penuh
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [
    selectedProjectId,
    inspectionDate,
    inspectionType,
    inspectorName,
    presentInspectors,
    siteManagerName,
    defaultPicId,
    items,
    loadingInitial,
  ]);

  // Handlers for Items
  const addItem = (count = 1) => {
    const newItems: FindingDraftItem[] = [];
    for (let i = 0; i < count; i++) {
      newItems.push({
        tempId: "item-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        category: "QUALITY",
        locationDetail: "",
        description: "",
        photoFindingUrls: [],
        picId: defaultPicId,
      });
    }
    setItems((prev) => [...prev, ...newItems]);
  };

  const duplicateItem = (index: number) => {
    const target = items[index];
    const duplicated: FindingDraftItem = {
      ...target,
      tempId: "item-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      // Foto tidak diduplikat agar user mengunggah foto baru
      photoFindingUrls: [],
    };
    const next = [...items];
    next.splice(index + 1, 0, duplicated);
    setItems(next);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      // Kosongkan item jika hanya 1
      setItems([
        {
          tempId: "item-" + Date.now(),
          category: "QUALITY",
          locationDetail: "",
          description: "",
          photoFindingUrls: [],
          picId: defaultPicId,
        },
      ]);
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, patch: Partial<FindingDraftItem>) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const handleResetDraft = () => {
    if (confirm("Apakah Anda yakin ingin mereset seluruh formulir draft laporan patroli ini?")) {
      localStorage.removeItem(STORAGE_KEY);
      setItems([
        {
          tempId: "item-" + Date.now(),
          category: "K3_SAFETY",
          locationDetail: "",
          description: "",
          photoFindingUrls: [],
          picId: defaultPicId,
        },
      ]);
      setDraftSavedTime(null);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedProjectId) {
      setErrorMsg("Mohon pilih proyek lokasi patroli.");
      return;
    }

    if (items.length === 0) {
      setErrorMsg("Minimal harus ada 1 temuan dalam laporan patroli.");
      return;
    }

    // Validasi foto temuan di setiap baris
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.photoFindingUrls || it.photoFindingUrls.length === 0) {
        setErrorMsg(
          `Temuan #${i + 1} belum memiliki foto. Harap lampirkan minimal 1 foto per temuan.`
        );
        return;
      }
    }

    setSubmitting(true);

    try {
      const res = await createBulkPatrolFindings({
        projectId: selectedProjectId,
        inspectionDate: inspectionDate || todayStr,
        inspectionType,
        inspectorName: inspectorName.trim() || currentUser?.name || "CMD Inspector",
        presentInspectors: presentInspectors.trim(),
        siteManagerName: siteManagerName.trim(),
        defaultPicId: defaultPicId || undefined,
        items: items.map((it) => ({
          category: it.category === "CUSTOM" && it.customCategory ? (it.customCategory as any) : it.category,
          locationDetail: it.locationDetail.trim() || "-",
          description: it.description.trim() || "Hanya Foto Patroli Lapangan",
          photoFindingUrls: it.photoFindingUrls,
          picId: it.picId || defaultPicId || undefined,
        })),
      });

      if (res.success && res.reportNumber) {
        // Hapus draft setelah berhasil
        localStorage.removeItem(STORAGE_KEY);
        setSuccessResult({
          reportNumber: res.reportNumber,
          findingsCount: res.findingsCount || items.length,
        });
      } else {
        setErrorMsg(res.message || "Gagal menyimpan laporan patroli.");
      }
    } catch (err: any) {
      console.error("Submit bulk error:", err);
      setErrorMsg(err.message || "Terjadi kesalahan jaringan saat menyimpan laporan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/findings"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Kembali ke Daftar Temuan"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300">
                  <Sparkles className="w-3 h-3" /> Master-Detail Mode
                </span>
                {draftSavedTime && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Draft tersimpan ({draftSavedTime})
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                Input Laporan Patroli Cepat (Bulk)
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDraft}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Form
            </button>
            <Link
              href="/reports"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900/60 rounded-xl hover:bg-violet-100 transition-all"
            >
              <FileText className="w-3.5 h-3.5" /> Laporan PDF
            </Link>
          </div>
        </div>

        {/* Banner Info Onsite / Kantor */}
        <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 flex items-start gap-3 text-xs leading-relaxed">
          <ClipboardList className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">Mode Pengisian Gabungan / Kembali ke Kantor:</strong> Gunakan
            formulir ini untuk menginput seluruh hasil temuan patroli lapangan sekaligus setelah kembali ke direksi kit.
            Data header dan item temuan otomatis dihubungkan ke dalam satu nomor laporan resmi. Formulir ini dilengkapi{" "}
            <strong>Auto-Save Draft di Browser</strong> sehingga data Anda aman dari kendala jaringan.
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 flex items-start gap-3 text-xs font-semibold animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
            <button type="button" onClick={() => setErrorMsg(null)} className="text-red-600">
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* MASTER SECTION (HEADER LAPORAN) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-violet-400" />
                <h2 className="font-extrabold text-base tracking-tight">
                  1. Header Laporan Patroli (Master)
                </h2>
              </div>
              {reportNumberPreview && (
                <div className="flex items-center gap-1.5 text-xs bg-slate-800 px-3 py-1 rounded-lg font-mono text-violet-300">
                  <span>Pratinjau No. Dokumen:</span>
                  <span className="font-bold text-white">{reportNumberPreview}</span>
                </div>
              )}
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Proyek */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Proyek Lokasi Patroli <span className="text-red-500">*</span>
                </label>
                <ProjectCombobox
                  projects={projects}
                  value={selectedProjectId}
                  onChange={(val) => setSelectedProjectId(val)}
                  placeholder="Pilih Proyek..."
                />
              </div>

              {/* Tanggal Inspeksi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tanggal Inspeksi Lapangan <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={inspectionDate}
                    onChange={(e) => setInspectionDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500"
                    required
                  />
                </div>
              </div>

              {/* Tipe Patroli */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tipe Patroli / Inspeksi
                </label>
                <select
                  value={inspectionType}
                  onChange={(e) => setInspectionType(e.target.value as InspectionType)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500"
                >
                  <option value="ROUTINE">Patroli Rutin (Harian / Mingguan)</option>
                  <option value="MIDDLE">Middle Inspection (Progress 50%)</option>
                  <option value="FINAL">Final Inspection (Handover)</option>
                  <option value="JOINT">Patrol Gabungan (Bersama Owner / MK)</option>
                </select>
              </div>

              {/* Nama Inspektur Pelapor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Inspektur Utama / Pelapor
                </label>
                <input
                  type="text"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  placeholder="Nama Inspektur CMD..."
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Tim yang Hadir */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tim Inspektur yang Hadir
                </label>
                <input
                  type="text"
                  value={presentInspectors}
                  onChange={(e) => setPresentInspectors(e.target.value)}
                  placeholder="Contoh: Budi (K3), Agus (QC), Hendra (ME)"
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Default Action By Proyek */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Action By (Penanggung Jawab Default)
                </label>
                <select
                  value={defaultPicId}
                  onChange={(e) => {
                    const newPic = e.target.value;
                    setDefaultPicId(newPic);
                    // Update item yang belum punya PIC spesifik
                    setItems((prev) =>
                      prev.map((it) => (!it.picId ? { ...it, picId: newPic } : it))
                    );
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">-- Pilih Action By Default --</option>
                  {availablePics.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* DETAIL SECTION (DAFTAR ITEM TEMUAN) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                <h2 className="font-black text-lg tracking-tight text-slate-900 dark:text-white">
                  2. Daftar Temuan Patroli ({items.length} Item)
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => addItem(1)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" /> Tambah Temuan
                </button>
                <button
                  type="button"
                  onClick={() => addItem(3)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" /> +3 Baris Sekaligus
                </button>
              </div>
            </div>

            {/* List Temuan Cards */}
            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.tempId}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                >
                  {/* Card Header per Item */}
                  <div className="bg-slate-100 dark:bg-slate-800/80 px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-xl bg-violet-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        #{index + 1}
                      </span>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        Item Temuan Ke-{index + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => duplicateItem(index)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors text-xs flex items-center gap-1"
                        title="Duplikat baris ini"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[11px]">Duplikat</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors text-xs flex items-center gap-1"
                        title="Hapus baris ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[11px]">Hapus</span>
                      </button>
                    </div>
                  </div>

                  {/* Card Body per Item */}
                  <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Kolom Kiri: Multi Photo Uploader (1 s.d. 4 foto) */}
                    <div className="lg:col-span-5 space-y-2">
                      <MultiPhotoUploader
                        label={`Foto Temuan #${index + 1}`}
                        description="Lampirkan 1-4 foto (orientasi luas + close-up detail)"
                        values={item.photoFindingUrls}
                        onChange={(urls) => updateItem(index, { photoFindingUrls: urls })}
                        maxPhotos={4}
                        required
                      />
                    </div>

                    {/* Kolom Kanan: Form Field Temuan */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Action By Spesifik */}
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Action By (Penanggung Jawab)
                          </label>
                          <select
                            value={item.picId || defaultPicId}
                            onChange={(e) => updateItem(index, { picId: e.target.value })}
                            className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500"
                          >
                            <option value="">-- Ikuti Action By Default Header --</option>
                            {availablePics.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.role})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Custom Category Input */}
                      {item.category === "CUSTOM" && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Nama Kategori Custom
                          </label>
                          <input
                            type="text"
                            value={item.customCategory || ""}
                            onChange={(e) => updateItem(index, { customCategory: e.target.value })}
                            placeholder="Ketik kategori khusus..."
                            className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                      )}

                      {/* Lokasi Area */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Lokasi Area Temuan
                        </label>
                        <div className="relative">
                          <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            value={item.locationDetail}
                            onChange={(e) => updateItem(index, { locationDetail: e.target.value })}
                            placeholder="Contoh: Lantai 3 Zona Barat, Shaft Lift B-2"
                            className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                      </div>

                      {/* Deskripsi Temuan / Komentar */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Uraian Temuan & Saran Tindakan (Comment)
                        </label>
                        <textarea
                          rows={3}
                          value={item.description}
                          onChange={(e) => updateItem(index, { description: e.target.value })}
                          placeholder="Jelaskan kondisi ketidaksesuaian di lapangan dan arahan perbaikan untuk PIC..."
                          className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500 leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Add Buttons */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => addItem(1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-violet-500 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold shadow-xs hover:text-violet-600 transition-all"
              >
                <Plus className="w-4 h-4 text-violet-600" /> Tambah 1 Baris Temuan Lagi
              </button>
            </div>
          </div>

          {/* STICKY BOTTOM SUBMIT BAR */}
          <div className="sticky bottom-4 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-900 dark:text-white">
                  Siap Simpan {items.length} Temuan Patroli
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                  Nomor dokumen laporan CMD akan dibuat otomatis berurutan
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-lg shadow-violet-500/25 disabled:opacity-60 transition-all min-w-[200px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan Laporan & Temuan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Seluruh Laporan ({items.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* MODAL SUCCESS BATCH */}
        {successResult && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4 animate-in zoom-in-95">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Laporan Patroli Berhasil Disimpan!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Sebanyak <strong>{successResult.findingsCount} temuan</strong> berhasil dicatat dan
                  dihubungkan dengan nomor laporan:
                </p>
                <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono font-bold text-sm text-violet-700 dark:text-violet-300">
                  {successResult.reportNumber}
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Link
                  href={`/reports?reportNumber=${encodeURIComponent(successResult.reportNumber)}`}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-black shadow-md transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Buka & Cetak Laporan PDF</span>
                </Link>

                <Link
                  href="/findings"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>Lihat Daftar Semua Temuan</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
