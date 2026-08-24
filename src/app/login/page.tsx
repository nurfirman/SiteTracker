"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Role, ROLE_LABELS } from "@/types";
import { getUsers, loginUser } from "@/lib/actions";
import { useRole } from "@/components/RoleContext";
import {
  HardHat,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  Building2,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Info,
  Layers,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { setCurrentUser } = useRole();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const uList = await getUsers();
        setUsers(uList);
        if (uList.length > 0) {
          setEmailInput(uList[0].email);
          setPasswordInput(uList[0].password || "admin");
        }
      } catch (e) {
        console.error("Gagal memuat pengguna:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!emailInput.trim()) {
      setErrorMessage("Mohon masukkan email atau username akun.");
      return;
    }
    if (!passwordInput.trim()) {
      setErrorMessage("Mohon masukkan password akun.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await loginUser(emailInput.trim(), passwordInput.trim());
      if (res.success && res.session) {
        const targetUser = users.find((u) => u.id === res.session!.userId) || users[0];
        setCurrentUser(targetUser);
        router.push("/");
        router.refresh();
      } else {
        setErrorMessage(res.message || "Email atau password salah.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat verifikasi login.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickPersonaSelect = async (user: User) => {
    const pwd = user.password || (user.role === "ADMIN" ? "admin" : "123");
    setEmailInput(user.email);
    setPasswordInput(pwd);
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const res = await loginUser(user.id, pwd);
      if (res.success) {
        setCurrentUser(user);
        router.push("/");
        router.refresh();
      } else {
        setErrorMessage(res.message || "Gagal masuk sesi.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat login.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-12 font-sans selection:bg-yellow-500 selection:text-slate-950">
      {/* Brand Header */}
      <div className="w-full max-w-5xl mx-auto text-center space-y-3 pt-4">
        <div className="inline-flex items-center justify-center p-3 bg-yellow-500 text-slate-950 rounded-2xl shadow-xl shadow-yellow-500/20">
          <HardHat size={32} strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
          SiteTracker <span className="text-yellow-500">CMD</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
          Platform Terpadu Pengawasan K3 (ISO 45001) & Pelacakan Temuan Kualitas Fisik Proyek Konstruksi
        </p>
      </div>

      {/* Main Content Grid: Login Form & Persona Quick Select */}
      <div className="w-full max-w-5xl mx-auto my-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Direct Login Card */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <span className="text-xs font-black uppercase tracking-wider text-yellow-500 flex items-center gap-2">
              <Lock size={15} /> Masuk Akun Pengguna
            </span>
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
              <ShieldCheck size={13} /> HMAC Encrypted
            </span>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-red-950/80 border border-red-800 text-red-300 text-xs font-bold rounded-2xl flex items-center gap-2.5 animate-in fade-in duration-200">
              <AlertCircle size={18} className="shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleManualLogin} className="space-y-4">
            {/* Username / Email Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Email / Username Akun <span className="text-yellow-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="admin@sitetracker.id atau nama@sitetracker.id"
                  required
                  className="w-full pl-12 pr-4 py-3.5 min-h-[48px] text-sm rounded-2xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                />
              </div>
            </div>

            {/* Password Input with Toggle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-300">
                  Password <span className="text-yellow-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400 font-semibold">
                  Demo: <code className="text-yellow-400 font-mono">admin</code> / <code className="text-yellow-400 font-mono">123</code>
                </span>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Masukkan password akun"
                  required
                  className="w-full pl-12 pr-12 py-3.5 min-h-[48px] text-sm rounded-2xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-300 min-h-[24px] min-w-[24px]"
                  aria-label="Toggle Password Visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 min-h-[50px] bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-yellow-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <span>{submitting ? "Memverifikasi Kredensial..." : "Masuk ke Dashboard"}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Security footnote */}
          <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 flex items-start gap-2.5 text-[11px] text-slate-400">
            <Info size={16} className="text-yellow-500 shrink-0 mt-0.5" />
            <p>
              Sesi terenkripsi secara aman. Akses fitur secara otomatis disesuaikan dengan matriks wewenang peran (RBAC) pengguna.
            </p>
          </div>
        </div>

        {/* Right Column: 1-Click Quick Fill & Persona Demo */}
        <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800/80 p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <span className="text-xs font-black uppercase text-slate-300 flex items-center gap-1.5">
              <KeyRound size={15} className="text-yellow-500" /> Pilih Cepat Akun Demo (1-Click)
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">5 Peran Teruji</span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Pilih salah satu profil untuk menguji tampilan dan fitur khusus tiap peran di lapangan:
          </p>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">Memuat profil persona...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {users.map((u) => {
                const roleConfig = ROLE_LABELS[u.role] || { label: u.role, badgeClass: "bg-slate-800 text-slate-300" };
                const isSelected = emailInput === u.email;

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleQuickPersonaSelect(u)}
                    className={`text-left p-3.5 rounded-2xl border transition-all flex flex-col justify-between group ${
                      isSelected
                        ? "bg-slate-800 border-yellow-500/80 shadow-lg ring-1 ring-yellow-500/50"
                        : "bg-slate-950/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${roleConfig.badgeClass}`}>
                        {u.role}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        pwd: {u.password || (u.role === "ADMIN" ? "admin" : "123")}
                      </span>
                    </div>

                    <div>
                      <p className="font-bold text-xs text-white group-hover:text-yellow-400 transition-colors truncate">
                        {u.name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                    </div>

                    {u.project && (
                      <p className="text-[10px] text-purple-300 font-semibold flex items-center gap-1 pt-2 truncate border-t border-slate-800/60 mt-2">
                        <Building2 size={11} className="shrink-0 text-purple-400" />
                        <span className="truncate">{u.project.name}</span>
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer System Info */}
      <div className="w-full max-w-5xl mx-auto text-center py-4 border-t border-slate-800/60 text-[11px] text-slate-500 space-y-1">
        <p>SiteTracker CMD © 2026 — Sistem Digitalisasi Kepatuhan & Mutu Konstruksi</p>
        <p className="text-[10px] text-slate-600">Terstandarisasi ISO 45001 (K3) & ISO 9001 (Manajemen Mutu)</p>
      </div>
    </div>
  );
}
