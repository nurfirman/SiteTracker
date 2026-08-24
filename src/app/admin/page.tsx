"use client";

import React, { useState, useEffect } from "react";
import { useRole } from "@/components/RoleContext";
import { User, Role, ROLE_LABELS, Project } from "@/types";
import {
  getUsers,
  getProjects,
  getDatabaseStatus,
  seedDatabase,
  createProject,
  createOrUpdatePicUser,
} from "@/lib/actions";
import {
  Sliders,
  ShieldCheck,
  Users,
  Building2,
  Clock,
  Database,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  KeyRound,
  Save,
  RefreshCw,
  PlusCircle,
  Phone,
  Mail,
  MapPin,
  Lock,
  UserCheck,
  FolderPlus,
  UserPlus,
} from "lucide-react";

export default function AdminSettingsPage() {
  const { currentUser } = useRole();
  const [activeTab, setActiveTab] = useState<"matrix" | "projects_pics" | "users" | "settings">("projects_pics");
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [dbStatus, setDbStatus] = useState<{ isConnected: boolean; mode: string }>({
    isConnected: false,
    mode: "Loading...",
  });
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  // Forms State for Adding Project
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectLocation, setNewProjectLocation] = useState("");
  const [projectSubmitting, setProjectSubmitting] = useState(false);

  // Forms State for Adding / Assigning PIC
  const [showAddPicModal, setShowAddPicModal] = useState(false);
  const [newPicName, setNewPicName] = useState("");
  const [newPicEmail, setNewPicEmail] = useState("");
  const [newPicPhone, setNewPicPhone] = useState("");
  const [newPicPassword, setNewPicPassword] = useState("123");
  const [newPicProjectId, setNewPicProjectId] = useState("");
  const [picSubmitting, setPicSubmitting] = useState(false);

  // Toast / Feedback message
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Settings mock state
  const [slaK3, setSlaK3] = useState(24);
  const [slaQuality, setSlaQuality] = useState(48);
  const [sla5R, setSla5R] = useState(48);
  const [waNotificationEnabled, setWaNotificationEnabled] = useState(true);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadAdminData = async () => {
    try {
      const [uList, pList, status] = await Promise.all([
        getUsers(),
        getProjects(),
        getDatabaseStatus(),
      ]);
      setUsers(uList);
      setProjects(pList);
      setDbStatus(status);
      if (pList.length > 0 && !newPicProjectId) {
        setNewPicProjectId(pList[0].id);
      }
    } catch (err) {
      console.error("Gagal memuat data admin:", err);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setProjectSubmitting(true);
    try {
      const res = await createProject({
        name: newProjectName,
        location: newProjectLocation,
      });
      if (res.success) {
        showToast(res.message || "Proyek baru berhasil dibuat!");
        setNewProjectName("");
        setNewProjectLocation("");
        setShowAddProjectModal(false);
        loadAdminData();
      } else {
        showToast(res.message || "Gagal membuat proyek.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Terjadi kesalahan.", "error");
    } finally {
      setProjectSubmitting(false);
    }
  };

  const handleCreatePic = async (e: React.FormEvent) => {
    e.preventDefault();
    setPicSubmitting(true);
    try {
      const res = await createOrUpdatePicUser({
        name: newPicName,
        email: newPicEmail,
        phoneNumber: newPicPhone,
        projectId: newPicProjectId,
        password: newPicPassword,
      });
      if (res.success) {
        showToast(res.message || "PIC baru berhasil ditugaskan!");
        setNewPicName("");
        setNewPicEmail("");
        setNewPicPhone("");
        setShowAddPicModal(false);
        loadAdminData();
      } else {
        showToast(res.message || "Gagal menambahkan PIC.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Terjadi kesalahan.", "error");
    } finally {
      setPicSubmitting(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMessage(null);
    try {
      const res = await seedDatabase();
      setSeedMessage(res.message);
      loadAdminData();
    } catch (e: any) {
      setSeedMessage("Gagal: " + e.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Konfigurasi SLA & Webhook berhasil disimpan!");
  };

  // Matrix definition with SM, PM, CMD, BOD, PIC, ADMIN
  const permissionMatrix = [
    {
      feature: "Cakupan Visibilitas Kasus & Proyek",
      description: "Wewenang melihat daftar temuan lintas proyek konstruksi",
      cmd: "Semua Proyek (Global)",
      pic: "Terisolasi Proyeknya Saja",
      sm: "Multi-Proyek Binaan",
      pm: "Multi-Proyek Utama",
      bod: "Semua Proyek (Global)",
      admin: "Semua Proyek (Master)",
      isBadgeRow: true,
    },
    {
      feature: "Pencatatan Temuan Baru (/findings/new)",
      description: "Mengambil foto temuan, input GPS, dan menerbitkan tiket OPEN",
      cmd: true,
      pic: false,
      sm: true,
      pm: true,
      bod: true,
      admin: true,
    },
    {
      feature: "Tindak Lanjut & Upload Bukti (/pic/tasks)",
      description: "Mengunggah foto sesudah perbaikan dan mengisi respon PIC",
      cmd: false,
      pic: true,
      sm: true,
      pm: true,
      bod: false,
      admin: true,
    },
    {
      feature: "Verifikasi Side-by-Side (Approve / Reject)",
      description: "Otoritas memvalidasi perbaikan dan menutup tiket (CLOSED) atau revisi",
      cmd: false,
      pic: false,
      sm: false,
      pm: true,
      bod: true,
      admin: true,
    },
    {
      feature: "Cetak Rekapitulasi & Ekspor CSV (/reports)",
      description: "Menghasilkan dokumen resmi ISO 45001 dan unduh spreadsheet data",
      cmd: true,
      pic: true,
      sm: true,
      pm: true,
      bod: true,
      admin: true,
    },
    {
      feature: "Pengisian Master Proyek & Alokasi PIC (/admin)",
      description: "Menambahkan proyek konstruksi baru dan menugaskan PIC/SM area",
      cmd: false,
      pic: false,
      sm: false,
      pm: false,
      bod: false,
      admin: true,
    },
    {
      feature: "Konfigurasi Sistem & Parameter SLA (/admin)",
      description: "Mengubah toleransi SLA, webhook notifikasi, dan reset database",
      cmd: false,
      pic: false,
      sm: false,
      pm: true,
      bod: true,
      admin: true,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-2xl border shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200 text-xs font-black ${
            toastMsg.type === "success"
              ? "bg-slate-900 text-emerald-400 border-emerald-500/50"
              : "bg-red-950 text-red-300 border-red-800"
          }`}
        >
          {toastMsg.type === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle size={18} className="text-red-400 shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header Administrator */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-yellow-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/20 border border-yellow-400/30 text-yellow-300 text-xs font-black rounded-full backdrop-blur-md">
            <Sliders size={14} /> Administrator Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Tata Kelola Proyek, PIC & Hak Akses
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl">
            Modul administrator untuk mengelola master proyek, penugasan PIC per lokasi site, dan matriks izin peran (*Role Matrix*).
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setShowAddProjectModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95"
          >
            <FolderPlus size={16} />
            <span>+ Tambah Proyek</span>
          </button>

          <button
            onClick={() => setShowAddPicModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-all active:scale-95"
          >
            <UserPlus size={16} />
            <span>+ Tambah PIC Proyek</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("projects_pics")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all ${
            activeTab === "projects_pics"
              ? "bg-yellow-500 text-slate-950 shadow-md"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
          }`}
        >
          <Building2 size={18} />
          <span>Kelola Proyek & PIC ({projects.length} Proyek)</span>
        </button>

        <button
          onClick={() => setActiveTab("matrix")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all ${
            activeTab === "matrix"
              ? "bg-yellow-500 text-slate-950 shadow-md"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
          }`}
        >
          <ShieldCheck size={18} />
          <span>Matriks Hak Akses (Role Matrix)</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all ${
            activeTab === "users"
              ? "bg-yellow-500 text-slate-950 shadow-md"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
          }`}
        >
          <Users size={18} />
          <span>Semua Akun ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all ${
            activeTab === "settings"
              ? "bg-yellow-500 text-slate-950 shadow-md"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
          }`}
        >
          <Sliders size={18} />
          <span>Konfigurasi SLA & Database</span>
        </button>
      </div>

      {/* TAB 1: KELOLA PROYEK & PIC (PENGISIAN PROJECT & PIC) */}
      {activeTab === "projects_pics" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Master Proyek Konstruksi & Alokasi PIC
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Setiap temuan patroli akan difilter secara ketat berdasarkan PIC yang ditugaskan di proyek bersangkutan.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAddProjectModal(true)}
                className="px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <PlusCircle size={15} /> Tambah Proyek Baru
              </button>
              <button
                onClick={() => setShowAddPicModal(true)}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
              >
                <UserPlus size={15} /> Alokasikan PIC Baru
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project) => {
              const assignedPics = users.filter((u) => u.role === "PIC" && u.projectId === project.id);

              return (
                <div
                  key={project.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-yellow-500/50 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
                          {project.id}
                        </span>
                        <h3 className="font-black text-base text-slate-900 dark:text-white mt-1">
                          {project.name}
                        </h3>
                      </div>
                      <div className="p-2.5 bg-purple-50 dark:bg-purple-950 text-purple-600 rounded-xl shrink-0">
                        <Building2 size={22} />
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <MapPin size={14} className="text-red-500 shrink-0" />
                      <span>{project.location}</span>
                    </p>

                    {/* Assigned PICs List */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                          PIC Penanggung Jawab ({assignedPics.length})
                        </span>
                      </div>

                      {assignedPics.length === 0 ? (
                        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-center">
                          <p className="text-xs text-red-600 font-bold">Belum ada PIC ditugaskan!</p>
                          <button
                            onClick={() => {
                              setNewPicProjectId(project.id);
                              setShowAddPicModal(true);
                            }}
                            className="mt-1 text-[11px] font-extrabold text-red-700 underline"
                          >
                            + Tambah PIC Sekarang
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {assignedPics.map((pic) => (
                            <div
                              key={pic.id}
                              className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between"
                            >
                              <div className="truncate min-w-0 pr-2">
                                <p className="font-bold text-slate-900 dark:text-white truncate">{pic.name}</p>
                                <p className="text-[11px] text-slate-500 truncate">{pic.email}</p>
                              </div>
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-md shrink-0">
                                📞 {pic.phoneNumber}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setNewPicProjectId(project.id);
                      setShowAddPicModal(true);
                    }}
                    className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <UserPlus size={14} />
                    <span>+ Tugaskan PIC Baru ke Proyek Ini</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: MATRIKS HAK AKSES PERAN (RBAC) */}
      {activeTab === "matrix" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Matriks Hak Akses & Izin Peran (User Matrix)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tabel aturan hak akses untuk CMD, PIC, PM, BOD, dan Administrator.
              </p>
            </div>

            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold rounded-lg">
              <CheckCircle2 size={14} /> Server RBAC Guard Enforced
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white font-black">
                  <th className="p-4 rounded-l-2xl min-w-[220px]">Fitur & Aturan Wewenang</th>
                  <th className="p-4 text-center min-w-[120px]">CMD (Inspector)</th>
                  <th className="p-4 text-center min-w-[120px]">PIC (Proyek)</th>
                  <th className="p-4 text-center min-w-[130px]">SM (Site Manager)</th>
                  <th className="p-4 text-center min-w-[130px]">PM (Project Manager)</th>
                  <th className="p-4 text-center min-w-[120px]">BOD (Direksi)</th>
                  <th className="p-4 text-center rounded-r-2xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 min-w-[120px]">
                    ADMIN (SuperAdmin)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {permissionMatrix.map((item, idx) => (
                  <tr key={idx} className={item.isBadgeRow ? "bg-purple-50/50 dark:bg-purple-950/20" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"}>
                    <td className="p-4">
                      <p className="font-extrabold text-sm text-slate-900 dark:text-white">{item.feature}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>
                    </td>

                    {/* CMD */}
                    <td className="p-4 text-center">
                      {typeof item.cmd === "string" ? (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 rounded-lg font-bold text-[10px]">
                          {item.cmd}
                        </span>
                      ) : item.cmd ? (
                        <span className="inline-flex p-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                          <CheckCircle2 size={18} />
                        </span>
                      ) : (
                        <span className="inline-flex p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl">
                          <XCircle size={18} />
                        </span>
                      )}
                    </td>

                    {/* PIC */}
                    <td className="p-4 text-center">
                      {typeof item.pic === "string" ? (
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 rounded-lg font-bold text-[10px]">
                          {item.pic}
                        </span>
                      ) : item.pic ? (
                        <span className="inline-flex p-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                          <CheckCircle2 size={18} />
                        </span>
                      ) : (
                        <span className="inline-flex p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl">
                          <XCircle size={18} />
                        </span>
                      )}
                    </td>

                    {/* SM */}
                    <td className="p-4 text-center">
                      {typeof item.sm === "string" ? (
                        <span className="px-2 py-1 bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 rounded-lg font-bold text-[10px]">
                          {item.sm}
                        </span>
                      ) : item.sm ? (
                        <span className="inline-flex p-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                          <CheckCircle2 size={18} />
                        </span>
                      ) : (
                        <span className="inline-flex p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl">
                          <XCircle size={18} />
                        </span>
                      )}
                    </td>

                    {/* PM */}
                    <td className="p-4 text-center">
                      {typeof item.pm === "string" ? (
                        <span className="px-2 py-1 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 rounded-lg font-bold text-[10px]">
                          {item.pm}
                        </span>
                      ) : item.pm ? (
                        <span className="inline-flex p-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                          <CheckCircle2 size={18} />
                        </span>
                      ) : (
                        <span className="inline-flex p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl">
                          <XCircle size={18} />
                        </span>
                      )}
                    </td>

                    {/* BOD */}
                    <td className="p-4 text-center">
                      {typeof item.bod === "string" ? (
                        <span className="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg font-bold text-[10px]">
                          {item.bod}
                        </span>
                      ) : item.bod ? (
                        <span className="inline-flex p-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                          <CheckCircle2 size={18} />
                        </span>
                      ) : (
                        <span className="inline-flex p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl">
                          <XCircle size={18} />
                        </span>
                      )}
                    </td>

                    {/* ADMIN */}
                    <td className="p-4 text-center bg-yellow-500/5">
                      {typeof item.admin === "string" ? (
                        <span className="px-2 py-1 bg-yellow-500 text-slate-950 rounded-lg font-bold text-[10px]">
                          {item.admin}
                        </span>
                      ) : item.admin ? (
                        <span className="inline-flex p-1.5 bg-yellow-500 text-slate-950 rounded-xl shadow-xs">
                          <CheckCircle2 size={18} />
                        </span>
                      ) : (
                        <span className="inline-flex p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl">
                          <XCircle size={18} />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DIREKTORI SEMUA AKUN */}
      {activeTab === "users" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Direktori Seluruh Akun Terdaftar
              </h2>
              <p className="text-xs text-slate-500">
                Daftar personil dan kredensial login akun demo terdaftar di sistem.
              </p>
            </div>

            <button
              onClick={() => setShowAddPicModal(true)}
              className="px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <UserPlus size={15} /> Tambah PIC Baru
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((u) => {
              const roleConfig = ROLE_LABELS[u.role];

              return (
                <div
                  key={u.id}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold border ${roleConfig.badgeClass}`}>
                        {u.role}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{u.id}</span>
                    </div>

                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                      {u.name}
                    </h3>
                    <p className="text-xs text-slate-500">{u.email}</p>

                    {u.project && (
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 pt-1">
                        <Building2 size={14} className="text-purple-500" />
                        <span>Lokasi: {u.project.name}</span>
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-600 dark:text-slate-400">📞 {u.phoneNumber}</span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      pwd: <strong className="text-yellow-600">{u.password || "123"}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: KONFIGURASI SLA & SISTEM */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <form onSubmit={handleSaveSettings} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Konfigurasi Batas Waktu SLA (Service Level Agreement)
              </h2>
              <p className="text-xs text-slate-500">
                Atur toleransi jam penyelesaian perbaikan sebelum tiket dinyatakan OVERDUE.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2 p-4 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-200 dark:border-red-900">
                <label className="block text-xs font-bold text-red-900 dark:text-red-300">
                  SLA K3 / Keselamatan Kerja
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={slaK3}
                    onChange={(e) => setSlaK3(Number(e.target.value))}
                    min={1}
                    max={168}
                    className="w-24 px-3 py-2 text-base font-black rounded-xl border border-red-300 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                  <span className="text-xs font-bold text-red-700">Jam (Default: 24h)</span>
                </div>
                <p className="text-[11px] text-red-600">Batas waktu penanganan bahaya kecelakaan kerja.</p>
              </div>

              <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900">
                <label className="block text-xs font-bold text-blue-900 dark:text-blue-300">
                  SLA Kualitas Pekerjaan
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={slaQuality}
                    onChange={(e) => setSlaQuality(Number(e.target.value))}
                    min={1}
                    max={168}
                    className="w-24 px-3 py-2 text-base font-black rounded-xl border border-blue-300 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                  <span className="text-xs font-bold text-blue-700">Jam (Default: 48h)</span>
                </div>
                <p className="text-[11px] text-blue-600">Batas waktu perbaikan cacat mutu konstruksi.</p>
              </div>

              <div className="space-y-2 p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-900">
                <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  SLA Kebersihan 5R & Material
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={sla5R}
                    onChange={(e) => setSla5R(Number(e.target.value))}
                    min={1}
                    max={168}
                    className="w-24 px-3 py-2 text-base font-black rounded-xl border border-emerald-300 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                  <span className="text-xs font-bold text-emerald-700">Jam (Default: 48h)</span>
                </div>
                <p className="text-[11px] text-emerald-600">Batas waktu pembersihan sisa puing sampah.</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Notifikasi Gateway Otomatis
              </h3>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={waNotificationEnabled}
                  onChange={(e) => setWaNotificationEnabled(e.target.checked)}
                  className="w-5 h-5 rounded-md accent-yellow-500"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Aktifkan Webhook Notifikasi WhatsApp ke Nomor PIC saat tiket OPEN diterbitkan
                </span>
              </label>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-sm rounded-xl shadow-md transition-all"
              >
                <Save size={16} />
                <span>Simpan Konfigurasi SLA</span>
              </button>
            </div>
          </form>

          {/* Database Control Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Database size={20} className="text-yellow-500" />
                  <span>Konektivitas & Data Seeding</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Status koneksi database: <strong className="text-emerald-600">{dbStatus.mode}</strong>
                </p>
              </div>

              <button
                onClick={handleSeed}
                disabled={seeding}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                <RefreshCw size={14} className={seeding ? "animate-spin" : ""} />
                <span>{seeding ? "Sedang Me-reset Data..." : "Seed / Reset Data Sampel"}</span>
              </button>
            </div>

            {seedMessage && (
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200">
                {seedMessage}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: TAMBAH PROYEK BARU */}
      {showAddProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 size={20} className="text-yellow-500" />
                <span>Tambah Proyek Baru</span>
              </h3>
              <button
                onClick={() => setShowAddProjectModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nama Proyek Konstruksi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Contoh: Pembangunan Mall Citra Grand"
                  required
                  className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Lokasi Proyek / Wilayah <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProjectLocation}
                  onChange={(e) => setNewProjectLocation(e.target.value)}
                  placeholder="Contoh: Jl. Ahmad Yani No. 88, Bandung"
                  required
                  className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProjectModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={projectSubmitting}
                  className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-md disabled:opacity-50"
                >
                  {projectSubmitting ? "Menyimpan..." : "Simpan Proyek"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TAMBAH / ALOKASIKAN PIC KE PROYEK */}
      {showAddPicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus size={20} className="text-yellow-500" />
                <span>Tambah & Alokasikan PIC</span>
              </h3>
              <button
                onClick={() => setShowAddPicModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePic} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Proyek Penugasan PIC <span className="text-red-500">*</span>
                </label>
                <select
                  value={newPicProjectId}
                  onChange={(e) => setNewPicProjectId(e.target.value)}
                  required
                  className="w-full px-4 py-3 text-sm font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.location})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nama Lengkap PIC (Subkont/Site Eng) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPicName}
                  onChange={(e) => setNewPicName(e.target.value)}
                  placeholder="Contoh: Dedi Kurniawan (PIC Structure)"
                  required
                  className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Email Login PIC <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newPicEmail}
                  onChange={(e) => setNewPicEmail(e.target.value)}
                  placeholder="contoh: dedi.pic@sitetracker.id"
                  required
                  className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    No. WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    value={newPicPhone}
                    onChange={(e) => setNewPicPhone(e.target.value)}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Password Login
                  </label>
                  <input
                    type="text"
                    value={newPicPassword}
                    onChange={(e) => setNewPicPassword(e.target.value)}
                    placeholder="123"
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPicModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={picSubmitting}
                  className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-md disabled:opacity-50"
                >
                  {picSubmitting ? "Menyimpan..." : "Tugaskan PIC"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
