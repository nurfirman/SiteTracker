"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RoleSwitcher } from "./RoleSwitcher";
import { useRole } from "./RoleContext";
import {
  HardHat,
  PlusCircle,
  CheckSquare,
  LayoutDashboard,
  ClipboardList,
  Building2,
  Sparkles,
  FileText,
  Database,
} from "lucide-react";
import { cn } from "../lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const { currentUser } = useRole();

  const navItems = [
    { href: "/landing", label: "Landing", icon: Sparkles },
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/findings/new", label: "Input Temuan", icon: PlusCircle, highlight: true },
    {
      href: "/pic/tasks",
      label: "Tugas Saya",
      icon: CheckSquare,
      badgeRole: "PIC",
    },
    { href: "/findings", label: "Temuan", icon: ClipboardList },
    { href: "/reports", label: "Laporan PDF", icon: FileText },
    { href: "/projects", label: "Proyek", icon: Building2 },
  ];

  return (
    <>
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo Brand */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="p-2.5 bg-yellow-500 text-slate-950 rounded-2xl shadow-md group-hover:scale-105 transition-transform duration-200">
                <HardHat size={28} strokeWidth={2.5} />
              </div>
              <div>
                <span className="block font-black text-xl tracking-tight text-slate-900 dark:text-white group-hover:text-yellow-600 transition-colors">
                  SiteTracker <span className="text-yellow-600">CMD</span>
                </span>
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Patroli & Pelacakan Temuan Lapangan
                </span>
              </div>
            </Link>

            {/* Desktop Nav Links */}
            <nav className="hidden md:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-bold transition-all",
                      isActive
                        ? "bg-slate-900 text-white shadow-md dark:bg-yellow-500 dark:text-slate-950"
                        : "text-slate-700 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-700/60"
                    )}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Role Switcher Widget & DB Status Indicator */}
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                <Database size={13} className="text-emerald-500 animate-pulse" />
                <span>Simulasi DB Safe Mode</span>
              </div>
              <RoleSwitcher />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Ramah Layar HP Lapangan) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 md:hidden px-2 py-1 shadow-2xl">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center p-2 min-h-[52px] min-w-[56px] rounded-2xl transition-all text-[11px] font-bold gap-1",
                  item.highlight
                    ? "text-yellow-600 dark:text-yellow-400 font-extrabold"
                    : isActive
                    ? "text-slate-900 dark:text-white font-extrabold"
                    : "text-slate-500 dark:text-slate-400"
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-xl transition-all",
                    item.highlight
                      ? "bg-yellow-500 text-slate-950 shadow-md"
                      : isActive
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                      : ""
                  )}
                >
                  <Icon size={20} />
                </div>
                <span className="truncate max-w-[64px] text-center">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
