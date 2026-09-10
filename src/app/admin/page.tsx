"use client";

import React, { useState, useEffect } from "react";
import { useRole } from "@/components/RoleContext";
import { User, Role, ROLE_LABELS, Project, Category, Finding, AuditLogEntry } from "@/types";
import {
  getUsers,
  getProjects,
  getFindings,
  clearFindings,
  getDatabaseStatus,
  seedDatabase,
  createProject,
  updateProjectAssignment,
  createOrUpdatePicUser,
  getCategorySettings,
  updateCategorySla,
  updateUserRoleAndProject,
  importProjectsAndPicsFromCsv,
  ImportProjectPicReport,
  adminResetUserPassword,
  getAuditLogs,
  getSystemSettings,
  updateSystemSettings,
  getRolePermissions,
  updateRolePermissions,
} from "@/lib/actions";
import { MASTER_DIVISIONS, getDivisionCode } from "@/constants/divisions";
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
  ShieldAlert,
  BadgeCheck,
  CalendarClock,
  Package,
  Layers,
  Tag,
  Trash2,
  AlertOctagon,
  Info,
  FileSpreadsheet,
  Upload,
  Download,
  FileUp,
  Check,
  Image as ImageIcon,
  Search,
  Filter,
  RotateCcw,
  Activity,
} from "lucide-react";

interface CategoryConfig {
  key: string;
  label: string;
  description: string;
  slaHours: number;
  color: string;
}

