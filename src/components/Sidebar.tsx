"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "./RoleContext";
import { RoleSwitcher } from "./RoleSwitcher";
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
  Database,
  LogOut,
  Menu,
  X,
  Sparkles,
  ShieldCheck,
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

  const navigationItems: NavGroup[] = [
    {
      group: "Operasional Patroli",
      items: [
        { href: "/", label: "Dashboard Patroli", icon: LayoutDashboard },
        {
          href: "/findings/new",
          label: "Catat Temuan Baru",
          icon: PlusCircle,
          highlight: true,
          badge: currentUser.role === "CMD" || currentUser.role === "ADMIN" ? "Inspector" : undefined,
        },
        { href: "/findings", label: "Semua Temuan", icon: ClipboardList },
        {
          href: "/pic/tasks",
          label: currentUser.role === "PIC" ? "Tugas Saya (PIC)" : currentUser.role === "SM" ? "Tugas & Monitoring (SM)" : "Tugas Lapangan",
          icon: CheckSquare,
          badge: currentUser.role === "PIC" ? "PIC Proyek" : currentUser.role === "SM" ? "Site Manager" : undefined,
        },
      ],
    },
    {
      group: "Manajemen & Eksekutif",
      items: [
        { href: "/reports", label: "Laporan & Ekspor PDF", icon: FileText },
        { href: "/projects", label: "Proyek & Tim PIC", icon: Building2 },
        {
          href: "/admin",
          label: "Admin & Matriks Hak Akses",
          icon: Sliders,
          badge: currentUser.role === "ADMIN" ? "SuperAdmin" : "Admin Only",
          allowedRoles: ["ADMIN"],
        },
      ],
    },
    {
      group: "Informasi & Standar",
      items: [{ href: "/landing", label: "Portal Publik", icon: Sparkles }],
    },
  ];

  return (
    <>
      {/* Mobile Top App Bar with Hamburger Toggle */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-950/95 text-white border-b border-slate-800/80 backdrop-blur-md shadow-lg">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="p-2 bg-yellow-500 text-slate-950 rounded-xl shadow-sm">
            <HardHat size={20} strokeWidth={2.5} />
          </div>
          <div>
            <span className="font-black text-base tracking-tight block">
              SiteTracker <span className="text-yellow-500">CMD</span>
            </span>
            <span className="text-[10px] text-slate-400 block -mt-0.5">
              Patroli Lapangan
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <RoleSwitcher />
          <button
            onClick={() => setIsOpenMobile(!isOpenMobile)}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500"
            aria-label="Toggle Menu"
          >
            {isOpenMobile ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Backdrop for Mobile Drawer */}
      {isOpenMobile && (
        <div
          onClick={() => setIsOpenMobile(false)}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Desktop & Mobile Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-950 text-slate-200 border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-300 ease-out md:translate-x-0 overflow-y-auto shadow-2xl",
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80">
          <Link
            href="/"
            onClick={() => setIsOpenMobile(false)}
            className="flex items-center gap-3 group"
          >
            <div className="p-2.5 bg-yellow-500 text-slate-950 rounded-2xl shadow-lg shadow-yellow-500/20 group-hover:scale-105 transition-transform duration-200">
              <HardHat size={24} strokeWidth={2.5} />
            </div>
            <div>
              <span className="block font-black text-lg tracking-tight text-white group-hover:text-yellow-400 transition-colors">
                SiteTracker <span className="text-yellow-500">CMD</span>
              </span>
              <span className="block text-[11px] font-semibold text-slate-400">
                K3 & Mutu Konstruksi
              </span>
            </div>
          </Link>
        </div>

        {/* User Persona Active Card & Quick Switcher */}
        <div className="p-3.5 mx-3.5 my-2.5 rounded-2xl bg-slate-900/90 border border-slate-800/90 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <ShieldCheck size={12} className="text-yellow-500" /> Sesi Aktif
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
              {currentUser.role}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-800 text-yellow-400 flex items-center justify-center font-black text-xs border border-slate-700 shrink-0">
              {currentUser.name.charAt(0)}
            </div>
            <div className="truncate min-w-0">
              <p className="font-bold text-xs text-white truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-semibold">Ganti Peran:</span>
            <RoleSwitcher />
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 px-3.5 py-2 space-y-5">
          {navigationItems.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <p className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                {group.group}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  const isRoleRestricted = item.allowedRoles && !item.allowedRoles.includes(currentUser.role);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpenMobile(false)}
                      className={cn(
                        "flex items-center justify-between px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all group",
                        isActive
                          ? "bg-yellow-500 text-slate-950 shadow-md shadow-yellow-500/20 font-black"
                          : item.highlight
                          ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20"
                          : isRoleRestricted
                          ? "text-slate-500 hover:bg-slate-900/50 hover:text-slate-400 opacity-80"
                          : "text-slate-300 hover:bg-slate-900 hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          size={17}
                          className={cn(
                            isActive
                              ? "text-slate-950"
                              : item.highlight
                              ? "text-yellow-400"
                              : isRoleRestricted
                              ? "text-slate-600 group-hover:text-slate-500"
                              : "text-slate-400 group-hover:text-yellow-400"
                          )}
                        />
                        <span>{item.label}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={cn(
                            "px-1.5 py-0.5 text-[9px] font-black rounded-md",
                            isActive
                              ? "bg-slate-950 text-yellow-400"
                              : isRoleRestricted
                              ? "bg-slate-800 text-slate-500 border border-slate-700"
                              : "bg-purple-950/80 text-purple-300 border border-purple-800/80"
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

        {/* Footer Info & Safe Mode DB Status */}
        <div className="p-3.5 border-t border-slate-800/80 space-y-2.5 bg-slate-950/80">
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/80 rounded-xl border border-slate-800 text-[10px] font-bold text-emerald-400">
            <div className="flex items-center gap-1.5">
              <Database size={12} className="text-emerald-400" />
              <span>Simulasi DB Safe Mode</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <Link
            href="/login"
            onClick={() => setIsOpenMobile(false)}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-800 transition-all min-h-[40px]"
          >
            <LogOut size={13} />
            <span>Ganti Akun / Portal Login</span>
          </Link>

          <p className="text-[9px] text-center text-slate-500">
            © 2026 SiteTracker CMD (ISO 45001 & ISO 9001)
          </p>
        </div>
      </aside>
    </>
  );
}
