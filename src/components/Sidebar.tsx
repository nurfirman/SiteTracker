"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "./RoleContext";
import { Role } from "@/types";
import {
  HardHat,
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  CheckSquare,
  FileText,
  Building2,
  Sliders,
  ShieldCheck,
  Menu,
  X,
  Sparkles,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";
import { cn } from "../lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  highlight?: boolean;
  badge?: string;
  allowedRoles?: Role[];
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { currentUser } = useRole();
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  // Dynamic Navigation based on User Role & Project
  const getNavGroups = (): NavGroup[] => {
    // Khusus pengguna baru yang belum diverifikasi / disetujui Admin
    if (currentUser.role === "PENDING") {
      return [
        {
          group: "Status Akun",
          items: [
            {
              href: "/",
              label: "Beranda Akun (Pending)",
              icon: LayoutDashboard,
            },
            {
              href: "/landing",
              label: "Portal Informasi K3",
              icon: Sparkles,
            },
          ],
        },
      ];
    }

    const groups: NavGroup[] = [];

    // Group 1: Operasional
    const operationalItems: NavItem[] = [
      {
        href: "/",
        label: currentUser.role === "PIC" ? "Dashboard Proyek" : "Dashboard Patroli",
        icon: LayoutDashboard,
      },
    ];

    // Only allow Create Finding for CMD, PM, SM, ADMIN, BOD
    if (["CMD", "PM", "SM", "ADMIN", "BOD"].includes(currentUser.role)) {
      operationalItems.push({
        href: "/findings/new",
        label: "Catat Temuan Baru",
        icon: PlusCircle,
        highlight: true,
        badge: currentUser.role === "CMD" ? "Inspector" : undefined,
      });
    }

    // Findings List
    operationalItems.push({
      href: "/findings",
      label: currentUser.role === "PIC" ? "Daftar Temuan Proyek" : "Semua Temuan Patroli",
      icon: ClipboardList,
    });

    // PIC Tasks / Field Action
    if (["PIC", "SM", "PM", "ADMIN"].includes(currentUser.role)) {
      operationalItems.push({
        href: "/pic/tasks",
        label:
          currentUser.role === "PIC"
            ? "Tugas & Respon PIC"
            : currentUser.role === "SM"
            ? "Monitoring Lapangan (SM)"
            : "Validasi Perbaikan (PM)",
        icon: CheckSquare,
        badge:
          currentUser.role === "PIC"
            ? currentUser.project
              ? currentUser.project.name.split("-")[0].trim()
              : "PIC"
            : undefined,
      });
    }

    groups.push({
      group: "Operasional Patroli",
      items: operationalItems,
    });

    // Group 2: Manajemen & Pelaporan
    const managementItems: NavItem[] = [
      {
        href: "/reports",
        label: "Laporan & Distribusi Email",
        icon: FileText,
      },
      {
        href: "/projects",
        label: "Master Proyek & Tim",
        icon: Building2,
      },
    ];

    if (currentUser.role === "ADMIN") {
      managementItems.push({
        href: "/admin",
        label: "Pengaturan & Hak Akses",
        icon: Sliders,
        badge: "Admin",
      });
    }

    groups.push({
      group: "Manajemen & Laporan",
      items: managementItems,
    });

    // Group 3: Portal Publik
    groups.push({
      group: "Informasi Publik",
      items: [{ href: "/landing", label: "Portal Informasi K3", icon: Sparkles }],
    });

    return groups;
  };

  const navigationGroups = getNavGroups();

  return (
    <>
      {/* Mobile Top Header Toggle */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-slate-950/95 text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800/80 backdrop-blur-md shadow-sm transition-colors">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="p-2 bg-violet-600 text-white rounded-xl shadow-sm shadow-violet-500/20">
            <HardHat size={20} strokeWidth={2.5} />
          </div>
          <div>
            <span className="font-black text-base tracking-tight block text-slate-900 dark:text-white">
              SiteTracker <span className="text-violet-600 dark:text-violet-400">CMD</span>
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block -mt-0.5">
              Patroli Lapangan K3 & Mutu
            </span>
          </div>
        </Link>

        <button
          onClick={() => setIsOpenMobile(!isOpenMobile)}
          className="p-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500"
          aria-label="Toggle Menu"
        >
          {isOpenMobile ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Backdrop for Mobile */}
      {isOpenMobile && (
        <div
          onClick={() => setIsOpenMobile(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Desktop & Mobile Sidebar */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-72 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800/80 flex flex-col justify-between transition-all duration-300 ease-out md:translate-x-0 overflow-y-auto shadow-sm dark:shadow-2xl",
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div>
          <div className="p-5 border-b border-slate-200 dark:border-slate-800/80">
            <Link
              href="/"
              onClick={() => setIsOpenMobile(false)}
              className="flex items-center gap-3 group"
            >
              <div className="p-2.5 bg-violet-600 text-white rounded-2xl shadow-md shadow-violet-500/25 group-hover:scale-105 transition-transform duration-200">
                <HardHat size={24} strokeWidth={2.5} />
              </div>
              <div>
                <span className="block font-black text-lg tracking-tight text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  SiteTracker <span className="text-violet-600 dark:text-violet-400">CMD</span>
                </span>
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  K3 & Mutu Konstruksi
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Groups */}
          <div className="px-3.5 py-4 space-y-6">
            {navigationGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1.5">
                <p className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {group.group}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpenMobile(false)}
                        className={cn(
                          "flex items-center justify-between px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all group",
                          isActive
                            ? "bg-violet-600 text-white shadow-sm shadow-violet-500/20 font-black"
                            : item.highlight
                            ? "bg-violet-50 text-violet-900 border border-violet-300 hover:bg-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800/80 dark:hover:bg-violet-900/50"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-950 dark:hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon
                            size={17}
                            className={cn(
                              "shrink-0",
                              isActive
                                ? "text-white"
                                : item.highlight
                                ? "text-violet-600 dark:text-violet-400"
                                : "text-slate-400 dark:text-slate-400 group-hover:text-violet-600 dark:group-hover:text-violet-400"
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.badge && (
                          <span
                            className={cn(
                              "px-1.5 py-0.5 text-[9px] font-black rounded-md shrink-0 ml-1 truncate max-w-[80px]",
                              isActive
                                ? "bg-violet-950 text-violet-200"
                                : "bg-violet-100 dark:bg-violet-950/80 text-violet-800 dark:text-violet-300 border border-violet-300 dark:border-violet-800/80"
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clean Footer Branding */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-950/90 text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-900 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
            <ShieldCheck size={12} className="text-violet-600 dark:text-violet-400" />
            <span>ISO 45001 & ISO 9001</span>
          </div>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
            SiteTracker CMD © 2026
          </p>
        </div>
      </aside>
    </>
  );
}