export default function AdminSettingsPage() {
  const { currentUser } = useRole();
  const [activeTab, setActiveTab] = useState<"projects_pics" | "divisions" | "categories" | "matrix" | "users" | "audit_log" | "settings">("projects_pics");
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [dbStatus, setDbStatus] = useState<{ isConnected: boolean; mode: string }>({
    isConnected: false,
    mode: "Loading...",
  });
  const [seeding, setSeeding] = useState(false);

  // Audit Logs State (Poin 4)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditActionFilter, setAuditActionFilter] = useState<string>("ALL");
  const [auditSearch, setAuditSearch] = useState<string>("");
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Custom Logo State (Poin 3)
  const [reportLogoUrl, setReportLogoUrl] = useState<string>("/logo.png");
  const [savingLogo, setSavingLogo] = useState(false);

  // Editable RBAC State (Poin 11 & 16)
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, boolean>>>({
    CMD: { canCreateFinding: true, canResolveFinding: false, canVerifyFinding: false, canDownloadReport: true, canManageAdmin: false },
    PIC: { canCreateFinding: false, canResolveFinding: true, canVerifyFinding: false, canDownloadReport: true, canManageAdmin: false },
    SM: { canCreateFinding: true, canResolveFinding: true, canVerifyFinding: false, canDownloadReport: true, canManageAdmin: false },
    PM: { canCreateFinding: true, canResolveFinding: true, canVerifyFinding: true, canDownloadReport: true, canManageAdmin: false },
    GM: { canCreateFinding: true, canResolveFinding: false, canVerifyFinding: true, canDownloadReport: true, canManageAdmin: false },
    BOD: { canCreateFinding: true, canResolveFinding: false, canVerifyFinding: true, canDownloadReport: true, canManageAdmin: false },
    Advisor: { canCreateFinding: true, canResolveFinding: false, canVerifyFinding: true, canDownloadReport: true, canManageAdmin: false },
    ADMIN: { canCreateFinding: true, canResolveFinding: true, canVerifyFinding: true, canDownloadReport: true, canManageAdmin: true },
  });
  const [savingRbac, setSavingRbac] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");

  // Clear Findings State
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearTargetProjectId, setClearTargetProjectId] = useState<string>("ALL");
  const [clearConfirmInput, setClearConfirmInput] = useState<string>("");
  const [clearingFindings, setClearingFindings] = useState(false);

  // Forms State for Adding Project
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [newProjectCode, setNewProjectCode] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectLocation, setNewProjectLocation] = useState("");
  const [newProjectDivision, setNewProjectDivision] = useState("");
  const [newProjectPmId, setNewProjectPmId] = useState("");
  const [newProjectGmId, setNewProjectGmId] = useState("");
  const [projectSubmitting, setProjectSubmitting] = useState(false);

  // Edit Project Assignment Modal State
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editDivision, setEditDivision] = useState("");
  const [editPmId, setEditPmId] = useState("");
  const [editGmId, setEditGmId] = useState("");
  const [projectEditSubmitting, setProjectEditSubmitting] = useState(false);

  // Forms State for Adding / Assigning PIC
  const [showAddPicModal, setShowAddPicModal] = useState(false);
  const [newPicName, setNewPicName] = useState("");
  const [newPicEmail, setNewPicEmail] = useState("");
  const [newPicPhone, setNewPicPhone] = useState("");
  const [newPicPassword, setNewPicPassword] = useState("123");
  const [newPicProjectId, setNewPicProjectId] = useState("");
  const [picSubmitting, setPicSubmitting] = useState(false);

  // CSV Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvTextContent, setCsvTextContent] = useState<string>("");
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[]>([]);
  const [importReport, setImportReport] = useState<ImportProjectPicReport | null>(null);

  // Role & Project Assignment Modal States
  const [showRoleAssignModal, setShowRoleAssignModal] = useState(false);
  const [assignTargetUser, setAssignTargetUser] = useState<User | null>(null);
  const [assignRole, setAssignRole] = useState<Role>("PIC");
  const [assignProjectId, setAssignProjectId] = useState<string>("");
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Toast message
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Settings mock state
  const [waNotificationEnabled, setWaNotificationEnabled] = useState(true);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadAdminData = async () => {
    try {
      const [uList, pList, fList, status, catList, settings, perms, logs] = await Promise.all([
        getUsers(),
        getProjects(),
        getFindings(),
        getDatabaseStatus(),
        getCategorySettings(),
        getSystemSettings(),
        getRolePermissions(),
        getAuditLogs({ limit: 100 }),
      ]);
      setUsers(uList);
      setProjects(pList);
      setFindings(fList);
      setDbStatus(status);
      setCategories(catList);
      if (settings?.reportLogoUrl) setReportLogoUrl(settings.reportLogoUrl);
      if (perms?.matrix) setRolePermissions(perms.matrix);
      if (logs) setAuditLogs(logs);
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
        code: newProjectCode.trim() || undefined,
        name: newProjectName,
        location: newProjectLocation,
        division: newProjectDivision.trim() || undefined,
        pmId: newProjectPmId || undefined,
        gmId: newProjectGmId || undefined,
      });
      if (res.success) {
        showToast(res.message || "Proyek baru berhasil dibuat!");
        setNewProjectCode("");
        setNewProjectName("");
        setNewProjectLocation("");
        setNewProjectDivision("");
        setNewProjectPmId("");
        setNewProjectGmId("");
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

  const handleOpenEditProject = (project: Project) => {
    setEditingProject(project);
    setEditDivision(project.division || "");
    setEditPmId(project.pmId || "");
    setEditGmId(project.gmId || "");
    setShowEditProjectModal(true);
  };

  const handleUpdateProjectAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    setProjectEditSubmitting(true);
    try {
      const res = await updateProjectAssignment(editingProject.id, {
        division: editDivision.trim() || null,
        pmId: editPmId || null,
        gmId: editGmId || null,
      });
      if (res.success) {
        showToast(res.message);
        setShowEditProjectModal(false);
        setEditingProject(null);
        loadAdminData();
      } else {
        showToast(res.message, "error");
      }
    } catch (err: any) {
      showToast(err.message || "Gagal memperbarui proyek.", "error");
    } finally {
      setProjectEditSubmitting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement("a");
    link.href = "/template_import_proyek_pic.csv";
    link.download = "template_import_proyek_pic.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setImportReport(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = (evt.target?.result as string) || "";
      setCsvTextContent(text);

      // Parse preview
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
      if (lines.length > 1) {
        const delimiter = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ";" : ",";
        const preview = lines.slice(1, 6).map((l, idx) => {
          const parts = l.split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ""));
          return {
            row: idx + 2,
            code: parts[0] || "-",
            name: parts[1] || "-",
            location: parts[2] || "-",
            pic: parts[3] || "-",
            email: parts[4] || "-",
          };
        });
        setCsvPreviewRows(preview);
      } else {
        setCsvPreviewRows([]);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!csvTextContent) {
      showToast("Pilih atau unggah berkas CSV terlebih dahulu.", "error");
      return;
    }
    setImportingCsv(true);
    try {
      const res = await importProjectsAndPicsFromCsv(csvTextContent);
      setImportReport(res.report);
      if (res.success) {
        showToast(res.message, "success");
        loadAdminData();
      } else {
        showToast(res.message, "error");
      }
    } catch (err: any) {
      showToast(err.message || "Gagal memproses impor CSV.", "error");
    } finally {
      setImportingCsv(false);
    }
  };

  const handleCloseImportModal = () => {
    setShowImportModal(false);
    setCsvFile(null);
    setCsvTextContent("");
    setCsvPreviewRows([]);
    setImportReport(null);
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

  const handleUpdateCategorySla = async (key: string, slaHours: number) => {
    try {
      const res = await updateCategorySla(key, slaHours);
      if (res.success) {
        showToast(res.message);
        loadAdminData();
      }
    } catch (err: any) {
      showToast("Gagal mengubah SLA", "error");
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await seedDatabase();
      showToast(res.message);
      loadAdminData();
    } catch (e: any) {
      showToast("Gagal: " + e.message, "error");
    } finally {
      setSeeding(false);
    }
  };

  const handleClearFindings = async () => {
    const trimmed = clearConfirmInput.trim().toUpperCase();
    if (trimmed !== "HAPUS" && trimmed !== "CLEAR") {
      showToast("Ketik kata 'HAPUS' untuk mengonfirmasi penghapusan data!", "error");
      return;
    }
    setClearingFindings(true);
    try {
      const res = await clearFindings(clearTargetProjectId);
      if (res.success) {
        showToast(res.message);
        setShowClearModal(false);
        setClearConfirmInput("");
        loadAdminData();
      } else {
        showToast(res.message, "error");
      }
    } catch (err: any) {
      showToast("Gagal menghapus data: " + (err.message || "Unknown error"), "error");
    } finally {
      setClearingFindings(false);
    }
  };

  const handleOpenAssignModal = (user: User) => {
    setAssignTargetUser(user);
    setAssignRole(user.role === "PENDING" ? "PIC" : user.role);
    setAssignProjectId(user.projectId || (projects.length > 0 ? projects[0].id : ""));
    setShowRoleAssignModal(true);
  };

  const handleSaveRoleAndProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTargetUser) return;
    setAssignSubmitting(true);
    try {
      const isGlobalRole = ["CMD", "GM", "BOD", "ADMIN", "Advisor"].includes(assignRole);
      const res = await updateUserRoleAndProject(
        assignTargetUser.id,
        assignRole,
        isGlobalRole ? null : (assignProjectId || null)
      );
      if (res.success) {
        showToast(res.message);
        setShowRoleAssignModal(false);
        setAssignTargetUser(null);
        loadAdminData();
      } else {
        showToast(res.message, "error");
      }
    } catch (err: any) {
      showToast(err.message || "Gagal memperbarui role", "error");
    } finally {
      setAssignSubmitting(false);
    }
  };

  // Logo Handlers (Poin 3)
  const handleSaveLogo = async () => {
    setSavingLogo(true);
    try {
      const res = await updateSystemSettings({ reportLogoUrl: reportLogoUrl.trim() || "/logo.png" });
      if (res.success) {
        showToast(res.message || "Logo laporan berhasil diperbarui!");
      } else {
        showToast(res.message || "Gagal menyimpan logo.", "error");
      }
    } catch (e: any) {
      showToast("Terjadi kesalahan: " + e.message, "error");
    } finally {
      setSavingLogo(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Berkas harus berupa gambar (PNG, JPG, SVG, WebP).", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) {
        setReportLogoUrl(dataUrl);
        showToast("Logo berhasil dipilih. Klik 'Simpan Logo Laporan' untuk menerapkan.");
      }
    };
    reader.readAsDataURL(file);
  };

  // Audit Logs Refresh (Poin 4)
  const handleRefreshAudit = async () => {
    setLoadingAudit(true);
    try {
      const logs = await getAuditLogs({
        action: auditActionFilter === "ALL" ? undefined : auditActionFilter,
        search: auditSearch.trim() || undefined,
        limit: 100,
      });
      setAuditLogs(logs);
    } catch (e) {
      console.error("Gagal refresh audit logs:", e);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Editable RBAC Handlers (Poin 11 & 16)
  const togglePermission = (role: string, permKey: string) => {
    if (role === "PIC" && permKey === "canCreateFinding") {
      showToast("Role PIC secara baku tidak diizinkan membuat temuan patroli.", "error");
      return;
    }
    setRolePermissions((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permKey]: !prev[role]?.[permKey],
      },
    }));
  };

  const handleSaveRbac = async () => {
    setSavingRbac(true);
    try {
      const res = await updateRolePermissions(rolePermissions);
      if (res.success) {
        showToast(res.message || "Matriks hak akses (RBAC) berhasil disimpan!");
      } else {
        showToast(res.message || "Gagal menyimpan RBAC.", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Terjadi kesalahan.", "error");
    } finally {
      setSavingRbac(false);
    }
  };

  const handleAddCustomRole = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newRoleName.trim().replace(/\s+/g, "_");
    if (!cleaned) return;
    if (rolePermissions[cleaned]) {
      showToast("Role dengan nama tersebut sudah ada.", "error");
      return;
    }

    setRolePermissions((prev) => ({
      ...prev,
      [cleaned]: {
        canCreateFinding: true,
        canResolveFinding: false,
        canVerifyFinding: false,
        canDownloadReport: true,
        canManageAdmin: false,
      },
    }));
    setNewRoleName("");
    setShowAddRoleModal(false);
    showToast(`Role baru '${cleaned}' berhasil ditambahkan ke matriks! Jangan lupa klik 'Simpan Perubahan RBAC'.`);
  };

  const PERMISSION_FEATURES = [
    {
      key: "canCreateFinding",
      name: "1. Pencatatan Temuan Baru (/findings/new)",
      description: "Mengambil foto temuan, input GPS, dan menerbitkan tiket OPEN. Khusus PIC dilarang menerbitkan temuan.",
    },
    {
      key: "canResolveFinding",
      name: "2. Tindak Lanjut & Upload Bukti (/pic/tasks)",
      description: "Mengunggah foto sesudah perbaikan dan mengisi respon tindakan perbaikan PIC.",
    },
    {
      key: "canVerifyFinding",
      name: "3. Verifikasi Side-by-Side (Approve / Reject)",
      description: "Otoritas memvalidasi perbaikan dan menutup tiket (CLOSED) atau mengembalikan untuk perbaikan ulang (revisi ke OPEN).",
    },
    {
      key: "canDownloadReport",
      name: "4. Cetak Rekapitulasi & Ekspor Laporan (/reports)",
      description: "Menghasilkan dokumen resmi ISO 45001 berlogo perusahaan dan distribusi laporan.",
    },
    {
      key: "canManageAdmin",
      name: "5. Akses Manajemen Portal Admin (/admin)",
      description: "Menambahkan proyek baru, penugasan PIC, audit log, custom logo, dan konfigurasi sistem.",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-2xl border shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200 text-xs font-black ${toastMsg.type === "success"
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
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-violet-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-500/20 border border-violet-400/30 text-violet-300 text-xs font-black rounded-full backdrop-blur-md">
            <Sliders size={14} /> Administrator Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Tata Kelola Master Proyek, PIC & Kategori Temuan
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl">
            Modul administrator untuk mengelola proyek konstruksi, penugasan PIC per lokasi, kategori temuan, batasan SLA, dan matriks hak akses peran.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setShowAddProjectModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-black text-xs rounded-xl shadow-md shadow-violet-500/25 transition-all active:scale-95"
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

          <button
            onClick={() => {
              setClearTargetProjectId("ALL");
              setClearConfirmInput("");
              setShowClearModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600/90 hover:bg-red-600 text-white font-bold text-xs rounded-xl border border-red-500/30 shadow-md transition-all active:scale-95"
            title="Bersihkan Data Temuan untuk Semua atau Proyek Tertentu"
          >
            <Trash2 size={16} />
            <span>Bersihkan Data Temuan</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("projects_pics")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all ${activeTab === "projects_pics"
              ? "bg-violet-600 text-white shadow-md shadow-violet-500/25"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
        >
          <Building2 size={18} />
          <span>Kelola Proyek & PIC ({projects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("divisions")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all ${activeTab === "divisions"
              ? "bg-violet-600 text-white shadow-md shadow-violet-500/25"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
        >
          <Layers size={18} />
          <span>Kode Divisi ({MASTER_DIVISIONS.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("categories")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all ${activeTab === "categories"
              ? "bg-violet-600 text-white shadow-md shadow-violet-500/25"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
        >
          <Tag size={18} />
          <span>Kategori Temuan & SLA ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("matrix")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all ${activeTab === "matrix"
              ? "bg-violet-600 text-white shadow-md shadow-violet-500/25"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
        >
          <ShieldCheck size={18} />
          <span>Matriks Hak Akses (RBAC)</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all ${activeTab === "users"
              ? "bg-violet-600 text-white shadow-md shadow-violet-500/25"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
        >
          <Users size={18} />
          <span>Semua Akun ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("audit_log")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all ${activeTab === "audit_log"
              ? "bg-violet-600 text-white shadow-md shadow-violet-500/25"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
        >
          <FileSpreadsheet size={18} />
          <span>Audit Log Aktivitas ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all ${activeTab === "settings"
              ? "bg-violet-600 text-white shadow-md shadow-violet-500/25"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
        >
          <Sliders size={18} />
          <span>Sistem & Logo Laporan</span>
        </button>
      </div>

      {/* TAB 1: KELOLA PROYEK & PIC */}
      {activeTab === "projects_pics" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Master Proyek Konstruksi & Alokasi PIC
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Setiap temuan patroli difilter secara ketat berdasarkan PIC yang ditugaskan di proyek bersangkutan.
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95"
              >
                <FileSpreadsheet size={15} /> Impor CSV (Proyek & PIC)
              </button>
              <button
                onClick={() => setShowAddProjectModal(true)}
                className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95"
              >
                <PlusCircle size={15} /> Tambah Proyek Baru
              </button>
              <button
                onClick={() => setShowAddPicModal(true)}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 active:scale-95"
              >
                <UserPlus size={15} /> Alokasikan PIC Baru
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project) => {
              const assignedPics = users.filter((u) => u.role === "PIC" && u.projectId === project.id);
              const pmUser = project.pm || users.find((u) => u.id === project.pmId);
              const gmUser = project.gm || users.find((u) => u.id === project.gmId);

              return (
                <div
                  key={project.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-violet-500/50 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {project.code && (
                            <span className="text-[11px] font-mono font-black px-2 py-0.5 bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-800 rounded-md">
                              {project.code}
                            </span>
                          )}
                          {project.division && (
                            <span className="text-[10px] font-black px-2 py-0.5 bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800 rounded-md">
                              {project.division}
                            </span>
                          )}
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
                            {project.id}
                          </span>
                        </div>
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

                    {/* Hierarchy: PM & GM Info */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          Pimpinan Divisi & Proyek
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenEditProject(project)}
                          className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                        >
                          <Sliders size={11} /> Ubah
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="p-2 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700">
                          <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 block">
                            Project Manager (PM)
                          </span>
                          {pmUser ? (
                            <div className="truncate mt-0.5">
                              <p className="font-bold text-slate-900 dark:text-white truncate">{pmUser.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{pmUser.email}</p>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic mt-0.5">Belum ditentukan</p>
                          )}
                        </div>

                        <div className="p-2 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700">
                          <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 block">
                            General Manager (GM)
                          </span>
                          {gmUser ? (
                            <div className="truncate mt-0.5">
                              <p className="font-bold text-slate-900 dark:text-white truncate">{gmUser.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{gmUser.email}</p>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic mt-0.5">Belum ditentukan</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Assigned PICs List */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                          PIC Penanggung Jawab ({assignedPics.length})
                        </span>
                      </div>

                      {assignedPics.length === 0 ? (
                        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-center">
                          <p className="text-xs text-red-600 font-bold">Belum ada PIC ditugaskan</p>
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
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-md shrink-0 flex items-center gap-1">
                                <Phone size={10} /> {pic.phoneNumber}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleOpenEditProject(project)}
                      className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Sliders size={13} />
                      <span>Atur Divisi/PM/GM</span>
                    </button>
                    <button
                      onClick={() => {
                        setNewPicProjectId(project.id);
                        setShowAddPicModal(true);
                      }}
                      className="flex-1 py-2 px-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-violet-500/20"
                    >
                      <UserPlus size={13} />
                      <span>+ PIC Proyek</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB MASTER: KELOLA KODE DIVISI & FORMAT PENOMORAN */}
      {activeTab === "divisions" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Daftar Master Divisi & Standardisasi Dokumen</span>
                <span className="px-2.5 py-0.5 text-xs font-mono font-black bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 rounded-lg border border-violet-300 dark:border-violet-800">
                  DIV-YY-XXX
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Setiap proyek terafiliasi dengan divisi di bawah ini. Format penomoran laporan otomatis mengadopsi kode divisi, 2 digit tahun, dan 3 digit nomor urut tahunan.
              </p>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-violet-900/10 via-indigo-900/10 to-blue-900/10 border border-violet-300 dark:border-violet-800 rounded-3xl text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-violet-800 dark:text-violet-300">
              <Info size={16} />
              <span>Ketentuan Penomoran Laporan Patroli Resmi:</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
              <strong>DIV-YY-XXX</strong> &rarr; <span className="text-violet-600 dark:text-violet-400 font-bold">DIV</span>: Kode Divisi (CMD, ME, SQCD, PLAN, JOIN, BM) &bull; <span className="text-violet-600 dark:text-violet-400 font-bold">YY</span>: 2 Digit Tahun Tanggal Laporan (e.g. 26) &bull; <span className="text-violet-600 dark:text-violet-400 font-bold">XXX</span>: 3 Digit Nomor Urut Tahunan (001, 002, dst, reset setiap pergantian tahun).
            </p>
          </div>

          {/* Division Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {MASTER_DIVISIONS.map((div, idx) => {
              const assignedProjects = projects.filter((p) => getDivisionCode(p.division) === div.code);
              return (
                <div
                  key={div.code}
                  className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-violet-500/50 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-mono font-black px-2.5 py-1 bg-violet-600 text-white rounded-lg shadow-sm">
                            {div.code}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
                            No. {idx + 1}
                          </span>
                        </div>
                        <h3 className="font-black text-base text-slate-900 dark:text-white mt-2">
                          {div.name}
                        </h3>
                      </div>
                      <div className="p-2.5 bg-violet-50 dark:bg-violet-950 text-violet-600 rounded-xl shrink-0 font-mono font-black text-xs">
                        {div.code}-26-001
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {div.description}
                    </p>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex items-center justify-between text-slate-500 mb-1.5 font-bold">
                        <span>Proyek Terafiliasi:</span>
                        <span className="text-violet-600 dark:text-violet-400">{assignedProjects.length} Proyek</span>
                      </div>
                      {assignedProjects.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">Belum ada proyek dengan divisi ini</p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {assignedProjects.map((p) => (
                            <span
                              key={p.id}
                              className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded"
                            >
                              {p.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: KELOLA KATEGORI TEMUAN & PARAMETER SLA */}
      {activeTab === "categories" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Kategori Temuan Patroli & Toleransi SLA
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Konfigurasi batas waktu tanggap perbaikan (SLA Hours) untuk tiap kategori temuan di lapangan.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories.map((cat) => {
              const getCatIcon = () => {
                switch (cat.key) {
                  case "K3_SAFETY":
                    return <ShieldAlert size={22} className="text-red-500" />;
                  case "QUALITY":
                    return <BadgeCheck size={22} className="text-blue-500" />;
                  case "KEBERSIHAN_5R":
                    return <Sparkles size={22} className="text-emerald-500" />;
                  case "SCHEDULE":
                    return <CalendarClock size={22} className="text-amber-500" />;
                  case "MATERIAL":
                    return <Package size={22} className="text-purple-500" />;
                  default:
                    return <Tag size={22} className="text-violet-600" />;
                }
              };

              return (
                <div
                  key={cat.key}
                  className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                          {getCatIcon()}
                        </div>
                        <div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
                            {cat.key}
                          </span>
                          <h3 className="font-black text-base text-slate-900 dark:text-white mt-0.5">
                            {cat.label}
                          </h3>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {cat.description}
                    </p>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <label className="block text-[11px] font-black uppercase text-slate-400">
                        Batas Toleransi SLA:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          defaultValue={cat.slaHours}
                          onBlur={(e) => handleUpdateCategorySla(cat.key, Number(e.target.value))}
                          min={1}
                          max={240}
                          className="w-24 px-3 py-2 text-sm font-black rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
                        />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                          Jam ({Math.round(cat.slaHours / 24)} Hari Kerja)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock size={12} className="text-violet-600 dark:text-violet-400" />
                    <span>Auto-calculated saat tiket diterbitkan</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: MATRIKS HAK AKSES PERAN (RBAC) - EDITABLE (Poin 11 & 16) */}
      {activeTab === "matrix" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-100 dark:bg-violet-950/60 border border-violet-300 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-xs font-black rounded-full mb-1">
                <ShieldCheck size={13} /> RBAC Matrix Dinamis & Interaktif
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Matriks Hak Akses & Wewenang Peran (Editable RBAC)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Klik ikon untuk mengaktifkan atau menonaktifkan hak akses setiap peran secara langsung. Khusus peran PIC dikunci tidak boleh membuat temuan.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setNewRoleName("");
                  setShowAddRoleModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-300 dark:border-slate-700 transition-all active:scale-95"
              >
                <PlusCircle size={15} />
                <span>+ Tambah Role Baru</span>
              </button>

              <button
                type="button"
                onClick={handleSaveRbac}
                disabled={savingRbac}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-black text-xs rounded-xl shadow-lg shadow-violet-500/25 disabled:opacity-50 transition-all active:scale-95"
              >
                <Save size={15} />
                <span>{savingRbac ? "Menyimpan RBAC..." : "Simpan Perubahan RBAC"}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white font-black">
                  <th className="p-4 rounded-l-2xl min-w-[240px]">Fitur & Aturan Izin Akses</th>
                  {Object.keys(rolePermissions).map((r) => (
                    <th
                      key={r}
                      className={`p-4 text-center min-w-[120px] ${r === "ADMIN" ? "rounded-r-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 font-black" : ""
                        }`}
                    >
                      <span className="block">{r}</span>
                      <span className="text-[10px] font-normal text-slate-400 block">
                        {r === "PIC"
                          ? "Subkontraktor"
                          : r === "Advisor"
                            ? "Advisor Teknis"
                            : r === "CMD"
                              ? "Inspector"
                              : r === "ADMIN"
                                ? "SuperAdmin"
                                : "Manajemen"}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {PERMISSION_FEATURES.map((feat) => (
                  <tr key={feat.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <p className="font-extrabold text-sm text-slate-900 dark:text-white">{feat.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{feat.description}</p>
                    </td>

                    {Object.keys(rolePermissions).map((role) => {
                      const isEnabled = !!rolePermissions[role]?.[feat.key];

                      // Special Rule Poin 11: PIC CANNOT CREATE FINDING
                      if (role === "PIC" && feat.key === "canCreateFinding") {
                        return (
                          <td key={role} className="p-4 text-center">
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 rounded-xl text-[10px] font-black border border-red-200 dark:border-red-900"
                              title="Role PIC dibatasi dan dilarang menerbitkan temuan patroli baru"
                            >
                              <Lock size={12} /> Dilarang (PIC)
                            </span>
                          </td>
                        );
                      }

                      return (
                        <td key={role} className={`p-4 text-center ${role === "ADMIN" ? "bg-violet-500/5" : ""}`}>
                          <button
                            type="button"
                            onClick={() => togglePermission(role, feat.key)}
                            className={`p-2 rounded-xl border transition-all active:scale-95 ${isEnabled
                                ? "bg-emerald-500 text-white border-emerald-600 shadow-xs"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                              }`}
                            title={`Ubah status izin '${feat.name}' untuk role '${role}'`}
                          >
                            {isEnabled ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Info size={14} className="text-violet-600" />
              <span>Perubahan matriks hak akses akan langsung tersimpan ke sistem setelah Anda menekan tombol Simpan.</span>
            </span>
            <button
              type="button"
              onClick={handleSaveRbac}
              disabled={savingRbac}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-black text-xs rounded-xl transition-all shadow-md shrink-0"
            >
              {savingRbac ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: DIREKTORI SEMUA AKUN & PENETAPAN WEWENANG */}
      {activeTab === "users" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Direktori Seluruh Akun & Wewenang
              </h2>
              <p className="text-xs text-slate-500">
                Kelola personil terdaftar, wewenang peran (Role), serta penugasan proyek konstruksi.
              </p>
            </div>

            <button
              onClick={() => setShowAddPicModal(true)}
              className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <UserPlus size={15} /> Tambah PIC Baru
            </button>
          </div>

          {/* PERMOHONAN AKUN BARU MENUNGGU PENETAPAN (STATUS: PENDING) */}
          {users.filter((u) => u.role === "PENDING").length > 0 && (
            <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-300 dark:border-rose-900/60 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-rose-600 text-white rounded-xl shadow-xs">
                    <AlertTriangle size={18} />
                  </span>
                  <div>
                    <h3 className="text-base font-black text-rose-950 dark:text-rose-200">
                      Permohonan Akun Baru Menunggu Penugasan ({users.filter((u) => u.role === "PENDING").length} Akun)
                    </h3>
                    <p className="text-xs text-rose-700 dark:text-rose-400">
                      Pengguna berikut baru mendaftar via Neon Auth dan belum dapat mencatat/merespon temuan sebelum Admin menentukan Role & Proyeknya.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {users
                  .filter((u) => u.role === "PENDING")
                  .map((u) => (
                    <div
                      key={u.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-800 shadow-sm flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            PENDING ROLE
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{u.id}</span>
                        </div>
                        <h4 className="font-black text-sm text-slate-900 dark:text-white pt-1">{u.name}</h4>
                        <p className="text-xs text-slate-500">{u.email}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-mono flex items-center gap-1">
                          <Phone size={11} /> {u.phoneNumber}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenAssignModal(u)}
                        className="w-full py-2.5 px-3 bg-violet-600 hover:bg-violet-500 text-white font-black text-xs rounded-xl shadow-md shadow-violet-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <Sliders size={14} />
                        <span>Tetapkan Role & Proyek</span>
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* GRID SEMUA AKUN */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((u) => {
              const roleConfig = ROLE_LABELS[u.role] || { badgeClass: "bg-slate-800 text-slate-300" };

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
                      <button
                        type="button"
                        onClick={() => handleOpenAssignModal(u)}
                        className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                      >
                        <Sliders size={11} />
                        <span>Ubah Role</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-slate-900 text-violet-300 font-mono text-[10px] font-bold rounded">
                        {u.employeeCode || `P${String(users.indexOf(u) + 1).padStart(5, "0")}`}
                      </span>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                        {u.name}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500">{u.email}</p>

                    {u.project ? (
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 pt-1">
                        <Building2 size={14} className="text-purple-500" />
                        <span>Lokasi: {u.project.name}</span>
                      </p>
                    ) : u.role === "PENDING" ? (
                      <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 pt-1">
                        <AlertTriangle size={13} />
                        <span>Belum ada penugasan proyek</span>
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 pt-1">
                        <ShieldCheck size={13} className="text-violet-500" />
                        <span>Akses Lintas Proyek (Global)</span>
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Phone size={12} /> {u.phoneNumber}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-mono text-[11px]">
                        pwd: <strong className="text-violet-600 dark:text-violet-400">{u.password || "123"}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          const newPwd = prompt(`Reset kata sandi akun [${u.name}]:`, "123");
                          if (!newPwd) return;
                          try {
                            const res = await adminResetUserPassword(u.id, newPwd.trim());
                            if (res.success) {
                              showToast(res.message);
                              loadAdminData();
                            } else {
                              showToast(res.message, "error");
                            }
                          } catch (e: any) {
                            showToast(e.message || "Gagal mereset password.", "error");
                          }
                        }}
                        className="p-1 px-1.5 bg-slate-200 hover:bg-violet-600 hover:text-white dark:bg-slate-700 dark:hover:bg-violet-600 text-slate-600 dark:text-slate-300 rounded text-[10px] font-bold transition-colors flex items-center gap-0.5"
                        title="Reset password pengguna"
                      >
                        <KeyRound size={10} />
                        <span>Reset</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4.5: AUDIT LOG AKTIVITAS (Poin 4) */}
      {activeTab === "audit_log" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-100 dark:bg-violet-950/60 border border-violet-300 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-xs font-black rounded-full mb-1">
                <Activity size={13} /> Audit Trail & Compliance Log
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Rekam Jejak & Audit Log Aktivitas Pengguna
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Merekam otomatis setiap aktivitas dari login/logout, penambahan/perubahan temuan, respon PIC, verifikasi PM, pengiriman laporan, hingga konfigurasi sistem.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefreshAudit}
              disabled={loadingAudit}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-300 dark:border-slate-700 transition-all self-start sm:self-auto"
            >
              <RotateCcw size={14} className={loadingAudit ? "animate-spin" : ""} />
              <span>{loadingAudit ? "Memuat Log..." : "Segarkan Log"}</span>
            </button>
          </div>

          {/* Filter & Search Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="sm:col-span-2 relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Cari berdasarkan nama user, email, kode tiket, atau rincian aktivitas..."
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 font-medium"
              />
            </div>

            <div className="relative">
              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500"
              >
                <option value="ALL">Semua Aktivitas (All Events)</option>
                <option value="LOGIN">🔐 Login Akun</option>
                <option value="LOGOUT">🚪 Logout Akun</option>
                <option value="CREATE_FINDING">🔴 Buat Temuan Baru</option>
                <option value="UPDATE_FINDING">✏️ Edit Data Temuan</option>
                <option value="RESOLVE_FINDING">🟡 Respon Perbaikan PIC</option>
                <option value="VALIDATE_FINDING">🟢 Verifikasi PM (Approve/Reject)</option>
                <option value="SEND_REPORT_EMAIL">📧 Kirim Email Laporan</option>
                <option value="DOWNLOAD_REPORT">📥 Unduh / Export Laporan</option>
                <option value="UPDATE_SETTINGS">⚙️ Ubah Konfigurasi Sistem</option>
                <option value="UPDATE_RBAC">🛡️ Ubah Matriks RBAC</option>
                <option value="UPDATE_USER_ROLE">👤 Ubah Role User</option>
              </select>
            </div>
          </div>

          {/* Audit Logs Table */}
          {(() => {
            const filteredLogs = auditLogs.filter((log) => {
              if (auditActionFilter !== "ALL" && log.action !== auditActionFilter) return false;
              if (auditSearch.trim()) {
                const s = auditSearch.toLowerCase();
                const matchName = log.userName?.toLowerCase().includes(s);
                const matchEmail = log.userId?.toLowerCase().includes(s);
                const matchDetails = log.details?.toLowerCase().includes(s);
                const matchEntity = log.entityId?.toLowerCase().includes(s);
                if (!matchName && !matchEmail && !matchDetails && !matchEntity) return false;
              }
              return true;
            });

            if (filteredLogs.length === 0) {
              return (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <Activity size={36} className="mx-auto opacity-30 text-violet-500" />
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Tidak ada log aktivitas sesuai kriteria pencarian</p>
                  <p className="text-xs text-slate-400">Seluruh aksi pengguna akan terekam secara otomatis di sini.</p>
                </div>
              );
            }

            return (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 font-black text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5 whitespace-nowrap min-w-[150px]">Waktu (WIB)</th>
                      <th className="p-3.5 min-w-[180px]">Pengguna / Aktor</th>
                      <th className="p-3.5 min-w-[140px]">Aksi / Event</th>
                      <th className="p-3.5 min-w-[130px]">Objek / Tiket</th>
                      <th className="p-3.5 min-w-[280px]">Rincian Aktivitas</th>
                      <th className="p-3.5 min-w-[100px]">IP / Client</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredLogs.map((log) => {
                      const getActionBadge = () => {
                        switch (log.action) {
                          case "LOGIN":
                            return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300";
                          case "LOGOUT":
                            return "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300";
                          case "CREATE_FINDING":
                            return "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 border-violet-300";
                          case "UPDATE_FINDING":
                            return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300";
                          case "RESOLVE_FINDING":
                            return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300";
                          case "VALIDATE_FINDING":
                            return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300";
                          case "SEND_REPORT_EMAIL":
                            return "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300";
                          case "DOWNLOAD_REPORT":
                            return "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-300";
                          default:
                            return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300";
                        }
                      };

                      const timeStr = new Date(log.createdAt).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      }) + " WIB";

                      return (
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {timeStr}
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold text-slate-900 dark:text-white block">{log.userName || "System"}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Role: {log.userRole || "-"}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black border ${getActionBadge()}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-mono text-[11px] font-bold text-violet-600 dark:text-violet-400">
                              {log.entityId || log.entityType || "-"}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                            {log.details}
                          </td>
                          <td className="p-3.5 font-mono text-[10px] text-slate-400">
                            {log.ipAddress || "127.0.0.1"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 5: KONFIGURASI SISTEM & DATABASE */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* Card: Kustomisasi Logo Kop Surat Laporan Patroli (Poin 3) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-100 dark:bg-violet-950/60 border border-violet-300 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-xs font-black rounded-full">
                  <ImageIcon size={13} /> Kustomisasi Dokumen Laporan (Poin 3)
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Logo Resmi Kop Laporan Patroli
                </h3>
                <p className="text-xs text-slate-500 max-w-xl">
                  Logo ini akan disematkan pada kop surat halaman cetak laporan patroli K3 & Kualitas Proyek, ekspor PDF, serta pratinjau laporan web.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReportLogoUrl("/logo.png");
                    showToast("Logo dikembalikan ke default.");
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  Reset Default
                </button>
                <button
                  type="button"
                  onClick={handleSaveLogo}
                  disabled={savingLogo}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-black text-xs rounded-xl shadow-lg shadow-violet-500/25 disabled:opacity-50 transition-all active:scale-95"
                >
                  <Save size={15} />
                  <span>{savingLogo ? "Menyimpan..." : "Simpan Logo Laporan"}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Logo Settings Form */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    URL Gambar Logo (atau path lokal):
                  </label>
                  <input
                    type="text"
                    value={reportLogoUrl}
                    onChange={(e) => setReportLogoUrl(e.target.value)}
                    placeholder="e.g. /logo.png atau https://example.com/logo.png"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Atau Unggah Berkas Gambar dari Komputer:
                  </label>
                  <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl hover:border-violet-500 dark:hover:border-violet-500 cursor-pointer bg-slate-50 dark:bg-slate-800/40 transition-colors">
                    <Upload size={18} className="text-violet-600" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Pilih Berkas Gambar (PNG, JPG, SVG)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Format gambar optimal: PNG transparan atau SVG dengan tinggi sekitar 60–80px.
                  </p>
                </div>
              </div>

              {/* Visual Preview Box */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Pratinjau Kop Surat Laporan Patroli:
                </label>
                <div className="p-4 bg-white dark:bg-slate-950 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-inner flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={reportLogoUrl || "/logo.png"}
                      alt="Logo Pratinjau"
                      onError={(e) => {
                        (e.target as any).src = "/logo.png";
                      }}
                      className="h-12 w-auto max-w-[140px] object-contain shrink-0"
                    />
                    <div className="border-l pl-3 border-slate-300 dark:border-slate-700 space-y-0.5">
                      <p className="text-[11px] font-black uppercase text-slate-900 dark:text-white leading-tight">
                        PT. TAIYO SINAR RAYA TEKNIK
                      </p>
                      <p className="text-[10px] text-slate-500">Quality, Health, Safety & Environment Division</p>
                    </div>
                  </div>
                  <div className="text-right text-[9px] font-mono text-slate-400">
                    DOC: BGG-26-001<br />ISO 45001:2018
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Pembersihan Data Temuan */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-red-200 dark:border-red-900/50 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-black rounded-full">
                  <Trash2 size={13} /> Zona Pembersihan Data (Data Purge)
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Pembersihan Data Temuan Lapangan
                </h3>
                <p className="text-xs text-slate-500 max-w-xl">
                  Fitur untuk menghapus dan me-reset seluruh rekam jejak temuan patroli, dokumentasi foto bukti, dan status penanganan tiket pada semua proyek konstruksi.
                </p>
              </div>

              <button
                onClick={() => {
                  setClearConfirmInput("");
                  setShowClearModal(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-red-600/20 transition-all active:scale-95 shrink-0"
              >
                <Trash2 size={16} />
                <span>Bersihkan Data Temuan Sekarang</span>
              </button>
            </div>

            {/* Statistik Temuan Saat Ini */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Temuan</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{findings.length}</span>
                <span className="text-[10px] text-slate-400">Seluruh proyek aktif</span>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-950/50 rounded-2xl border border-red-200 dark:border-red-900/60">
                <span className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider block">🔴 Tiket OPEN</span>
                <span className="text-2xl font-black text-red-700 dark:text-red-300 mt-1 block">
                  {findings.filter((f) => f.status === "OPEN").length}
                </span>
                <span className="text-[10px] text-red-500 dark:text-red-400">Belum diselesaikan</span>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-950/50 rounded-2xl border border-amber-200 dark:border-amber-900/60">
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">🟡 Tiket RESOLVED</span>
                <span className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1 block">
                  {findings.filter((f) => f.status === "RESOLVED").length}
                </span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400">Menunggu verifikasi PM</span>
              </div>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl border border-emerald-200 dark:border-emerald-900/60">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">🟢 Tiket CLOSED</span>
                <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1 block">
                  {findings.filter((f) => f.status === "CLOSED").length}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Sudah disetujui</span>
              </div>
            </div>

            {/* Target Proyek Filter Dropdown */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="space-y-0.5">
                <label className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                  Pilih Cakupan Pembersihan:
                </label>
                <p className="text-[11px] text-slate-500">
                  Pilih apakah ingin menghapus temuan dari semua proyek atau proyek tertentu saja.
                </p>
              </div>

              <select
                value={clearTargetProjectId}
                onChange={(e) => setClearTargetProjectId(e.target.value)}
                className="w-full sm:w-80 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
              >
                <option value="ALL">Semua Proyek (Global - {findings.length} temuan)</option>
                {projects.map((p) => {
                  const pCount = findings.filter((f) => f.projectId === p.id).length;
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name} ({pCount} temuan)
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Card: Konektivitas & Seeding */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Database size={20} className="text-violet-600 dark:text-violet-400" />
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
                <span>{seeding ? "Sedang Reset Data..." : "Seed / Reset Data Sampel"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH PROYEK */}
      {showAddProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FolderPlus size={20} className="text-violet-600 dark:text-violet-400" />
                <span>Tambah Proyek Konstruksi Baru</span>
              </h3>
              <button
                onClick={() => setShowAddProjectModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Kode Proyek (Project Code)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Opsional (e.g. PRJ-TSS)</span>
                </label>
                <input
                  type="text"
                  value={newProjectCode}
                  onChange={(e) => setNewProjectCode(e.target.value.toUpperCase())}
                  placeholder="e.g. PRJ-TSS"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold font-mono text-slate-900 dark:text-white uppercase focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nama Proyek <span className="text-violet-600 dark:text-violet-400">*</span>
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Pembangunan Flyover Sentul Selatan"
                  required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Lokasi Site Proyek <span className="text-violet-600 dark:text-violet-400">*</span>
                </label>
                <input
                  type="text"
                  value={newProjectLocation}
                  onChange={(e) => setNewProjectLocation(e.target.value)}
                  placeholder="e.g. KM 37 Tol Jagorawi, Bogor"
                  required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Divisi / Unit Bisnis Proyek</span>
                  <span className="text-[10px] text-violet-600 dark:text-violet-400 font-bold">Penomoran DIV-YY-XXX</span>
                </label>
                <select
                  value={newProjectDivision}
                  onChange={(e) => setNewProjectDivision(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="">-- Pilih Kode Divisi Resmi --</option>
                  {MASTER_DIVISIONS.map((div) => (
                    <option key={div.code} value={div.code}>
                      [{div.code}] {div.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Kode divisi ini akan digunakan otomatis pada penomoran dokumen laporan: <code className="text-violet-600 dark:text-violet-400 font-mono font-bold">DIV-YY-XXX</code>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Project Manager (PM)
                  </label>
                  <select
                    value={newProjectPmId}
                    onChange={(e) => setNewProjectPmId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="">-- Pilih PM Penanggung Jawab --</option>
                    {users
                      .filter((u) => u.role === "PM")
                      .map((pm) => (
                        <option key={pm.id} value={pm.id}>
                          {pm.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    General Manager (GM)
                  </label>
                  <select
                    value={newProjectGmId}
                    onChange={(e) => setNewProjectGmId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="">-- Pilih GM Divisi --</option>
                    {users
                      .filter((u) => u.role === "GM")
                      .map((gm) => (
                        <option key={gm.id} value={gm.id}>
                          {gm.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddProjectModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={projectSubmitting}
                  className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-black text-xs rounded-xl shadow-md shadow-violet-500/25 disabled:opacity-50"
                >
                  {projectSubmitting ? "Menyimpan..." : "Simpan Proyek"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PENUGASAN PROYEK (DIVISI, PM, GM) */}
      {showEditProjectModal && editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-violet-100 dark:bg-violet-950 text-violet-600 rounded-xl">
                  <Sliders size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Atur Penugasan Divisi, PM & GM
                  </h3>
                  <p className="text-xs text-slate-500">
                    Proyek: <strong className="text-violet-600 dark:text-violet-400">{editingProject.name}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditProjectModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateProjectAssignmentSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Divisi / Unit Bisnis Proyek</span>
                  <span className="text-[10px] text-violet-600 dark:text-violet-400 font-bold">Penomoran DIV-YY-XXX</span>
                </label>
                <select
                  value={editDivision}
                  onChange={(e) => setEditDivision(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="">-- Belum Ditentukan / Tidak Ada Divisi --</option>
                  {MASTER_DIVISIONS.map((div) => (
                    <option key={div.code} value={div.code}>
                      [{div.code}] {div.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Pilih kode divisi untuk standardisasi penomoran laporan: <code className="text-violet-600 dark:text-violet-400 font-mono font-bold">DIV-YY-XXX</code>
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Project Manager (PM) Penanggung Jawab
                </label>
                <select
                  value={editPmId}
                  onChange={(e) => setEditPmId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="">-- Belum Ditentukan / Tidak Ada PM --</option>
                  {users
                    .filter((u) => u.role === "PM")
                    .map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.name} ({pm.email})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  General Manager (GM) Divisi
                </label>
                <select
                  value={editGmId}
                  onChange={(e) => setEditGmId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="">-- Belum Ditentukan / Tidak Ada GM --</option>
                  {users
                    .filter((u) => u.role === "GM")
                    .map((gm) => (
                      <option key={gm.id} value={gm.id}>
                        {gm.name} ({gm.email})
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  GM dan PIC akan otomatis menerima reminder email jika temuan patroli belum direspon lebih dari batas waktu SLA.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditProjectModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={projectEditSubmitting}
                  className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-black text-xs rounded-xl shadow-md shadow-violet-500/25 disabled:opacity-50"
                >
                  {projectEditSubmitting ? "Menyimpan..." : "Simpan Penugasan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH PIC */}
      {showAddPicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus size={20} className="text-violet-600 dark:text-violet-400" />
                <span>Alokasikan PIC Baru ke Proyek</span>
              </h3>
              <button
                onClick={() => setShowAddPicModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePic} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Pilih Proyek Penugasan <span className="text-violet-600 dark:text-violet-400">*</span>
                </label>
                <select
                  value={newPicProjectId}
                  onChange={(e) => setNewPicProjectId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
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
                  Nama Lengkap PIC <span className="text-violet-600 dark:text-violet-400">*</span>
                </label>
                <input
                  type="text"
                  value={newPicName}
                  onChange={(e) => setNewPicName(e.target.value)}
                  placeholder="e.g. Ir. Suryadi (Subkon Struktur)"
                  required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Email Akun <span className="text-violet-600 dark:text-violet-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={newPicEmail}
                    onChange={(e) => setNewPicEmail(e.target.value)}
                    placeholder="suryadi@subkon.id"
                    required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nomor WhatsApp <span className="text-violet-600 dark:text-violet-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newPicPhone}
                    onChange={(e) => setNewPicPhone(e.target.value)}
                    placeholder="0812-3344-5566"
                    required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Password Akun
                </label>
                <input
                  type="text"
                  value={newPicPassword}
                  onChange={(e) => setNewPicPassword(e.target.value)}
                  placeholder="Default: 123"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddPicModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={picSubmitting}
                  className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-black text-xs rounded-xl shadow-md shadow-violet-500/25 disabled:opacity-50"
                >
                  {picSubmitting ? "Menyimpan..." : "Simpan & Tugaskan PIC"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI PEMBERSIHAN DATA TEMUAN */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-red-500/40 p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-100 dark:bg-red-950/70 text-red-600 rounded-xl">
                  <AlertOctagon size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Konfirmasi Pembersihan Data Temuan
                  </h3>
                  <p className="text-xs text-red-600 dark:text-red-400 font-bold">
                    Tindakan ini tidak dapat dibatalkan (Irreversible)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowClearModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Scope Information */}
            <div className="p-4 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-200 dark:border-red-900/60 space-y-2">
              <span className="text-xs font-bold text-red-900 dark:text-red-300 block">
                Target Proyek yang akan dibersihkan:
              </span>
              <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                {clearTargetProjectId === "ALL" ? (
                  <span className="inline-flex items-center gap-1.5 text-red-700 dark:text-red-300">
                    <Building2 size={16} /> Semua Proyek (Global - {findings.length} data temuan)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-red-700 dark:text-red-300">
                    <Building2 size={16} /> {projects.find((p) => p.id === clearTargetProjectId)?.name || clearTargetProjectId} (
                    {findings.filter((f) => f.projectId === clearTargetProjectId).length} data temuan)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-red-700 dark:text-red-400 leading-relaxed">
                Seluruh tiket temuan patroli, dokumentasi foto sebelum/sesudah, SLA, dan riwayat revisi akan dihapus secara permanen dari database.
              </p>
            </div>

            {/* Pilihan Scope di dalam Modal */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Pilih Cakupan Proyek:
              </label>
              <select
                value={clearTargetProjectId}
                onChange={(e) => setClearTargetProjectId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
              >
                <option value="ALL">Semua Proyek (Global - {findings.length} temuan)</option>
                {projects.map((p) => {
                  const cnt = findings.filter((f) => f.projectId === p.id).length;
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name} ({cnt} temuan)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Safeguard: Input Text Confirmation */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Ketik kata <span className="font-mono text-red-600 font-black">HAPUS</span> di bawah ini untuk konfirmasi:
              </label>
              <input
                type="text"
                value={clearConfirmInput}
                onChange={(e) => setClearConfirmInput(e.target.value)}
                placeholder="Ketik HAPUS"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl text-sm font-black text-slate-900 dark:text-white tracking-widest focus:outline-none focus:border-red-500 uppercase"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                disabled={clearingFindings}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleClearFindings}
                disabled={
                  clearingFindings ||
                  (clearConfirmInput.trim().toUpperCase() !== "HAPUS" &&
                    clearConfirmInput.trim().toUpperCase() !== "CLEAR")
                }
                className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-lg shadow-red-600/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Trash2 size={15} />
                <span>{clearingFindings ? "Sedang Menghapus..." : "Ya, Hapus Data Temuan"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIGURASI ROLE & PENUGASAN PROYEK */}
      {showRoleAssignModal && assignTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 rounded-2xl">
                  <Sliders size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Konfigurasi Role & Penugasan Proyek
                  </h3>
                  <p className="text-xs text-slate-500">
                    Atur wewenang operasional personil sesuai matriks RBAC sistem.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRoleAssignModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* User Info Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">
                  Kode Pegawai: <strong className="text-violet-600 dark:text-violet-400 font-mono">{assignTargetUser.employeeCode || `P${String(users.indexOf(assignTargetUser) + 1).padStart(5, "0")}`}</strong>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                  Role Saat Ini: {assignTargetUser.role}
                </span>
              </div>
              <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                {assignTargetUser.name}
              </h4>
              <p className="text-xs text-slate-500 font-mono">{assignTargetUser.email} • {assignTargetUser.phoneNumber}</p>
            </div>

            <form onSubmit={handleSaveRoleAndProject} className="space-y-4">
              {/* Pilihan Peran (Role) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Pilih Peran Wewenang (Role) <span className="text-violet-500">*</span>
                </label>
                <select
                  value={assignRole}
                  onChange={(e) => setAssignRole(e.target.value as Role)}
                  required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="PIC">PIC (Penanggung Jawab Perbaikan Proyek)</option>
                  <option value="CMD">CMD (Inspector Lapangan / Patrol ISO)</option>
                  <option value="SM">SM / PM (Site Manager / Project Manager)</option>
                  <option value="PM">GM / DivHead / DepMan (Manajemen Divisi / Dept)</option>
                  <option value="GM">SecMan (Section Manager)</option>
                  <option value="BOD">BOD (Board of Directors - Pemantau Eksekutif)</option>
                  <option value="Advisor">Advisor (Konsultan / Advisor Teknis Proyek)</option>
                  <option value="ADMIN">ADMIN (Administrator Sistem)</option>
                  {Object.keys(rolePermissions)
                    .filter((r) => !["PIC", "CMD", "SM", "PM", "GM", "BOD", "Advisor", "ADMIN", "PENDING"].includes(r))
                    .map((customR) => (
                      <option key={customR} value={customR}>
                        {customR} (Custom Role)
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  {ROLE_LABELS[assignRole]?.description || "Role wewenang operasional"}
                </p>
              </div>

              {/* Pilihan Proyek Penugasan */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Proyek Penugasan Lapangan:
                </label>
                <select
                  value={assignProjectId}
                  onChange={(e) => setAssignProjectId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="">Akses Lintas Proyek (Semua Proyek / Global)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.location})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  {assignRole === "PIC"
                    ? "Wajib pilih proyek: PIC akan diisolasi hanya pada tiket proyek ini."
                    : "Opsional: CMD, SM, PM, GM, BOD, dan Admin dapat mengakses lintas proyek."}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRoleAssignModal(false)}
                  disabled={assignSubmitting}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={assignSubmitting}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-black text-xs rounded-xl shadow-lg shadow-violet-600/20 disabled:opacity-50 transition-all active:scale-95"
                >
                  <CheckCircle2 size={16} />
                  <span>{assignSubmitting ? "Menyimpan..." : "Terapkan & Aktifkan Akun"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMPOR PROYEK & PIC DARI CSV */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Impor Data Proyek & PIC dari CSV
                  </h3>
                  <p className="text-xs text-slate-500">
                    Daftarkan proyek dan akun PIC secara massal. Proyek yang sudah ada akan otomatis dilewati.
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseImportModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-sm p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Template Download Card */}
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <Info size={14} /> Format Template CSV Tersedia
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  Kolom: <code className="font-mono bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded">kode_proyek</code>,{" "}
                  <code className="font-mono bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded">nama_proyek</code>,{" "}
                  <code className="font-mono bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded">lokasi_proyek</code>,{" "}
                  <code className="font-mono bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded">nama_pic</code>,{" "}
                  <code className="font-mono bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded">email_pic</code>,{" "}
                  <code className="font-mono bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded">no_hp_pic</code>
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-center"
              >
                <Download size={14} /> Unduh Template CSV
              </button>
            </div>

            {!importReport ? (
              /* Upload & Preview Step */
              <div className="space-y-4">
                {/* File Dropzone / Input */}
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-emerald-500 transition-colors bg-slate-50 dark:bg-slate-800/40">
                  <input
                    type="file"
                    id="csv-file-input"
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="csv-file-input"
                    className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                  >
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                      <Upload size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                        {csvFile ? csvFile.name : "Klik untuk memilih file CSV"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {csvFile ? `${(csvFile.size / 1024).toFixed(1)} KB • Siap diproses` : "Mendukung format koma (,) atau titik-koma (;)"}
                      </p>
                    </div>
                  </label>
                </div>

                {/* Preview Table */}
                {csvPreviewRows.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      Pratinjau Data CSV ({csvPreviewRows.length} baris pertama):
                    </p>
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                      <div className="max-h-40 overflow-y-auto">
                        <table className="w-full text-left">
                          <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300 sticky top-0">
                            <tr>
                              <th className="p-2">Kode</th>
                              <th className="p-2">Nama Proyek</th>
                              <th className="p-2">Lokasi</th>
                              <th className="p-2">PIC</th>
                              <th className="p-2">Email PIC</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                            {csvPreviewRows.map((r, i) => (
                              <tr key={i}>
                                <td className="p-2 font-bold text-violet-600 dark:text-violet-400">{r.code}</td>
                                <td className="p-2 font-sans font-semibold text-slate-900 dark:text-white">{r.name}</td>
                                <td className="p-2 font-sans">{r.location}</td>
                                <td className="p-2 font-sans">{r.pic}</td>
                                <td className="p-2">{r.email}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleCloseImportModal}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteImport}
                    disabled={!csvFile || importingCsv}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/20 disabled:opacity-40 transition-all active:scale-95"
                  >
                    <FileUp size={16} />
                    <span>{importingCsv ? "Memproses Impor..." : "Mulai Impor Sekarang"}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Report / Results View */
              <div className="space-y-4">
                {/* 4 Stat Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Total Baris</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{importReport.totalRows}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Berhasil</p>
                    <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">{importReport.successCount}</p>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">Dilewati (Ada)</p>
                    <p className="text-xl font-black text-amber-700 dark:text-amber-400 mt-0.5">{importReport.skippedCount}</p>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-200 dark:border-red-800 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-red-600">Gagal / Error</p>
                    <p className="text-xl font-black text-red-700 dark:text-red-400 mt-0.5">{importReport.errorCount}</p>
                  </div>
                </div>

                {/* Detailed Report Table */}
                <div className="space-y-2">
                  <p className="text-xs font-black text-slate-900 dark:text-white">
                    Laporan Rinci Hasil Impor Per Baris:
                  </p>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300 sticky top-0">
                          <tr>
                            <th className="p-2.5">Baris</th>
                            <th className="p-2.5">Kode & Proyek</th>
                            <th className="p-2.5">PIC</th>
                            <th className="p-2.5">Status</th>
                            <th className="p-2.5">Keterangan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                          {importReport.details.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="p-2.5 font-mono text-[11px] text-slate-400 font-bold">
                                #{item.rowNumber}
                              </td>
                              <td className="p-2.5">
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 rounded mr-1.5">
                                  {item.projectCode}
                                </span>
                                <span className="font-bold text-slate-900 dark:text-white">{item.projectName}</span>
                              </td>
                              <td className="p-2.5 text-[11px]">
                                {item.picName} {item.picEmail && item.picEmail !== "-" ? `(${item.picEmail})` : ""}
                              </td>
                              <td className="p-2.5 whitespace-nowrap">
                                {item.status === "SUCCESS" && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black text-[10px] rounded-md">
                                    <Check size={12} /> BERHASIL
                                  </span>
                                )}
                                {item.status === "SKIPPED" && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-black text-[10px] rounded-md">
                                    <AlertTriangle size={12} /> DILEWATI
                                  </span>
                                )}
                                {item.status === "ERROR" && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-black text-[10px] rounded-md">
                                    <XCircle size={12} /> GAGAL
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-[11px] text-slate-600 dark:text-slate-400">
                                {item.message}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setImportReport(null);
                      setCsvFile(null);
                      setCsvTextContent("");
                      setCsvPreviewRows([]);
                    }}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline"
                  >
                    ← Impor Berkas Lain
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseImportModal}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95"
                  >
                    Selesai & Tutup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH ROLE BARU (Poin 11) */}
      {showAddRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <PlusCircle size={20} className="text-violet-600" />
                <span>Tambah Role Wewenang Baru</span>
              </h3>
              <button
                onClick={() => setShowAddRoleModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomRole} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nama Role Baru (e.g. QA_QC, Safety_Officer, Konsultan):
                </label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Contoh: QA_QC atau Auditor_Eksternal"
                  required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500"
                />
                <p className="text-[11px] text-slate-500">
                  Role baru akan otomatis muncul di kolom matriks RBAC dan dapat diatur izin aksesnya secara granular.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddRoleModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!newRoleName.trim()}
                  className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-black text-xs rounded-xl shadow-md shadow-violet-500/25 disabled:opacity-50"
                >
                  Tambahkan ke Matriks
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
