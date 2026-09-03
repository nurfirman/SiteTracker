"use client";

import React, { useState, useEffect } from "react";
import { Finding, Project, User } from "@/types";
import { getFindings, getProjects, getUsers, sendReportEmail, getMailServiceStatus } from "@/lib/actions";
import { formatDate, getSlaStatus, exportFindingsToCsv } from "@/lib/utils";
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
  UserCheck,
  ClipboardCheck,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
  FileSpreadsheet,
  Mail,
  Send,
  AlertCircle,
  X,
  Users,
} from "lucide-react";
import { useRole } from "@/components/RoleContext";
import Link from "next/link";

export default function ReportsPage() {
  const { currentUser } = useRole();
  const [reportType, setReportType] = useState<"INTERNAL_PATROL" | "EXECUTIVE_REKAP">("INTERNAL_PATROL");
  const [findings, setFindings] = useState<Finding[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Filters
  const [selectedProject, setSelectedProject] = useState<string>("ALL");
  const [selectedPic, setSelectedPic] = useState<string>("ALL");
  const [inspectionType, setInspectionType] = useState<"ROUTINE" | "MIDDLE" | "FINAL">("ROUTINE");
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [customInspector, setCustomInspector] = useState<string>("Budi Santoso (CMD)");
  const [customSiteManager, setCustomSiteManager] = useState<string>("Ir. Aris Munandar");
  
  const [loading, setLoading] = useState(true);

  // Email Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState<string[]>([]);
  const [customEmailInput, setCustomEmailInput] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailNote, setEmailNote] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [mailStatus, setMailStatus] = useState<{ isConfigured: boolean; provider: string; senderEmail: string } | null>(null);
  const [emailToast, setEmailToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showEmailToast = (text: string, type: "success" | "error" = "success") => {
    setEmailToast({ text, type });
    setTimeout(() => setEmailToast(null), 4000);
  };

  // Load Initial Metadata
  useEffect(() => {
    async function loadMeta() {
      try {
        const [pList, uList, mStatus] = await Promise.all([getProjects(), getUsers(), getMailServiceStatus()]);
        setProjects(pList);
        setUsers(uList);
        setMailStatus(mStatus);
        if (pList.length > 0 && selectedProject === "ALL") {
          setSelectedProject(pList[0].id);
        }
      } catch (err) {
        console.error("Gagal memuat metadata:", err);
      }
    }
    loadMeta();
  }, []);

  // Load Findings
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const filters: any = { limit: 1000 };
        if (selectedProject !== "ALL") {
          filters.projectId = selectedProject;
        }
        if (selectedPic !== "ALL") {
          filters.picId = selectedPic;
        }

        const fList = await getFindings(filters);
        setFindings(fList);
      } catch (err) {
        console.error("Gagal memuat data temuan:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedProject, selectedPic]);

  // Filtered PIC options
  const availablePics = users.filter((u) => {
    if (u.role !== "PIC") return false;
    if (selectedProject === "ALL") return true;
    return (
      u.projectId === selectedProject ||
      (u.projectIds && u.projectIds.includes(selectedProject))
    );
  });

  const activeProjectObj = projects.find((p) => p.id === selectedProject);
  const activePicObj = users.find((u) => u.id === selectedPic);

  // Statistics
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

  const handleExportCsv = () => {
    exportFindingsToCsv(
      findings,
      `Internal_Patrol_${selectedProject !== "ALL" ? activeProjectObj?.name || selectedProject : "Semua"}_${Date.now()}.csv`
    );
  };

  const handleOpenEmailModal = () => {
    const projName = activeProjectObj ? activeProjectObj.name : "Seluruh Proyek";
    setEmailSubject(`[Laporan Patroli K3 & Mutu] ${projName} - ${reportDate}`);
    
    // Pre-select related project contacts
    const initialRecipients: string[] = [];
    if (activePicObj?.email) initialRecipients.push(activePicObj.email);
    const relatedUsers = users.filter((u) => u.role === "SM" || u.role === "PM" || u.role === "ADMIN");
    if (relatedUsers.length > 0 && initialRecipients.length === 0) {
      initialRecipients.push(relatedUsers[0].email);
    }
    setEmailRecipients(initialRecipients);
    setShowEmailModal(true);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailRecipients.length === 0) {
      showEmailToast("Pilih minimal satu penerima email.", "error");
      return;
    }

    setSendingEmail(true);
    try {
      const res = await sendReportEmail({
        projectId: selectedProject,
        projectName: activeProjectObj ? activeProjectObj.name : "Seluruh Proyek",
        recipients: emailRecipients,
        subject: emailSubject,
        reportType: reportType,
        messageNote: emailNote,
        findingsCount: totalFindings,
        openCount: totalOpen,
        resolvedCount: totalResolved,
        closedCount: totalClosed,
        inspectorName: customInspector,
        siteManagerName: customSiteManager,
        reportDate: reportDate,
      });

      if (res.success) {
        showEmailToast(res.message);
        setShowEmailModal(false);
      } else {
        showEmailToast(res.message, "error");
      }
    } catch (err: any) {
      showEmailToast(err.message || "Gagal mengirim email", "error");
    } finally {
      setSendingEmail(false);
    }
  };

  const toggleRecipient = (email: string) => {
    if (emailRecipients.includes(email)) {
      setEmailRecipients(emailRecipients.filter((e) => e !== email));
    } else {
      setEmailRecipients([...emailRecipients, email]);
    }
  };

  const handleAddCustomEmail = () => {
    if (customEmailInput.trim() && customEmailInput.includes("@")) {
      if (!emailRecipients.includes(customEmailInput.trim())) {
        setEmailRecipients([...emailRecipients, customEmailInput.trim()]);
      }
      setCustomEmailInput("");
    }
  };

  const formattedInspectionDate = reportDate
    ? new Date(reportDate).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : formatDate(new Date());

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-3 sm:p-6 lg:p-8 font-sans print:p-0 print:m-0 print:bg-white print:text-black">
      {/* Toast Notification */}
      {emailToast && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-2xl border shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200 text-xs font-black ${
            emailToast.type === "success"
              ? "bg-slate-900 text-emerald-400 border-emerald-500/50"
              : "bg-red-950 text-red-300 border-red-800"
          }`}
        >
          {emailToast.type === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle size={18} className="text-red-400 shrink-0" />
          )}
          <span>{emailToast.text}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        {currentUser.role === "PENDING" ? (
          <div className="p-8 sm:p-12 bg-white dark:bg-slate-900 border-2 border-dashed border-amber-300 dark:border-amber-800/80 rounded-3xl text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              Modul Laporan Dikosongkan
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Akun Anda masih berstatus <strong>PENDING</strong>. Fasilitas cetak form inspeksi dan rekapitulasi eksekutif hanya dapat diakses setelah peran dan proyek penugasan Anda disetujui Administrator.
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-block"
              >
                Kembali ke Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* CONTROLS & FILTER BAR */}
            <div className="print:hidden bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 text-xs font-black tracking-widest uppercase">
                    <FileText size={16} /> Modul Generate Laporan & Distribusi
                  </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Cetak Form Patroli Lapangan & Pengiriman Email
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Pilih filter <strong>Proyek</strong> dan <strong>PIC</strong> untuk generate lembar resmi <strong>INTERNAL PATROL</strong> atau kirim langsung ke personil via email.
              </p>
            </div>

            {/* Print, Export & Email Actions */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={handleOpenEmailModal}
                disabled={findings.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all min-h-[44px] disabled:opacity-50"
              >
                <Mail size={16} />
                <span>Kirim Email Laporan</span>
              </button>

              <button
                onClick={handleExportCsv}
                disabled={findings.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all min-h-[44px] disabled:opacity-50"
              >
                <Download size={16} />
                <span>Ekspor CSV</span>
              </button>

              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-black text-sm rounded-xl shadow-lg shadow-violet-500/25 transition-all min-h-[44px]"
              >
                <Printer size={18} />
                <span>Cetak / PDF</span>
              </button>
            </div>
          </div>

          {/* Report Mode Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <button
              onClick={() => setReportType("INTERNAL_PATROL")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                reportType === "INTERNAL_PATROL"
                  ? "bg-violet-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              <ClipboardCheck size={16} />
              <span>Form Template "INTERNAL PATROL" (Standar Fisik)</span>
            </button>

            <button
              onClick={() => setReportType("EXECUTIVE_REKAP")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                reportType === "EXECUTIVE_REKAP"
                  ? "bg-violet-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              <Layers size={16} />
              <span>Rekapitulasi Tabel & Statistik Temuan</span>
            </button>
          </div>

          {/* Filter Form Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            {/* Filter 1: Project */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Building2 size={13} className="text-violet-600 dark:text-violet-400" /> Filter Proyek
              </label>
              <select
                value={selectedProject}
                onChange={(e) => {
                  setSelectedProject(e.target.value);
                  setSelectedPic("ALL");
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white min-h-[44px]"
              >
                <option value="ALL">-- Semua Proyek --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter 2: PIC */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <UserCheck size={13} className="text-violet-600 dark:text-violet-400" /> Filter PIC (Penanggung Jawab)
              </label>
              <select
                value={selectedPic}
                onChange={(e) => setSelectedPic(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white min-h-[44px]"
              >
                <option value="ALL">-- Semua PIC di Proyek Ini --</option>
                {availablePics.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.phoneNumber})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter 3: Jenis Inspeksi */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <CheckSquare size={13} className="text-violet-600 dark:text-violet-400" /> Jenis Inspeksi
              </label>
              <select
                value={inspectionType}
                onChange={(e) => setInspectionType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white min-h-[44px]"
              >
                <option value="ROUTINE">Routine Inspection (Inspeksi Rutin)</option>
                <option value="MIDDLE">Middle Inspection (Inspeksi Berkala)</option>
                <option value="FINAL">Final Inspection (Inspeksi Akhir)</option>
              </select>
            </div>

            {/* Filter 4: Tanggal Laporan */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} className="text-violet-600 dark:text-violet-400" /> Tanggal Laporan
              </label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white min-h-[44px]"
              />
            </div>
          </div>

          {/* Inspector & Site Manager fields */}
          {reportType === "INTERNAL_PATROL" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Nama Inspector (Pengawas / CMD):
                </label>
                <input
                  type="text"
                  value={customInspector}
                  onChange={(e) => setCustomInspector(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200"
                  placeholder="e.g. Budi Santoso (CMD)"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Nama Site Manager (SM Proyek):
                </label>
                <input
                  type="text"
                  value={customSiteManager}
                  onChange={(e) => setCustomSiteManager(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200"
                  placeholder="e.g. Ir. Aris Munandar"
                />
              </div>
            </div>
          )}
        </div>

        {/* VIEW 1: INTERNAL PATROL STANDARD FORM */}
        {reportType === "INTERNAL_PATROL" && (
          <div className="bg-white text-black p-4 sm:p-8 md:p-10 rounded-2xl border border-slate-300 shadow-xl print:shadow-none print:border-none print:p-0 print:m-0 font-sans">
            <div className="text-center pb-2">
              <h2 className="text-xl sm:text-2xl font-black tracking-widest uppercase border-b-2 border-black pb-1.5 inline-block">
                INTERNAL PATROL
              </h2>
            </div>

            <div className="mt-3 border-2 border-black text-xs font-semibold">
              <div className="grid grid-cols-12 border-b border-black">
                <div className="col-span-2 sm:col-span-2 p-1.5 font-bold border-r border-black bg-slate-50 print:bg-transparent">
                  Project
                </div>
                <div className="col-span-10 sm:col-span-10 p-1.5 font-bold uppercase">
                  {activeProjectObj ? activeProjectObj.name : "SEMUA PROYEK"} {activeProjectObj ? `(${activeProjectObj.location})` : ""}
                </div>
              </div>

              <div className="grid grid-cols-12 border-b border-black">
                <div className="col-span-2 sm:col-span-2 p-1.5 font-bold border-r border-black bg-slate-50 print:bg-transparent">
                  Date
                </div>
                <div className="col-span-4 sm:col-span-4 p-1.5 border-r border-black">
                  {formattedInspectionDate}
                </div>
                <div className="col-span-2 sm:col-span-2 p-1.5 font-bold border-r border-black bg-slate-50 print:bg-transparent">
                  Site Manager
                </div>
                <div className="col-span-4 sm:col-span-4 p-1.5 font-bold">
                  {customSiteManager || "-"}
                </div>
              </div>

              <div className="grid grid-cols-12">
                <div className="col-span-2 sm:col-span-2 p-1.5 font-bold border-r border-black bg-slate-50 print:bg-transparent">
                  Inspector
                </div>
                <div className="col-span-4 sm:col-span-4 p-1.5 border-r border-black font-bold">
                  {customInspector || "-"}
                </div>
                <div className="col-span-2 sm:col-span-2 p-1.5 font-bold border-r border-black bg-slate-50 print:bg-transparent">
                  Status
                </div>
                <div className="col-span-4 sm:col-span-4 p-1.5 flex items-center gap-3 sm:gap-4 flex-wrap text-[11px]">
                  <span className="inline-flex items-center gap-1">
                    {inspectionType === "FINAL" ? (
                      <CheckSquare size={13} className="stroke-[2.5]" />
                    ) : (
                      <Square size={13} />
                    )}
                    <span>Final Inspection</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    {inspectionType === "MIDDLE" ? (
                      <CheckSquare size={13} className="stroke-[2.5]" />
                    ) : (
                      <Square size={13} />
                    )}
                    <span>Middle Inspection</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    {inspectionType === "ROUTINE" ? (
                      <CheckSquare size={13} className="stroke-[2.5]" />
                    ) : (
                      <Square size={13} />
                    )}
                    <span>Routine Inspection</span>
                  </span>
                </div>
              </div>
            </div>

            {selectedPic !== "ALL" && (
              <div className="mt-2 text-xs font-bold text-slate-700 print:text-black">
                PIC Penanggung Jawab Terpilih: <span className="underline">{activePicObj?.name}</span> ({activePicObj?.phoneNumber})
              </div>
            )}

            <div className="mt-4">
              {loading ? (
                <div className="py-16 text-center text-slate-500 font-bold">
                  Memuat data temuan patroli...
                </div>
              ) : findings.length === 0 ? (
                <div className="py-12 text-center border-2 border-black font-bold text-slate-500">
                  Tidak ada data temuan untuk filter Proyek & PIC ini.
                </div>
              ) : (
                <table className="w-full border-collapse border-2 border-black text-xs">
                  <thead>
                    <tr className="border-b-2 border-black bg-slate-100 print:bg-slate-100 font-black text-center">
                      <th className="w-10 border-r border-black p-2">NO</th>
                      <th className="w-1/2 border-r border-black p-2 uppercase tracking-wide">
                        Patrol Photograph
                      </th>
                      <th className="w-1/2 p-2 uppercase tracking-wide">
                        Confirm Countermeasure
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {findings.map((item, index) => {
                      return (
                        <tr key={item.id} className="border-b-2 border-black break-inside-avoid">
                          <td className="border-r border-black p-2 text-center font-black align-top">
                            {index + 1}
                          </td>

                          <td className="border-r border-black p-3 align-top space-y-2">
                            <div className="w-full bg-slate-100 border border-slate-300 rounded overflow-hidden flex items-center justify-center min-h-[160px] max-h-[220px]">
                              {item.photoFindingUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.photoFindingUrl}
                                  alt={`Foto Temuan ${item.ticketCode}`}
                                  className="w-full h-44 object-cover object-center"
                                />
                              ) : (
                                <div className="text-slate-400 text-xs italic">
                                  Foto patroli tidak tersedia
                                </div>
                              )}
                            </div>
                            
                            <div className="pt-1 text-[11px] leading-relaxed">
                              <p className="font-bold">
                                Comment :
                              </p>
                              <p className="text-slate-800 print:text-black mt-0.5">
                                <span className="font-semibold">[{item.ticketCode} - {item.locationDetail}]:</span> {item.description}
                              </p>
                              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 print:text-slate-700">
                                <span>Kategori: <strong>{item.category}</strong></span>
                                <span>PIC: <strong>{item.pic?.name || "Unassigned"}</strong></span>
                              </div>
                            </div>
                          </td>

                          <td className="p-3 align-top space-y-2">
                            <div className="w-full bg-slate-50 border border-slate-300 rounded overflow-hidden flex items-center justify-center min-h-[160px] max-h-[220px]">
                              {item.photoResolutionUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.photoResolutionUrl}
                                  alt={`Foto Perbaikan ${item.ticketCode}`}
                                  className="w-full h-44 object-cover object-center"
                                />
                              ) : (
                                <div className="p-4 text-center text-slate-400 text-xs italic border border-dashed border-slate-300 rounded w-full h-44 flex flex-col items-center justify-center">
                                  <span>[ Belum Ada Foto Tindakan Perbaikan ]</span>
                                  <span className="text-[10px] mt-1 text-slate-400 font-normal">
                                    Status: {item.status}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="pt-1 text-[11px] leading-relaxed">
                              <p className="font-bold">
                                Comment :
                              </p>
                              <p className="text-slate-800 print:text-black mt-0.5">
                                {item.picResponse ? (
                                  item.picResponse
                                ) : (
                                  <span className="italic text-slate-400">
                                    (Menunggu tindakan perbaikan dari PIC di lapangan)
                                  </span>
                                )}
                              </p>
                              {item.resolvedAt && (
                                <p className="text-[10px] text-slate-500 print:text-slate-700 mt-1">
                                  Tgl Perbaikan: {formatDate(item.resolvedAt)}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-4 pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-semibold">
              <div className="italic text-slate-800 print:text-black font-bold">
                * Konfirmasi perbaikan selambat - lambatnya 14 hari kerja harus respon
              </div>
              <div className="text-[11px] text-slate-500 print:text-slate-700">
                SiteTracker CMD Patrol System • ISO 45001 & ISO 9001
              </div>
            </div>

            <div className="mt-8 pt-4 border-t-2 border-black grid grid-cols-3 gap-4 text-center text-xs">
              <div>
                <p className="font-bold mb-14">Inspector CMD / K3</p>
                <p className="font-black underline uppercase">({customInspector || "Budi Santoso"})</p>
                <p className="text-[10px] text-slate-500">Field QC & Safety Officer</p>
              </div>
              <div>
                <p className="font-bold mb-14">PIC Subkontraktor</p>
                <p className="font-black underline uppercase">
                  ({activePicObj ? activePicObj.name : "Ahmad Fauzi"})
                </p>
                <p className="text-[10px] text-slate-500">Site Engineer Penanggung Jawab</p>
              </div>
              <div>
                <p className="font-bold mb-14">Site Manager / PM</p>
                <p className="font-black underline uppercase">({customSiteManager || "Ir. Aris Munandar"})</p>
                <p className="text-[10px] text-slate-500">Pimpinan Lapangan Proyek</p>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: EXECUTIVE REKAP & KPI STATISTIK */}
        {reportType === "EXECUTIVE_REKAP" && (
          <div className="bg-white dark:bg-slate-900 print:bg-white print:text-black p-6 sm:p-10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl print:shadow-none print:border-none space-y-8 font-sans">
            <div className="border-b-2 border-slate-900 dark:border-slate-700 print:border-black pb-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-violet-600 text-white rounded-2xl print:bg-black print:text-white">
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
                <p>
                  Proyek: <span className="font-bold">{activeProjectObj ? activeProjectObj.name : "Seluruh Proyek"}</span>
                </p>
                <p>
                  PIC: <span className="font-bold">{activePicObj ? activePicObj.name : "Semua PIC"}</span>
                </p>
              </div>
            </div>

            {/* Metrics */}
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
                  <p className="text-xs font-bold text-red-600 print:text-red-800">Status OPEN</p>
                  <p className="text-2xl font-black text-red-700 dark:text-red-400 print:text-red-800 mt-1">{totalOpen}</p>
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 print:bg-amber-50 rounded-2xl border border-amber-200 dark:border-amber-800 print:border-amber-300">
                  <p className="text-xs font-bold text-amber-600 print:text-amber-800">Status RESOLVED</p>
                  <p className="text-2xl font-black text-amber-700 dark:text-amber-400 print:text-amber-800 mt-1">{totalResolved}</p>
                </div>
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 print:bg-emerald-50 rounded-2xl border border-emerald-200 dark:border-emerald-800 print:border-emerald-300">
                  <p className="text-xs font-bold text-emerald-600 print:text-emerald-800">Status CLOSED</p>
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 print:text-emerald-800 mt-1">{totalClosed}</p>
                </div>
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 print:bg-rose-50 rounded-2xl border border-rose-200 dark:border-rose-800 print:border-rose-300 col-span-2 sm:col-span-1">
                  <p className="text-xs font-bold text-rose-600 print:text-rose-800">OVERDUE SLA</p>
                  <p className="text-2xl font-black text-rose-700 dark:text-rose-400 print:text-rose-800 mt-1">{totalOverdue}</p>
                </div>
              </div>
            </div>

            {/* Detailed Table */}
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

            <div className="pt-10 border-t border-slate-300 dark:border-slate-800 print:border-slate-400 grid grid-cols-3 gap-8 text-center text-xs">
              <div>
                <p className="text-slate-500 font-bold mb-12">Disiapkan Oleh (Inspector CMD)</p>
                <p className="font-extrabold text-slate-900 dark:text-white print:text-black uppercase">( {customInspector || "Budi Santoso"} )</p>
                <p className="text-[11px] text-slate-500">Field QC & Safety Officer</p>
              </div>
              <div>
                <p className="text-slate-500 font-bold mb-12">Ditindaklanjuti (PIC Lapangan)</p>
                <p className="font-extrabold text-slate-900 dark:text-white print:text-black uppercase">
                  ( {activePicObj ? activePicObj.name : "Ahmad Fauzi"} )
                </p>
                <p className="text-[11px] text-slate-500">Site Engineer Subkontraktor</p>
              </div>
              <div>
                <p className="text-slate-500 font-bold mb-12">Disetujui Oleh (Site Manager / PM)</p>
                <p className="font-extrabold text-slate-900 dark:text-white print:text-black uppercase">( {customSiteManager || "Ir. Aris Munandar"} )</p>
              </div>
            </div>
          </div>
        )}
      </>
    )}
  </div>

      {/* EMAIL REPORT MODAL */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Mail size={20} className="text-violet-600 dark:text-violet-400" />
                  <span>Kirim Email Laporan Patroli</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Distribusi laporan resmi via Microsoft Azure Entra ID / Graph API.
                </p>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Status Provider Koneksi Azure */}
            <div
              className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-2 ${
                mailStatus?.isConfigured
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                  : "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Sparkles size={16} className={mailStatus?.isConfigured ? "text-emerald-600" : "text-amber-600"} />
                <span className="font-bold truncate">
                  {mailStatus?.isConfigured
                    ? `Azure OAuth Aktif: Pengirim ${mailStatus.senderEmail}`
                    : "Koneksi Azure OAuth belum diisi di .env (Berjalan dalam Mode Simulasi)"}
                </span>
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-white/70 dark:bg-slate-900 shrink-0">
                {mailStatus?.isConfigured ? "Live Graph API" : "Simulasi"}
              </span>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-4">
              {/* Recipient Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Penerima Laporan:</span>
                  <span className="text-[11px] text-violet-600 dark:text-violet-400 font-semibold">{emailRecipients.length} Terpilih</span>
                </label>

                {/* Quick Checkboxes for Users */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {users.map((u) => {
                    const isChecked = emailRecipients.includes(u.email);
                    return (
                      <button
                        type="button"
                        key={u.id}
                        onClick={() => toggleRecipient(u.email)}
                        className={`text-left p-2 rounded-xl text-xs border transition-all flex items-center justify-between gap-2 ${
                          isChecked
                            ? "bg-violet-50 dark:bg-violet-950/60 border-violet-500/80 text-violet-700 dark:text-violet-300 font-bold"
                            : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        <div className="truncate">
                          <p className="truncate font-semibold">{u.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 shrink-0">
                          {u.role}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Email Input */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="email"
                    value={customEmailInput}
                    onChange={(e) => setCustomEmailInput(e.target.value)}
                    placeholder="Tambah email lain (e.g. direksi@owner.co.id)"
                    className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomEmail}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl"
                  >
                    + Tambah
                  </button>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Subjek Email <span className="text-violet-600 dark:text-violet-400">*</span>
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Message Note */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  value={emailNote}
                  onChange={(e) => setEmailNote(e.target.value)}
                  rows={2}
                  placeholder="Mohon segera ditindaklanjuti untuk temuan berkategori K3 dalam 24 jam."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Summary of Report */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                <p className="font-bold text-slate-800 dark:text-white">
                  Ringkasan Lampiran Dokumen:
                </p>
                <p>Format: <strong>{reportType === "INTERNAL_PATROL" ? "Form Standar Internal Patrol" : "Rekapitulasi Eksekutif"}</strong></p>
                <p>Total Temuan Terlampir: <strong>{totalFindings} Tiket</strong> (Open: {totalOpen}, Resolved: {totalResolved}, Closed: {totalClosed})</p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-black text-xs rounded-xl shadow-md shadow-violet-500/25 disabled:opacity-50"
                >
                  <Send size={14} />
                  <span>{sendingEmail ? "Mengirimkan Email..." : "Kirim Email Sekarang"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
