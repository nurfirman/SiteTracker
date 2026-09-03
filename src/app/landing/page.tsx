"use client";

import React from "react";
import Link from "next/link";
import {
  HardHat,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ClipboardCheck,
  Clock,
  Eye,
  AlertTriangle,
  Building2,
  Users,
  BarChart3,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-violet-600 selection:text-white">
      {/* Top Banner Accent */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-4 py-2 text-center text-xs font-black text-white flex items-center justify-center gap-2">
        <Sparkles size={16} />
        <span>SITETRACKER CMD 2026 — Platform Digitalisasi Patroli K3 & Cacat Mutu Konstruksi Fisik</span>
        <span className="hidden sm:inline-block px-2 py-0.5 bg-slate-950 text-violet-300 rounded-full text-[10px]">ISO 45001 & ISO 9001 Compliant</span>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 border-b border-slate-800/80 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(139,92,246,0.15),rgba(255,255,255,0))]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 text-xs font-bold mb-8 backdrop-blur-md">
            <HardHat size={16} className="text-violet-400" />
            <span>Eliminasi Hazard K3 & Cacat Pekerjaan Lapangan 5x Lebih Cepat</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight max-w-5xl mx-auto leading-none">
            Patroli Lapangan Lebih Cepat. <br />
            <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-indigo-400 bg-clip-text text-transparent">
              Temuan K3 & Cacat Mutu Tuntas.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto font-normal leading-relaxed">
            Aplikasi manajemen patroli konstruksi yang mengintegrasikan pencatatan foto bukti oleh **Inspector CMD**, tindakan perbaikan oleh **PIC Subkontraktor**, dan verifikasi visual **Side-by-Side oleh Project Manager**.
          </p>

          {/* Action CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-black text-base rounded-2xl shadow-xl shadow-violet-500/25 hover:scale-105 transition-all duration-200"
            >
              <span>Buka Patrol Dashboard</span>
              <ArrowRight size={20} />
            </Link>
            <Link
              href="/findings/new"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-base rounded-2xl backdrop-blur-md transition-all duration-200"
            >
              <ClipboardCheck size={20} className="text-violet-400" />
              <span>Simulasi Catat Temuan Baru</span>
            </Link>
          </div>

          {/* Live Feature Highlights Pill */}
          <div className="mt-14 pt-8 border-t border-slate-800/80 flex flex-wrap justify-center gap-6 text-xs font-semibold text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>Side-by-Side Verification Modal</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>Client-Side Photo Compression</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>GPS Geolocation Tracking</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>Auto SLA & Due Date Alert</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Core Pillar Cards Section */}
      <section className="py-20 bg-slate-900/60 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-extrabold text-violet-400 tracking-widest uppercase">
              Kategori Temuan Lapangan
            </h2>
            <p className="mt-2 text-3xl font-black text-white sm:text-4xl">
              4 Pillar Utama Pengawasan Proyek Fisik
            </p>
            <p className="mt-3 text-slate-400 text-base">
              SiteTracker CMD dirancang untuk mengklasifikasikan setiap potensi risiko kerja secara akurat.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* K3 Safety */}
            <div className="bg-slate-900/90 border border-slate-800 hover:border-violet-500/50 p-6 rounded-3xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mb-5">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">K3 / Keselamatan</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Pelanggaran APD, bahaya ketinggian tanpa safety harness, kelistrikan terbuka, & potensi kecelakaan kerja.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold text-red-400 bg-red-950/60 px-3 py-1 rounded-lg">
                <Clock size={12} /> SLA Ketat: 24 Jam
              </div>
            </div>

            {/* Quality */}
            <div className="bg-slate-900/90 border border-slate-800 hover:border-violet-500/50 p-6 rounded-3xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mb-5">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Kualitas Pekerjaan</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Cacat plesteran, penyimpangan beton cor, posisi pembesian salah, & ketidaksesuaian spesifikasi teknik.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-400 bg-blue-950/60 px-3 py-1 rounded-lg">
                <Clock size={12} /> SLA Standar: 48 Jam
              </div>
            </div>

            {/* 5R Cleanliness */}
            <div className="bg-slate-900/90 border border-slate-800 hover:border-violet-500/50 p-6 rounded-3xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-5">
                <Sparkles size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Kebersihan 5R</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Puing sisa bekisting, tumpukan sampah material di saluran drainase, & kerapian area kerja patroli.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-lg">
                <Clock size={12} /> SLA Standar: 48 Jam
              </div>
            </div>

            {/* Schedule & Material */}
            <div className="bg-slate-900/90 border border-slate-800 hover:border-violet-500/50 p-6 rounded-3xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-5">
                <Zap size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Jadwal & Logistik</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Material korosi di tanah terbuka, keterlambatan alat berat, & kendala suplai bahan bangunan di Gate.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold text-purple-400 bg-purple-950/60 px-3 py-1 rounded-lg">
                <Clock size={12} /> SLA Standar: 48 Jam
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Visual Section */}
      <section className="py-20 bg-slate-950 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-extrabold text-violet-400 tracking-widest uppercase">
              Workflow 3-Langkah Simpel
            </h2>
            <p className="mt-2 text-3xl font-black text-white sm:text-4xl">
              Alur Kerja Terstruktur Tanpa Birokrasi Kertas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="relative bg-slate-900 p-8 rounded-3xl border border-slate-800">
              <div className="w-10 h-10 rounded-full bg-violet-600 text-white font-black text-lg flex items-center justify-center mb-6">
                1
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Pencatatan Lapangan (CMD)</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Inspector CMD melakukan patroli, mengambil foto bukti temuan, koordinat GPS, dan menugaskan PIC area.
              </p>
              <div className="mt-4 text-xs font-bold text-red-400 bg-red-950/40 p-3 rounded-xl border border-red-900/50">
                Status Tiket: <span className="underline font-black">OPEN 🔴</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative bg-slate-900 p-8 rounded-3xl border border-slate-800">
              <div className="w-10 h-10 rounded-full bg-violet-600 text-white font-black text-lg flex items-center justify-center mb-6">
                2
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Tindak Lanjut & Foto (PIC)</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Subkontraktor/PIC menerima tiket di portal tasks, memperbaiki masalah fisik, & mengunggah foto perbaikan.
              </p>
              <div className="mt-4 text-xs font-bold text-amber-400 bg-amber-950/40 p-3 rounded-xl border border-amber-900/50">
                Status Tiket: <span className="underline font-black">RESOLVED 🟡</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative bg-slate-900 p-8 rounded-3xl border border-slate-800">
              <div className="w-10 h-10 rounded-full bg-violet-600 text-white font-black text-lg flex items-center justify-center mb-6">
                3
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Verifikasi Side-by-Side (PM)</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Project Manager membandingkan foto Sebelum vs Sesudah secara langsung di Modal UI, lalu Approve atau Reject.
              </p>
              <div className="mt-4 text-xs font-bold text-emerald-400 bg-emerald-950/40 p-3 rounded-xl border border-emerald-900/50">
                Status Tiket: <span className="underline font-black">CLOSED 🟢</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Role Value Proposition */}
      <section className="py-20 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-extrabold text-violet-400 tracking-widest uppercase">
              Manfaat Spesifik Peran Pengguna
            </h2>
            <p className="mt-2 text-3xl font-black text-white sm:text-4xl">
              Dirancang untuk Seluruh Stakeholder Proyek
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 flex gap-5">
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-2xl h-fit shrink-0">
                <Users size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Petugas K3 / Inspector CMD</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Tidak perlu menulis laporan manual di kertas. Cukup foto dari HP, kompres otomatis, pilih lokasi & PIC, lalu kirim seketika.
                </p>
              </div>
            </div>

            <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 flex gap-5">
              <div className="p-4 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-2xl h-fit shrink-0">
                <Building2 size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Subkontraktor / PIC Lapangan</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Notifikasi jelas tentang lokasi persis dan bahaya yang harus diperbaiki. Langsung unggah foto sesudah perbaikan tanpa debat.
                </p>
              </div>
            </div>

            <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 flex gap-5">
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl h-fit shrink-0">
                <Eye size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Project Manager (PM)</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Hemat waktu inspeksi fisik berulang. Validasi foto Sebelum vs Sesudah secara Side-by-Side dengan 1-klik Approve / Reject.
                </p>
              </div>
            </div>

            <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 flex gap-5">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl h-fit shrink-0">
                <BarChart3 size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Board of Directors (BOD)</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Pantau statistik kepatuhan K3, kecepatan resolusi perbaikan, dan kesehatan seluruh portofolio proyek dalam 1 dashboard eksekutif.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="py-20 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <HardHat size={48} className="mx-auto mb-4" />
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
            Siap Tingkatkan Kepatuhan K3 & Mutu Proyek Anda?
          </h2>
          <p className="mt-4 text-base sm:text-lg font-semibold text-purple-100 max-w-2xl mx-auto">
            Gunakan SiteTracker CMD hari ini untuk pemantauan patroli fisik yang transparan, akuntabel, dan real-time.
          </p>
          <div className="mt-8 flex justify-center gap-4 flex-wrap">
            <Link
              href="/"
              className="px-8 py-4 bg-white text-slate-950 font-black rounded-2xl shadow-2xl hover:scale-105 transition-transform"
            >
              Masuk ke Aplikasi Dashboard
            </Link>
            <Link
              href="/reports"
              className="px-8 py-4 bg-purple-900/60 hover:bg-purple-900 text-white font-bold rounded-2xl shadow-xl transition-all border border-purple-400/30"
            >
              Cetak Laporan Contoh (PDF)
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-950 text-center text-xs text-slate-500 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 SiteTracker CMD — Construction Patrol & Finding Tracker. Developed with Next.js 14, TailwindCSS & Neon PostgreSQL.</p>
        </div>
      </footer>
    </div>
  );
}
