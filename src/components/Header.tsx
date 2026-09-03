"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useRole } from "./RoleContext";
import { ROLE_LABELS, Role } from "@/types";
import { logoutUser } from "@/lib/actions";
import {
  ShieldCheck,
  Activity,
  Clock,
  LogOut,
  ChevronDown,
  User,
  Building2,
  Sliders,
  CheckCircle2,
  HardHat,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, setCurrentUser, availableUsers } = useRole();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");

  // Realtime clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine Page Title & Subtitle based on route
  const getRouteInfo = () => {
    if (pathname === "/") {
      return {
        title: "Dashboard Utama",
        subtitle: "Ringkasan Aktivitas & KPI K3/Mutu Proyek Lapangan",
      };
    }
    if (pathname.startsWith("/findings/new")) {
      return {
        title: "Catat Temuan Baru",
        subtitle: "Perekaman Foto & Lokasi Patroli Lapangan (ISO 45001)",
      };
    }
    if (pathname.startsWith("/findings")) {
      return {
        title: "Daftar Temuan Patroli",
        subtitle: "Monitoring Status Tiket & Riwayat Kualitas Konstruksi",
      };
    }
    if (pathname.startsWith("/pic/tasks")) {
      return {
        title: currentUser.role === "PIC" ? "Tugas Saya (PIC Proyek)" : "Tugas Lapangan & Monitoring",
        subtitle: "Daftar Tindak Lanjut & Pengunggahan Bukti Perbaikan",
      };
    }
    if (pathname.startsWith("/reports")) {
      return {
        title: "Laporan & Ekspor Dokumen",
        subtitle: "Generate Form Cetak Internal Patrol & Distribusi Email Laporan",
      };
    }
    if (pathname.startsWith("/projects")) {
      return {
        title: "Master Proyek & Tim",
        subtitle: "Daftar Proyek Konstruksi & Personil PIC Penanggung Jawab",
      };
    }
    if (pathname.startsWith("/admin")) {
      return {
        title: "Tata Kelola & Pengaturan Admin",
        subtitle: "Kelola Proyek, PIC, Kategori Temuan, SLA & Matriks Hak Akses",
      };
    }
    return {
      title: "SiteTracker CMD",
      subtitle: "Sistem Patroli K3 & Manajemen Mutu Terintegrasi",
    };
  };

  const routeInfo = getRouteInfo();
  const roleConfig = ROLE_LABELS[currentUser.role] || {
    label: currentUser.role,
    badgeClass: "bg-slate-800 text-slate-300",
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      localStorage.removeItem("sitetracker_active_user_id");
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout error:", e);
      router.push("/login");
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/90 text-slate-900 dark:text-slate-100 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/80 px-4 sm:px-6 lg:px-8 py-3 shadow-sm dark:shadow-md transition-colors duration-150">
      <div className="flex items-center justify-between gap-4">
        {/* Left Side: Page Title & Subtitle */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
              {routeInfo.title}
            </h1>
            {currentUser.project && (
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-100 dark:bg-violet-950/80 text-violet-900 dark:text-violet-300 border border-violet-300 dark:border-violet-800">
                <Building2 size={11} className="text-violet-600 dark:text-violet-400" />
                <span className="truncate max-w-[150px]">{currentUser.project.name}</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden sm:block">
            {routeInfo.subtitle}
          </p>
        </div>

        {/* Right Side: Status Badges, Clock, ThemeToggle & User Profile Pill */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Status Badges */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            <span>ISO 45001 & 9001</span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-sky-600 dark:text-sky-400">
            <Activity size={13} className="text-sky-500 dark:text-sky-400" />
            <span>Sistem Online</span>
          </div>

          {/* Realtime Clock */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">
            <Clock size={13} className="text-violet-600 dark:text-violet-400" />
            <span>{currentTime || "--:--:--"}</span>
          </div>

          {/* Dark / Light Mode Switcher */}
          <ThemeToggle
            variant="button"
            className="!bg-slate-100 dark:!bg-slate-900 !border-slate-200 dark:!border-slate-800 !text-slate-700 dark:!text-slate-300 hover:!bg-slate-200 dark:hover:!bg-slate-800 shadow-xs"
          />

          {/* User Profile Pill & Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800/90 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left group focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              aria-label="User profile menu"
            >
              <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm shadow-violet-500/25">
                {currentUser.name.charAt(0)}
              </div>

              <div className="hidden sm:block min-w-0 pr-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate max-w-[120px]">
                    {currentUser.name.split(" ")[0]}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-violet-100 dark:bg-violet-950/80 text-violet-900 dark:text-violet-300 border border-violet-300 dark:border-violet-800">
                    {currentUser.role}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                  {currentUser.role === "PIC" && currentUser.project
                    ? currentUser.project.name
                    : currentUser.email}
                </p>
              </div>

              <ChevronDown
                size={14}
                className={`text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-transform duration-200 hidden sm:block ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-3 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  {/* User Full Details */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <ShieldCheck size={12} className="text-violet-600 dark:text-violet-400" /> Sesi Pengguna Aktif
                    </p>
                    <p className="font-extrabold text-xs text-slate-900 dark:text-white">{currentUser.name}</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">{currentUser.email}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">No. Telp: {currentUser.phoneNumber}</p>
                    {currentUser.project && (
                      <div className="pt-1 mt-1 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1 text-[10px] text-violet-900 dark:text-violet-300 font-semibold">
                        <Building2 size={11} className="text-violet-600 dark:text-violet-400 shrink-0" />
                        <span className="truncate">{currentUser.project.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Mode Tampilan Switcher in Dropdown */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                      Tema Tampilan:
                    </p>
                    <ThemeToggle variant="pill" className="w-full justify-center !bg-slate-100 dark:!bg-slate-950 !border-slate-200 dark:!border-slate-800" />
                  </div>

                  {/* Presentation Demo Role Switcher */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                      Simulasi Peran Cepat (Demo):
                    </p>
                    <div className="grid grid-cols-3 gap-1 max-h-32 overflow-y-auto pr-1">
                      {availableUsers.map((u) => {
                        const isSelected = currentUser.id === u.id;
                        return (
                          <button
                            key={u.id}
                            onClick={() => {
                              setCurrentUser(u);
                              setDropdownOpen(false);
                            }}
                            className={`p-1.5 rounded-lg text-[10px] font-bold text-center border transition-all truncate ${
                              isSelected
                                ? "bg-violet-600 text-white border-violet-500 font-black shadow-sm"
                                : "bg-slate-100 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800"
                            }`}
                            title={`${u.name} (${u.role})`}
                          >
                            {u.role}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Logout Button */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-red-100 hover:bg-red-200 dark:bg-red-950/60 dark:hover:bg-red-900/80 text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-100 rounded-xl text-xs font-bold border border-red-200 dark:border-red-800/60 transition-all active:scale-95"
                    >
                      <LogOut size={14} />
                      <span>Keluar (Logout)</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
