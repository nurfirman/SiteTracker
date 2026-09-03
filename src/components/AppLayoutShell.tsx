"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useRole } from "./RoleContext";
import { AlertTriangle, PhoneCall, ShieldAlert, UserCheck } from "lucide-react";

export function AppLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentUser } = useRole();

  // Standalone routes that do not need internal app layout
  const isStandalone = pathname === "/login" || pathname === "/landing";

  if (isStandalone) {
    return <div className="min-h-screen w-full bg-slate-950 text-slate-100">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 min-w-0 md:pl-72 flex flex-col min-h-screen">
        <Header />

        {/* Global Alert Banner untuk Akun yang Baru Terdaftar (Status: PENDING) */}
        {currentUser?.role === "PENDING" && (
          <div className="bg-amber-500/15 dark:bg-amber-950/50 border-b-2 border-amber-400 dark:border-amber-700/80 py-4 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
            <div className="max-w-7xl w-full mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-2xl shrink-0 mt-0.5 sm:mt-0">
                  <AlertTriangle size={22} className="animate-pulse" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-black text-amber-900 dark:text-amber-200">
                      Akun Baru Terdaftar — Menunggu Penugasan Role & Proyek
                    </h4>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-100 border border-amber-300 dark:border-amber-700">
                      Status: PENDING
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed max-w-3xl">
                    Halo <strong>{currentUser.name}</strong> ({currentUser.email}), akun Anda telah berhasil terdaftar di sistem. Saat ini Anda <strong>belum dapat mencatat temuan baru ataupun merespon tiket</strong> sampai Administrator selesai mengatur Role wewenang dan Proyek penugasan Anda.
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2 pt-1 sm:pt-0">
                <a
                  href={`https://wa.me/6281234567890?text=Halo%20Admin%20SiteTracker,%20saya%20sudah%20mendaftar%20dengan%20email%20${encodeURIComponent(
                    currentUser.email
                  )},%20mohon%20bantuannya%20untuk%20aktivasi%20role%20dan%20penugasan%20proyek%20saya.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                >
                  <PhoneCall size={14} />
                  <span>Hubungi Administrator</span>
                </a>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}

