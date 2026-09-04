"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Role, ROLE_LABELS, Project } from "@/types";
import { getUsers, loginUser, registerUser, getProjects, requestPasswordReset, resetPasswordWithOtp } from "@/lib/actions";
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
  ShieldCheck,
  CheckCircle2,
  Info,
  Sliders,
  UserCheck,
  ClipboardList,
  UserPlus,
  Database,
  Sparkles,
  Phone,
  RotateCcw,
  Send,
  Check,
  HelpCircle,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { setCurrentUser } = useRole();
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab State: LOGIN vs REGISTER vs RESET_PASSWORD
  const [authMode, setAuthMode] = useState<"LOGIN" | "REGISTER" | "RESET_PASSWORD">("LOGIN");

  // Login Form State
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Registration Form State
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regRole, setRegRole] = useState<Role>("PIC");
  const [regProjectId, setRegProjectId] = useState("");

  // Reset Password Form State
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [uList, pList] = await Promise.all([getUsers(), getProjects()]);
        setUsers(uList);
        setProjects(pList);
        if (pList.length > 0) {
          setRegProjectId(pList[0].id);
        }
        if (uList.length > 0) {
          // Default to Admin for presentation demo
          const adminUser = uList.find((u) => u.role === "ADMIN") || uList[0];
          setEmailInput(adminUser.email);
          setPasswordInput(adminUser.password || "admin");
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
    setSuccessMessage(null);

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!regName.trim() || regName.trim().length < 2) {
      setErrorMessage("Nama lengkap minimal 2 karakter.");
      return;
    }
    if (!regEmail.trim() || !regEmail.includes("@")) {
      setErrorMessage("Alamat email tidak valid.");
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setErrorMessage("Password minimal 6 karakter.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMessage("Konfirmasi password tidak cocok.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await registerUser({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        phoneNumber: regPhone.trim() || "0812-3456-7890",
        role: "PENDING",
        projectId: undefined,
      });

      if (res.success && res.user) {
        setSuccessMessage(res.message);
        setCurrentUser(res.user);
        // Reset form
        setRegName("");
        setRegEmail("");
        setRegPassword("");
        setRegConfirmPassword("");
        setRegPhone("");

        // Redirect ke dashboard setelah registrasi berhasil
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 1200);
      } else {
        setErrorMessage(res.message || "Gagal melakukan pendaftaran akun.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat registrasi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setDevOtpHint(null);

    if (!resetEmail.trim() || !resetEmail.includes("@")) {
      setErrorMessage("Mohon masukkan alamat email yang valid.");
      return;
    }

    setResetSubmitting(true);
    try {
      const res = await requestPasswordReset(resetEmail.trim());
      if (res.success) {
        setSuccessMessage(res.message);
        if (res.devOtp) {
          setDevOtpHint(res.devOtp);
          setResetOtp(res.devOtp);
        }
        setResetStep(2);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat meminta reset password.");
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!resetOtp.trim() || resetOtp.trim().length < 6) {
      setErrorMessage("Mohon masukkan 6 digit kode verifikasi OTP.");
      return;
    }
    if (!resetNewPassword || resetNewPassword.length < 6) {
      setErrorMessage("Password baru minimal 6 karakter.");
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setErrorMessage("Konfirmasi password baru tidak cocok.");
      return;
    }

    setResetSubmitting(true);
    try {
      const res = await resetPasswordWithOtp({
        email: resetEmail.trim(),
        otp: resetOtp.trim(),
        newPassword: resetNewPassword,
      });

      if (res.success) {
        setSuccessMessage(res.message);
        // Perbarui password pengguna di state list lokal
        setUsers((prev) =>
          prev.map((u) =>
            u.email.toLowerCase() === resetEmail.toLowerCase().trim()
              ? { ...u, password: resetNewPassword }
              : u
          )
        );

        // Isi form login dengan kredensial baru
        setEmailInput(resetEmail.trim());
        setPasswordInput(resetNewPassword);

        // Alihkan ke tampilan login setelah 1.5 detik
        setTimeout(() => {
          setAuthMode("LOGIN");
          setResetStep(1);
          setResetOtp("");
          setResetNewPassword("");
          setResetConfirmPassword("");
          setDevOtpHint(null);
        }, 1500);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat mereset password.");
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleQuickPersonaSelect = async (user: User) => {
    setAuthMode("LOGIN");
    const pwd = user.password || (user.role === "ADMIN" ? "admin" : "123");
    setEmailInput(user.email);
    setPasswordInput(pwd);
    setErrorMessage(null);
    setSuccessMessage(null);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-12 font-sans selection:bg-violet-600 selection:text-white">
      {/* Brand Header */}
      <div className="w-full max-w-5xl mx-auto text-center space-y-3 pt-4">
        <div className="inline-flex items-center justify-center p-3.5 bg-violet-600 text-white rounded-2xl shadow-xl shadow-violet-500/25">
          <HardHat size={32} strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
          SiteTracker <span className="text-violet-400">CMD</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
          Sistem Pengawasan Keselamatan K3 (ISO 45001) & Pelacakan Temuan Kualitas Mutu Fisik Konstruksi
        </p>
      </div>

      {/* Main Content Grid: Login / Register Form & Persona Quick Select */}
      <div className="w-full max-w-5xl mx-auto my-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Direct Login / Register Card */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-2xl space-y-5">
          {/* Mode Switcher Tabs: Masuk vs Daftar vs Reset Password */}
          <div className="grid grid-cols-3 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setAuthMode("LOGIN");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all ${
                authMode === "LOGIN"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-500/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Lock size={13} />
              <span>Masuk</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode("REGISTER");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all ${
                authMode === "REGISTER"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-500/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <UserPlus size={13} />
              <span>Daftar Akun</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode("RESET_PASSWORD");
                setResetEmail(emailInput || "");
                setResetStep(1);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all ${
                authMode === "RESET_PASSWORD"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-500/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <KeyRound size={13} />
              <span>Reset Pwd</span>
            </button>
          </div>

          {/* Neon Auth Badge Info */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-violet-950/40 border border-violet-800/60 rounded-xl text-[11px]">
            <span className="text-violet-300 font-bold flex items-center gap-1.5">
              <Database size={13} className="text-violet-400" /> Fasilitas Neon Auth
            </span>
            <span className="text-emerald-400 font-extrabold flex items-center gap-1">
              <ShieldCheck size={12} /> Serverless Postgres
            </span>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-red-950/80 border border-red-800 text-red-300 text-xs font-bold rounded-2xl flex items-center gap-2.5 animate-in fade-in duration-200">
              <AlertCircle size={18} className="shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-bold rounded-2xl flex items-center gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* VIEW 1: FORM LOGIN */}
          {authMode === "LOGIN" && (
            <form onSubmit={handleManualLogin} className="space-y-4 animate-in fade-in duration-200">
              {/* Username / Email Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Email / Username Akun <span className="text-violet-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="admin@sitetracker.id atau nama@sitetracker.id"
                    required
                    className="w-full pl-12 pr-4 py-3.5 min-h-[48px] text-sm rounded-2xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
              </div>

              {/* Password Input with Toggle */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-300">
                    Password <span className="text-violet-400">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400 font-semibold hidden sm:inline">
                      Demo: <code className="text-violet-400 font-mono">admin</code> / <code className="text-violet-400 font-mono">123</code>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("RESET_PASSWORD");
                        setResetEmail(emailInput);
                        setResetStep(1);
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[11px] text-violet-400 hover:text-violet-300 font-bold hover:underline transition-colors flex items-center gap-1"
                    >
                      <KeyRound size={12} />
                      <span>Lupa Password?</span>
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Masukkan password akun"
                    required
                    className="w-full pl-12 pr-12 py-3.5 min-h-[48px] text-sm rounded-2xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-violet-500 transition-colors"
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
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 min-h-[50px] bg-violet-600 hover:bg-violet-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-violet-500/25 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <span>{submitting ? "Memverifikasi..." : "Masuk ke Dashboard"}</span>
                <ArrowRight size={18} />
              </button>
            </form>
          )}

          {/* VIEW 2: FORM REGISTER DENGAN NEON AUTH */}
          {authMode === "REGISTER" && (
            <form onSubmit={handleRegister} className="space-y-3.5 animate-in fade-in duration-200">
              {/* Nama Lengkap */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300">
                  Nama Lengkap <span className="text-violet-400">*</span>
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Contoh: Ir. Rahmat Hidayat"
                  required
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Email Akun */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300">
                  Email Akun <span className="text-violet-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="nama@perusahaan.co.id"
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {/* No WhatsApp */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300">
                  No. WhatsApp / HP Aktif <span className="text-violet-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="0812-3456-7890"
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Status Role & Proyek Notice */}
              <div className="p-3 bg-violet-950/30 border border-violet-800/50 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-violet-300">
                  <ShieldCheck size={14} className="text-violet-400" />
                  <span>Penetapan Peran (Role) & Penugasan Proyek</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Akun Anda akan didaftarkan dengan status awal <strong>Menunggu Persetujuan (PENDING)</strong>. Administrator akan menghubungkan akun Anda ke peran (PIC/CMD/SM/PM) dan proyek kerja setelah pendaftaran.
                </p>
              </div>

              {/* Password & Confirm Password Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-300">
                    Password <span className="text-violet-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min. 6 karakter"
                    required
                    minLength={6}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-300">
                    Konfirmasi Password <span className="text-violet-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang password"
                    required
                    minLength={6}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Submit Register Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 min-h-[48px] bg-violet-600 hover:bg-violet-500 text-white font-black text-sm rounded-xl shadow-xl shadow-violet-500/25 active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
              >
                <UserPlus size={18} />
                <span>{submitting ? "Mendaftarkan ke Neon Auth..." : "Daftar Akun Sekarang"}</span>
              </button>
            </form>
          )}

          {/* VIEW 3: FORM RESET PASSWORD DENGAN AZURE GRAPH & OTP */}
          {authMode === "RESET_PASSWORD" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <h2 className="text-sm font-black text-white flex items-center gap-1.5">
                    <KeyRound size={16} className="text-violet-400" />
                    <span>Reset Kata Sandi Akun</span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {resetStep === 1
                      ? "Langkah 1/2: Masukkan email untuk menerima kode OTP"
                      : "Langkah 2/2: Masukkan kode OTP dan buat kata sandi baru"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("LOGIN");
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white font-bold transition-colors"
                >
                  Batal
                </button>
              </div>

              {/* Dev/Demo OTP Highlight Badge */}
              {devOtpHint && resetStep === 2 && (
                <div className="p-3 bg-violet-950/60 border border-violet-700/70 rounded-2xl flex items-center justify-between text-xs animate-in zoom-in-95">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-400 shrink-0" />
                    <div>
                      <p className="text-[11px] text-violet-300 font-semibold">Mode Uji Coba / Demo:</p>
                      <p className="text-xs text-white">
                        Kode OTP:{" "}
                        <span className="font-mono font-black text-amber-300 tracking-widest bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                          {devOtpHint}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResetOtp(devOtpHint)}
                    className="px-2.5 py-1 bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-bold rounded-lg transition-colors shadow-sm"
                  >
                    Isi Otomatis
                  </button>
                </div>
              )}

              {/* STEP 1: Input Email */}
              {resetStep === 1 && (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">
                      Alamat Email Terdaftar <span className="text-violet-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="nama@perusahaan.co.id atau admin@sitetracker.id"
                        required
                        className="w-full pl-12 pr-4 py-3.5 min-h-[48px] text-sm rounded-2xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-violet-500 transition-colors"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Sistem akan mengirimkan 6 digit kode verifikasi (OTP) ke alamat email Anda.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={resetSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 min-h-[50px] bg-violet-600 hover:bg-violet-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-violet-500/25 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    <Send size={16} />
                    <span>{resetSubmitting ? "Mengirim Kode..." : "Kirim Kode Verifikasi (OTP)"}</span>
                  </button>
                </form>
              )}

              {/* STEP 2: Input OTP & New Password */}
              {resetStep === 2 && (
                <form onSubmit={handleResetPassword} className="space-y-3.5">
                  <div className="flex items-center justify-between p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs">
                    <span className="text-slate-400">
                      Terkirim ke: <strong className="text-white">{resetEmail}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setResetStep(1);
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-violet-400 hover:text-violet-300 font-bold text-[11px] underline"
                    >
                      Ubah Email
                    </button>
                  </div>

                  {/* 6 Digit OTP Input */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-300">
                      Kode Verifikasi (OTP 6-Digit) <span className="text-violet-400">*</span>
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        maxLength={6}
                        value={resetOtp}
                        onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="123456"
                        required
                        className="w-full pl-10 pr-4 py-2.5 text-center font-mono font-black text-lg tracking-[8px] rounded-xl border border-slate-700 bg-slate-950 text-amber-300 focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>

                  {/* Password Baru & Konfirmasi */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-300">
                        Password Baru <span className="text-violet-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showResetPassword ? "text" : "password"}
                          value={resetNewPassword}
                          onChange={(e) => setResetNewPassword(e.target.value)}
                          placeholder="Min. 6 karakter"
                          required
                          minLength={6}
                          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-violet-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-300">
                        Konfirmasi Password <span className="text-violet-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showResetPassword ? "text" : "password"}
                          value={resetConfirmPassword}
                          onChange={(e) => setResetConfirmPassword(e.target.value)}
                          placeholder="Ulangi password"
                          required
                          minLength={6}
                          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-700 bg-slate-950 text-white focus:outline-none focus:border-violet-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      {showResetPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                      <span>{showResetPassword ? "Sembunyikan Password" : "Lihat Password"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      disabled={resetSubmitting}
                      className="text-[11px] text-violet-400 hover:text-violet-300 font-bold flex items-center gap-1"
                    >
                      <RotateCcw size={12} />
                      <span>Kirim Ulang OTP</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={resetSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 min-h-[48px] bg-violet-600 hover:bg-violet-500 text-white font-black text-sm rounded-xl shadow-xl shadow-violet-500/25 active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
                  >
                    <Check size={16} />
                    <span>{resetSubmitting ? "Menyimpan Kata Sandi..." : "Simpan Kata Sandi Baru"}</span>
                  </button>
                </form>
              )}

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("LOGIN");
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white font-bold transition-colors"
                >
                  ← Kembali ke Halaman Login
                </button>
              </div>
            </div>
          )}

          {/* Security footnote */}
          <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 flex items-start gap-2.5 text-[11px] text-slate-400">
            <Info size={16} className="text-violet-400 shrink-0 mt-0.5" />
            <p>
              Akun baru langsung tersinkronisasi ke database Neon PostgreSQL dan mendapatkan hak akses sesuai peran yang didaftarkan.
            </p>
          </div>
        </div>

        {/* Right Column: 1-Click Persona Simulator for Presentation */}
        <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800/80 p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <span className="text-xs font-black uppercase text-slate-300 flex items-center gap-1.5">
              <KeyRound size={15} className="text-violet-400" /> Pilihan Simulasi User (Untuk Presentasi)
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">{users.length} Akun Terdaftar</span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Klik salah satu profil di bawah untuk langsung mencoba tampilan antarmuka dan wewenang tiap peran:
          </p>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">Memuat profil persona...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
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
                        ? "bg-slate-800 border-violet-500/80 shadow-lg ring-1 ring-violet-500/50"
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
                      <p className="font-bold text-xs text-white group-hover:text-violet-400 transition-colors truncate">
                        {u.name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                    </div>

                    {u.project ? (
                      <p className="text-[10px] text-purple-300 font-semibold flex items-center gap-1 pt-2 truncate border-t border-slate-800/60 mt-2">
                        <Building2 size={11} className="shrink-0 text-purple-400" />
                        <span className="truncate">{u.project.name}</span>
                      </p>
                    ) : u.role === "ADMIN" ? (
                      <p className="text-[10px] text-rose-300 font-semibold flex items-center gap-1 pt-2 truncate border-t border-slate-800/60 mt-2">
                        <Sliders size={11} className="shrink-0 text-rose-400" />
                        <span>Master Proyek, PIC & Kategori</span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 pt-2 truncate border-t border-slate-800/60 mt-2">
                        <ClipboardList size={11} className="shrink-0 text-violet-400" />
                        <span>Akses Seluruh Proyek</span>
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
        <p className="text-[10px] text-slate-600">Standar ISO 45001 (K3) & ISO 9001 (Manajemen Mutu)</p>
      </div>
    </div>
  );
}
