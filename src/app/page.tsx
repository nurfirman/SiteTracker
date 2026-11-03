"use client";

import React, { useState, useEffect } from "react";
import { Finding, Project, Category, FindingStatus, CategorySettingItem } from "@/types";
import { getFindings, getProjects, validateFinding, getCategorySettings, deleteFinding } from "@/lib/actions";
import { useRole } from "@/components/RoleContext";
import { StatusBadge } from "@/components/StatusBadge";
import { FindingCard } from "@/components/FindingCard";
import { FindingCardGridSkeleton } from "@/components/SkeletonLoader";
import { SideBySideModal } from "@/components/SideBySideModal";
import { ProjectCombobox } from "@/components/ProjectCombobox";
import Link from "next/link";
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Filter,
  RefreshCw,
  Search,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  CheckSquare,
  Sliders,
  Phone,
  PieChart,
  BarChart3,
} from "lucide-react";

export default function DashboardPage() {
  const { currentUser } = useRole();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [availableCategories, setAvailableCategories] = useState<CategorySettingItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedProject, setSelectedProject] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal Side-by-side
  const [selectedModalFinding, setSelectedModalFinding] = useState<Finding | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedFindings, fetchedProjects, fetchedCategories] = await Promise.all([
        getFindings({
          projectId: selectedProject,
          category: selectedCategory as Category,
          status: selectedStatus as FindingStatus,
          search: searchQuery,
        }),
        getProjects(),
        getCategorySettings(),
      ]);
      setFindings(fetchedFindings);
      setProjects(fetchedProjects);
      if (fetchedCategories && fetchedCategories.length > 0) {
        setAvailableCategories(fetchedCategories);
      }
    } catch (err) {
      console.error("Gagal memuat data dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (["PIC", "SM"].includes(currentUser.role) && currentUser.projectId) {
      setSelectedProject(currentUser.projectId);
    } else {
      setSelectedProject("ALL");
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [selectedProject, selectedCategory, selectedStatus, currentUser]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Stats calculation
  const totalOpen = findings.filter((f) => f.status === "OPEN").length;
  const totalResolved = findings.filter((f) => f.status === "RESOLVED").length;
  const totalRejected = findings.filter((f) => f.status === "OPEN" && !!f.rejectionNote).length;
  const totalClosed = findings.filter((f) => f.status === "CLOSED").length;
  const totalAll = findings.length;

  const resolvedForValidation = findings.filter((f) => f.status === "RESOLVED");

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleApproveFinding = async (findingId: string) => {
    const res = await validateFinding({ findingId, action: "APPROVE" });
    if (res.success) {
      showToast("Berhasil menyetujui perbaikan. Status temuan CLOSED.");
    }
    loadData();
  };

  const handleRejectFinding = async (findingId: string, note: string) => {
    const res = await validateFinding({ findingId, action: "REJECT", rejectionNote: note });
    if (res.success) {
      showToast("Perbaikan ditolak dan dikembalikan ke status OPEN untuk revisi.");
    }
    loadData();
  };

  const handleDeleteFinding = async (finding: Finding) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus temuan ${finding.ticketCode} (${finding.description || "Tanpa deskripsi"})? Tindakan ini permanen.`)) {
      return;
    }
    const res = await deleteFinding(finding.id);
    if (res.success) {
      showToast(res.message);
      loadData();
    } else {
      showToast(res.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 bg-slate-900 text-white rounded-2xl border border-violet-500/50 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="text-violet-400 w-5 h-5 shrink-0" />
          <span className="text-xs font-extrabold">{toastMessage}</span>
        </div>
      )}

      {/* Banner & Greeting Header */}
      <div className="bg-gradient-to-r from-violet-100/90 via-violet-50 to-white dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-800 dark:to-violet-950 border border-violet-200 dark:border-slate-800 p-6 sm:p-8 rounded-3xl text-slate-900 dark:text-white shadow-sm dark:shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-100 dark:bg-violet-950/80 border border-violet-300 dark:border-violet-800/80 text-violet-900 dark:text-violet-300 text-xs font-extrabold rounded-full backdrop-blur-md">
            <ShieldCheck size={14} className="text-violet-600 dark:text-violet-400" />
            <span>
              {currentUser.role === "PENDING"
                ? "Menunggu Penugasan Role & Proyek dari Administrator"
                : ["PIC", "SM"].includes(currentUser.role)
                  ? `Portal Site Manager (${currentUser.project?.name || "Site Lapangan"})`
                  : currentUser.role === "ADMIN"
                    ? "Portal Administrator Master Proyek & Hak Akses"
                    : "Sistem Patrol Safety Dan Quality Compliance"
              }
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Hello, {currentUser.name}!
          </h1>
          <p className="text-sm text-slate-700 dark:text-slate-300 max-w-2xl leading-relaxed font-medium">
            {currentUser.role === "PENDING"
              ? "Akun Anda telah berhasil terdaftar. Saat ini status akun Anda masih dalam proses peninjauan oleh Administrator. Data temuan proyek akan ditampilkan di sini setelah peran dan penugasan proyek Anda disetujui."
              : ["PIC", "SM"].includes(currentUser.role)
                ? "Tampilan antarmuka Anda terisolasi khusus proyek penugasan. Tindak lanjuti temuan yang masih berstatus OPEN dan unggah bukti perbaikan."
                : currentUser.role === "ADMIN"
                  ? "Kelola master proyek, penugasan Site Manager, setting toleransi SLA kategori, dan konfigurasi wewenang peran sistem."
                  : "Sistem monitoring dan folowup temuan  real-time untuk memastikan keselamatan Safety (ISO 45001) dan Quality proyek (ISO 9001)."}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {["CMD", "PM", "SM", "ADMIN"].includes(currentUser.role) && (
            <Link
              href="/findings/new"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] text-sm font-black text-white bg-violet-600 hover:bg-violet-500 rounded-2xl shadow-md shadow-violet-500/25 active:scale-95 transition-all"
            >
              <PlusCircle size={20} />
              <span>+ Catat Temuan Baru</span>
            </Link>
          )}

          {["PIC", "SM"].includes(currentUser.role) && (
            <Link
              href="/pic/tasks"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] text-sm font-black text-white bg-violet-600 hover:bg-violet-500 rounded-2xl shadow-md shadow-violet-500/25 active:scale-95 transition-all"
            >
              <CheckSquare size={20} />
              <span>Tindak Lanjut Tugas ({totalOpen})</span>
            </Link>
          )}

          {currentUser.role === "ADMIN" && (
            <Link
              href="/admin"
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 min-h-[48px] text-sm font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl border border-slate-200 dark:border-slate-700 transition-all shadow-xs"
            >
              <Sliders size={18} />
              <span>Pengaturan Admin</span>
            </Link>
          )}

          <button
            onClick={loadData}
            className="inline-flex items-center justify-center p-3.5 min-h-[48px] min-w-[48px] text-slate-700 dark:text-white bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl border border-slate-200 dark:border-slate-700 transition-all active:scale-95 shadow-xs"
            title="Muat ulang data"
          >
            <RefreshCw size={18} className={loading ? "animate-spin text-violet-600" : ""} />
          </button>
        </div>
      </div>

      {/* JIKA USER BERSTATUS PENDING: KOSONGKAN TEMUAN & TAMPILKAN EMPTY STATE INFORMATIF */}
      {currentUser.role === "PENDING" ? (
        <div className="p-8 sm:p-12 bg-white dark:bg-slate-900 border-2 border-dashed border-amber-300 dark:border-amber-800/80 rounded-3xl text-center space-y-5 shadow-sm">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
            <Clock size={32} />
          </div>
          <div className="space-y-2 max-w-lg mx-auto">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              Data Temuan Proyek Dikosongkan
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Halo <strong>{currentUser.name}</strong>, akun Anda masih berstatus <strong>PENDING</strong> (menunggu persetujuan Admin). Seluruh indikator KPI dan daftar temuan proyek dikosongkan sampai Administrator menghubungkan akun Anda ke peran (Role) dan proyek kerja.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <a
              href={`https://wa.me/6281234567890?text=Halo%20Admin%20SiteTracker,%20saya%20sudah%20mendaftar%20dengan%20nama%20${encodeURIComponent(
                currentUser.name
              )}%20(${encodeURIComponent(currentUser.email)}),%20mohon%20bantuannya%20untuk%20aktivasi%20wewenang%20role%20dan%20proyek%20saya.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl shadow-md shadow-emerald-600/20 transition-all active:scale-95"
            >
              <Phone size={16} />
              <span>Hubungi Administrator untuk Aktivasi</span>
            </a>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 px-5 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-2xl transition-all active:scale-95"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              <span>Cek Status Aktivasi</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* GRAFIK PIE RINGKASAN STATUS TEMUAN & GRAFIK BAR HORIZONTAL PER PROYEK (SEBELUM CARD) */}
          <div className="p-6 sm:p-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 text-xs font-extrabold rounded-lg">
                  <PieChart size={14} />
                  <span>Visualisasi KPI Status & Distribusi Temuan Proyek</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  Grafik Status Temuan
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Diagram status temuan untuk setiap proyek yang memiliki temuan.
                </p>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-center bg-slate-50 dark:bg-slate-800/70 px-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                <Layers size={18} className="text-violet-600 dark:text-violet-400 shrink-0" />
                <div className="text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold block">
                    Total Temuan Patrol
                  </span>
                  <span className="font-black text-sm text-slate-900 dark:text-white">
                    {totalAll} Temuan{" "}
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      ({totalAll > 0 ? Math.round((totalClosed / totalAll) * 100) : 0}% Closed)
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {(() => {
              const pieSlices = [
                {
                  key: "OPEN",
                  label: "Temuan Open (Perlu Tindakan)",
                  shortLabel: "Open",
                  value: totalOpen,
                  color: "#ef4444", // red-500
                  dotClass: "bg-red-500",
                  borderClass: "border-red-200 dark:border-red-900/60",
                  bgClass: "bg-red-50/70 dark:bg-red-950/30",
                  textClass: "text-red-700 dark:text-red-400",
                },
                {
                  key: "RESOLVED",
                  label: "Menunggu Validasi (Resolved)",
                  shortLabel: "Resolved",
                  value: totalResolved,
                  color: "#f59e0b", // amber-500
                  dotClass: "bg-amber-500",
                  borderClass: "border-amber-200 dark:border-amber-900/60",
                  bgClass: "bg-amber-50/70 dark:bg-amber-950/30",
                  textClass: "text-amber-700 dark:text-amber-400",
                },
                {
                  key: "REJECTED",
                  label: "Validasi Ditolak (Perlu Revisi)",
                  shortLabel: "Revisi",
                  value: totalRejected,
                  color: "#f43f5e", // rose-500
                  dotClass: "bg-rose-500",
                  borderClass: "border-rose-200 dark:border-rose-900/60",
                  bgClass: "bg-rose-50/70 dark:bg-rose-950/30",
                  textClass: "text-rose-700 dark:text-rose-400",
                },
                {
                  key: "CLOSED",
                  label: "Selesai & Diverifikasi (Closed)",
                  shortLabel: "Closed",
                  value: totalClosed,
                  color: "#10b981", // emerald-500
                  dotClass: "bg-emerald-500",
                  borderClass: "border-emerald-200 dark:border-emerald-900/60",
                  bgClass: "bg-emerald-50/70 dark:bg-emerald-950/30",
                  textClass: "text-emerald-700 dark:text-emerald-400",
                },
              ];

              const pieSum = pieSlices.reduce((acc, s) => acc + s.value, 0);
              const cx = 130;
              const cy = 130;
              const radius = 110;

              const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
                const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
                return {
                  x: centerX + r * Math.cos(angleInRadians),
                  y: centerY + r * Math.sin(angleInRadians),
                };
              };

              const createPieSlicePath = (startAngle: number, endAngle: number) => {
                const start = polarToCartesian(cx, cy, radius, endAngle);
                const end = polarToCartesian(cx, cy, radius, startAngle);
                const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
                return [
                  "M",
                  cx,
                  cy,
                  "L",
                  start.x,
                  start.y,
                  "A",
                  radius,
                  radius,
                  0,
                  largeArcFlag,
                  0,
                  end.x,
                  end.y,
                  "Z",
                ].join(" ");
              };

              let currentAngle = 0;
              const computedSlices = pieSlices.map((slice) => {
                const fraction = pieSum > 0 ? slice.value / pieSum : 0;
                const sweepAngle = fraction * 360;
                const startAngle = currentAngle;
                const endAngle = currentAngle + sweepAngle;
                const midAngle = startAngle + sweepAngle / 2;
                currentAngle = endAngle;

                const labelPos = polarToCartesian(cx, cy, radius * 0.62, midAngle);

                return {
                  ...slice,
                  fraction,
                  pct: pieSum > 0 ? Math.round(fraction * 100) : 0,
                  startAngle,
                  endAngle,
                  sweepAngle,
                  labelPos,
                };
              });

              // Hitung statistik temuan per proyek (hanya proyek yang memiliki temuan > 0)
              const projectFindingsMap = new Map<
                string,
                {
                  projectId: string;
                  projectName: string;
                  projectCode: string;
                  division: string;
                  openOnly: number;
                  rejected: number;
                  resolved: number;
                  closed: number;
                  total: number;
                }
              >();

              findings.forEach((f) => {
                const pId = f.projectId || "unknown";
                const matchedProj = projects.find((p) => p.id === pId);
                const pName = matchedProj?.name || f.project?.name || "Proyek Lainnya";
                const pCode = matchedProj?.code || f.project?.code || "";
                const pDiv = matchedProj?.division || f.project?.division || "";

                let entry = projectFindingsMap.get(pId);
                if (!entry) {
                  entry = {
                    projectId: pId,
                    projectName: pName,
                    projectCode: pCode,
                    division: pDiv,
                    openOnly: 0,
                    rejected: 0,
                    resolved: 0,
                    closed: 0,
                    total: 0,
                  };
                  projectFindingsMap.set(pId, entry);
                }

                entry.total += 1;
                if (f.status === "OPEN") {
                  if (f.rejectionNote) {
                    entry.rejected += 1;
                  } else {
                    entry.openOnly += 1;
                  }
                } else if (f.status === "RESOLVED") {
                  entry.resolved += 1;
                } else if (f.status === "CLOSED") {
                  entry.closed += 1;
                }
              });

              const projectsWithFindings = Array.from(projectFindingsMap.values())
                .filter((p) => p.total > 0)
                .sort((a, b) => b.total - a.total);

              const maxProjectTotal =
                projectsWithFindings.length > 0
                  ? Math.max(...projectsWithFindings.map((p) => p.total), 1)
                  : 1;

              return (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  {/* Kolom Kiri (5 Kolom): Diagram Pie (SVG Pie Chart) + Ringkasan Angka */}
                  <div className="lg:col-span-5 flex flex-col justify-between bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/70 pb-2.5">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <PieChart size={14} className="text-violet-600 dark:text-violet-400" />
                        <span>Proporsi Status Temuan (Pie)</span>
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        Total: {totalAll}
                      </span>
                    </div>

                    <div className="relative flex items-center justify-center py-1">
                      <svg
                        viewBox="0 0 260 260"
                        className="w-48 h-48 sm:w-56 sm:h-56 drop-shadow-md"
                        aria-label="Pie Chart Status Temuan"
                      >
                        {pieSum === 0 ? (
                          <>
                            <circle
                              cx={cx}
                              cy={cy}
                              r={radius}
                              fill="#e2e8f0"
                              className="dark:fill-slate-800"
                            />
                            <text
                              x={cx}
                              y={cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              className="fill-slate-500 dark:fill-slate-400 text-xs font-bold"
                            >
                              Belum Ada Data (0)
                            </text>
                          </>
                        ) : (
                          computedSlices.map((slice) => {
                            if (slice.value <= 0) return null;

                            // Jika 1 kategori bernilai 100%, gambar circle penuh
                            if (slice.fraction >= 0.999) {
                              return (
                                <g key={slice.key}>
                                  <circle
                                    cx={cx}
                                    cy={cy}
                                    r={radius}
                                    fill={slice.color}
                                    stroke="#ffffff"
                                    strokeWidth="2"
                                    className="dark:stroke-slate-900 transition-opacity hover:opacity-90"
                                  >
                                    <title>{`${slice.label}: ${slice.value} (${slice.pct}%)`}</title>
                                  </circle>
                                  <text
                                    x={cx}
                                    y={cy - 6}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fill="#ffffff"
                                    className="font-black text-base drop-shadow-xs pointer-events-none"
                                  >
                                    {slice.value}
                                  </text>
                                  <text
                                    x={cx}
                                    y={cy + 12}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fill="#ffffff"
                                    className="font-bold text-[11px] drop-shadow-xs pointer-events-none"
                                  >
                                    ({slice.pct}%)
                                  </text>
                                </g>
                              );
                            }

                            return (
                              <g key={slice.key} className="group cursor-pointer">
                                <path
                                  d={createPieSlicePath(slice.startAngle, slice.endAngle)}
                                  fill={slice.color}
                                  stroke="#ffffff"
                                  strokeWidth="2.5"
                                  strokeLinejoin="round"
                                  className="dark:stroke-slate-900 transition-opacity group-hover:opacity-90"
                                >
                                  <title>{`${slice.label}: ${slice.value} (${slice.pct}%)`}</title>
                                </path>
                                {slice.fraction >= 0.06 && (
                                  <g className="pointer-events-none">
                                    <text
                                      x={slice.labelPos.x}
                                      y={slice.labelPos.y - 5}
                                      textAnchor="middle"
                                      dominantBaseline="middle"
                                      fill="#ffffff"
                                      className="font-black text-xs sm:text-sm drop-shadow-xs"
                                    >
                                      {slice.value}
                                    </text>
                                    <text
                                      x={slice.labelPos.x}
                                      y={slice.labelPos.y + 9}
                                      textAnchor="middle"
                                      dominantBaseline="middle"
                                      fill="#ffffff"
                                      className="font-extrabold text-[10px] drop-shadow-xs"
                                    >
                                      {slice.pct}%
                                    </text>
                                  </g>
                                )}
                              </g>
                            );
                          })
                        )}
                      </svg>
                    </div>

                    {/* Grid Ringkas 4 Status + Total di Bawah Pie */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {computedSlices.map((item) => (
                        <div
                          key={item.key}
                          className={`p-2.5 rounded-xl border ${item.borderClass} ${item.bgClass} flex items-center justify-between gap-2`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.dotClass}`} />
                            <span className={`text-[11px] font-black uppercase truncate ${item.textClass}`}>
                              {item.shortLabel}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-sm font-black text-slate-900 dark:text-white">
                              {item.value}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1">
                              ({item.pct}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Kolom Kanan (7 Kolom): Grafik Bar Horizontal Per Proyek yang Memiliki Temuan */}
                  <div className="lg:col-span-7 flex flex-col justify-between bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 dark:border-slate-700/70 pb-2.5">
                      <div>
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                          <BarChart3 size={15} className="text-violet-600 dark:text-violet-400" />
                          <span>Grafik Bar Horizontal Temuan Per Proyek</span>
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          Menampilkan proyek yang memiliki temuan beserta komposisi statusnya
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 text-[11px] font-black self-start sm:self-auto shrink-0">
                        <Building2 size={12} />
                        <span>{projectsWithFindings.length} Proyek Memiliki Temuan</span>
                      </span>
                    </div>

                    {projectsWithFindings.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-2">
                        <Building2 size={32} className="text-slate-300 dark:text-slate-600" />
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          Belum ada proyek yang memiliki temuan pada filter saat ini.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3.5 max-h-[340px] overflow-y-auto pr-1.5">
                        {projectsWithFindings.map((proj, idx) => {
                          const totalBarWidthPct = Math.max(
                            Math.round((proj.total / maxProjectTotal) * 100),
                            8
                          );
                          const openPct = proj.total > 0 ? (proj.openOnly / proj.total) * 100 : 0;
                          const resolvedPct = proj.total > 0 ? (proj.resolved / proj.total) * 100 : 0;
                          const rejectedPct = proj.total > 0 ? (proj.rejected / proj.total) * 100 : 0;
                          const closedPct = proj.total > 0 ? (proj.closed / proj.total) * 100 : 0;
                          const isSelected = selectedProject === proj.projectId;

                          return (
                            <div
                              key={proj.projectId}
                              onClick={() =>
                                setSelectedProject(
                                  selectedProject === proj.projectId ? "ALL" : proj.projectId
                                )
                              }
                              title="Klik untuk memfilter temuan proyek ini"
                              className={`p-3 rounded-xl border transition-all cursor-pointer space-y-2 ${isSelected
                                ? "bg-violet-50/90 dark:bg-violet-950/40 border-violet-400 dark:border-violet-600 shadow-xs"
                                : "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-700"
                                }`}
                            >
                              {/* Nama Proyek & Total Temuan */}
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <div className="flex items-center gap-1.5 min-w-0 truncate">
                                  <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                                    #{idx + 1}
                                  </span>
                                  {proj.projectCode && (
                                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 shrink-0">
                                      {proj.projectCode}
                                    </span>
                                  )}
                                  {proj.division && (
                                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 shrink-0">
                                      {proj.division}
                                    </span>
                                  )}
                                  <span className="font-extrabold text-slate-900 dark:text-white truncate">
                                    {proj.projectName}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[11px] font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                                    {proj.total} Temuan
                                  </span>
                                </div>
                              </div>

                              {/* Horizontal Bar Track */}
                              <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                                <div
                                  className="h-full rounded-full overflow-hidden flex transition-all duration-500"
                                  style={{ width: `${totalBarWidthPct}%` }}
                                >
                                  {proj.openOnly > 0 && (
                                    <div
                                      style={{ width: `${openPct}%` }}
                                      className="bg-red-500 h-full"
                                      title={`Open: ${proj.openOnly}`}
                                    />
                                  )}
                                  {proj.resolved > 0 && (
                                    <div
                                      style={{ width: `${resolvedPct}%` }}
                                      className="bg-amber-500 h-full"
                                      title={`Resolved: ${proj.resolved}`}
                                    />
                                  )}
                                  {proj.rejected > 0 && (
                                    <div
                                      style={{ width: `${rejectedPct}%` }}
                                      className="bg-rose-500 h-full"
                                      title={`Revisi: ${proj.rejected}`}
                                    />
                                  )}
                                  {proj.closed > 0 && (
                                    <div
                                      style={{ width: `${closedPct}%` }}
                                      className="bg-emerald-500 h-full"
                                      title={`Closed: ${proj.closed}`}
                                    />
                                  )}
                                </div>
                              </div>

                              {/* Rincian Angka Status Per Proyek */}
                              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                <div className="flex flex-wrap items-center gap-2.5">
                                  <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                                    <span className="w-2 h-2 rounded-full bg-red-500" />
                                    Open: <strong>{proj.openOnly + proj.rejected}</strong>
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                    Resolved: <strong>{proj.resolved}</strong>
                                  </span>
                                  {proj.rejected > 0 && (
                                    <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                                      Revisi: <strong>{proj.rejected}</strong>
                                    </span>
                                  )}
                                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    Closed: <strong>{proj.closed}</strong>
                                  </span>
                                </div>
                                <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                                  {Math.round(closedPct)}% Selesai
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Legend Bar Horizontal */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/70 text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="flex flex-wrap items-center gap-3 font-bold">
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-xs bg-red-500" /> Open
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" /> Resolved
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" /> Revisi
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> Closed
                        </span>
                      </div>
                      <span className="text-[10px] italic">
                        *Klik baris proyek untuk memfilter kartu & daftar temuan
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* SUMMARY CARDS (RINGKASAN STATUS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Card OPEN */}
            <div className="p-6 bg-white dark:bg-slate-900 border-2 border-red-200 dark:border-red-900/60 rounded-3xl shadow-sm hover:shadow-md transition-all space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-wider uppercase text-red-800 dark:text-red-400">
                  Temuan Open (Perlu Tindakan)
                </span>
                <div className="p-2.5 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-2xl">
                  <AlertCircle size={24} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-slate-900 dark:text-white">
                  {totalOpen}
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Temuan Open</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-400 font-medium">
                Perlu perbaikan segera oleh Site Manager.
              </p>
            </div>

            {/* Card RESOLVED */}
            <div className="p-6 bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-amber-900/60 rounded-3xl shadow-sm hover:shadow-md transition-all space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-wider uppercase text-amber-900 dark:text-amber-400">
                  Menunggu Validasi Inspector
                </span>
                <div className="p-2.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-2xl">
                  <Clock size={24} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-slate-900 dark:text-white">
                  {totalResolved}
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Temuan Resolved</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-400 font-medium">
                SM sudah kirim perbaikan. Siap divalidasi Inspector/Pelapor.
              </p>
            </div>

            {/* Card REJECTED (VALIDASI DITOLAK) */}
            <div className="p-6 bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-900/70 rounded-3xl shadow-sm hover:shadow-md transition-all space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-wider uppercase text-rose-800 dark:text-rose-400">
                  Validasi Ditolak (Revisi)
                </span>
                <div className="p-2.5 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded-2xl">
                  <XCircle size={24} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-slate-900 dark:text-white">
                  {totalRejected}
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Perlu Revisi</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-400 font-medium">
                Perbaikan ditolak Inspector. Perlu perbaikan ulang oleh SM.
              </p>
            </div>

            {/* Card CLOSED */}
            <div className="p-6 bg-white dark:bg-slate-900 border-2 border-emerald-200 dark:border-emerald-900/60 rounded-3xl shadow-sm hover:shadow-md transition-all space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-wider uppercase text-emerald-900 dark:text-emerald-400">
                  Selesai & Diverifikasi (Closed)
                </span>
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-2xl">
                  <CheckCircle2 size={24} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-slate-900 dark:text-white">
                  {totalClosed}
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Temuan Closed</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-400 font-medium">
                Tuntas dikerjakan dan telah disetujui Inspector/PM.
              </p>
            </div>

            {/* Card TOTAL */}
            <div className="p-6 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-md transition-all space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-wider uppercase text-slate-800 dark:text-slate-400">
                  Total Temuan Patrol
                </span>
                <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 rounded-2xl">
                  <Layers size={24} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-slate-900 dark:text-white">
                  {totalAll}
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Total Temuan</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-400 font-medium">
                {["PIC", "SM"].includes(currentUser.role) ? "Total temuan pada proyek ini." : "Akumulasi temuan Patrol di seluruh proyek."}
              </p>
            </div>
          </div>

          {/* SECTION VALIDASI INSPECTOR (SIDE-BY-SIDE HIGHLIGHT) */}
          {(!["PIC", "SM", "PENDING"].includes(currentUser.role) || resolvedForValidation.length > 0) && (
            <div className="p-6 bg-violet-50/70 dark:bg-violet-950/20 border-2 border-violet-300 dark:border-violet-800/80 rounded-3xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-600 text-white font-extrabold text-xs rounded-lg uppercase tracking-wider mb-1">
                    <Clock size={14} /> Antrean Validasi Inspector (CMD / PM / Manajemen)
                  </span>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    Validasi Hasil Perbaikan Site Manager ({resolvedForValidation.length} Temuan Menunggu)
                  </h2>
                </div>

                <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                  Bandingkan Foto Before & sesudah untuk memberikan validasi persetujuan
                </span>
              </div>

              {resolvedForValidation.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-violet-200 dark:border-violet-900 text-center space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Tidak Ada Antrean Validasi
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                    Seluruh perbaikan yang dikirim Site Manager telah divalidasi oleh Tim Inspector / Pelapor.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {resolvedForValidation.map((finding) => (
                    <div
                      key={finding.id}
                      className="bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-violet-200 dark:border-violet-800 shadow-sm space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-900 text-white rounded-md">
                            {finding.ticketCode}
                          </span>
                          <StatusBadge status="RESOLVED" size="sm" />
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2">
                          {finding.description}
                        </h4>
                        <p className="text-xs text-slate-700 dark:text-slate-400 truncate flex items-center gap-1 font-medium">
                          <Building2 size={12} className="shrink-0 text-violet-600 dark:text-violet-400" />
                          <span>{finding.locationDetail}</span>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedModalFinding(finding)}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] text-sm font-extrabold text-white bg-violet-600 hover:bg-violet-500 rounded-xl shadow-sm transition-all active:scale-95"
                      >
                        <span>Tinjau Side-by-Side</span>
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FILTER & DAFTAR TEMUAN UTAMA */}
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  Daftar Temuan Patrol Lapangan
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Pilih tab status atau gunakan filter proyek & kategori untuk meninjau temuan.
                </p>
              </div>

              {/* Quick Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-x-auto">
                <button
                  onClick={() => setSelectedStatus("ALL")}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${selectedStatus === "ALL"
                    ? "bg-violet-600 text-white shadow-md"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                >
                  Semua ({totalAll})
                </button>
                <button
                  onClick={() => setSelectedStatus("OPEN")}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${selectedStatus === "OPEN"
                    ? "bg-red-600 text-white shadow-md"
                    : "text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50"
                    }`}
                >
                  <AlertCircle size={14} />
                  <span>Open ({totalOpen})</span>
                </button>
                <button
                  onClick={() => setSelectedStatus("RESOLVED")}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${selectedStatus === "RESOLVED"
                    ? "bg-amber-600 text-white shadow-md"
                    : "text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50"
                    }`}
                >
                  <Clock size={14} />
                  <span>Resolved ({totalResolved})</span>
                </button>
                <button
                  onClick={() => setSelectedStatus("CLOSED")}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${selectedStatus === "CLOSED"
                    ? "bg-emerald-600 text-white shadow-md"
                    : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                    }`}
                >
                  <CheckCircle2 size={14} />
                  <span>Closed ({totalClosed})</span>
                </button>
              </div>
            </div>

            {/* Filter Controls Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari kode temuan (CMD-2026-001), deskripsi, atau lokasi..."
                    className="w-full pl-12 pr-4 py-3 min-h-[48px] text-sm font-semibold rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 min-h-[48px] text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-2xl transition-all"
                >
                  Cari
                </button>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                {/* Filter Proyek */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Filter Proyek:
                  </label>
                  <ProjectCombobox
                    projects={projects}
                    value={selectedProject}
                    onChange={(newProjId) => setSelectedProject(newProjId)}
                    disabled={["PIC", "SM"].includes(currentUser.role)}
                    showAllOption={!["PIC", "SM"].includes(currentUser.role)}
                    allOptionLabel="Semua Proyek"
                    size="sm"
                  />
                </div>

                {/* Filter Kategori */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Filter Kategori:
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[44px] text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="ALL">Semua Kategori</option>
                    {availableCategories.length > 0 ? (
                      availableCategories.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="K3_SAFETY">Safety / Keselamatan</option>
                        <option value="QUALITY">Quality Pekerjaan</option>
                        <option value="KEBERSIHAN_5R">Kebersihan 5R</option>
                        <option value="SCHEDULE">Jadwal & Progres</option>
                        <option value="MATERIAL">Material & Logistik</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Filter Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Filter Status Temuan:
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[44px] text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="ALL">Semua Status (OPEN, RESOLVED, CLOSED)</option>
                    <option value="OPEN">OPEN (Temuan Belum Ditangani)</option>
                    <option value="RESOLVED">RESOLVED (Menunggu Verifikasi PM)</option>
                    <option value="CLOSED">CLOSED (Selesai & Diverifikasi)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Grid Finding Cards */}
            {loading ? (
              <FindingCardGridSkeleton count={6} />
            ) : findings.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                <Filter className="w-12 h-12 text-slate-400 mx-auto opacity-50" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Tidak Ada Temuan Ditemukan
                </h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Coba sesuaikan filter proyek atau kata kunci pencarian Anda.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {findings.map((finding) => (
                  <FindingCard
                    key={finding.id}
                    finding={finding}
                    onOpenSideBySide={(f) => setSelectedModalFinding(f)}
                    onDelete={handleDeleteFinding}
                    currentUserRole={currentUser.role}
                    currentUserId={currentUser.id}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal Side by Side Verification */}
      <SideBySideModal
        finding={selectedModalFinding}
        isOpen={!!selectedModalFinding}
        onClose={() => setSelectedModalFinding(null)}
        onApprove={handleApproveFinding}
        onReject={handleRejectFinding}
        canValidate={
          !["PIC", "SM", "PENDING"].includes(currentUser.role) ||
          (!!selectedModalFinding && selectedModalFinding.reporterId === currentUser.id)
        }
      />
    </div>
  );
}
