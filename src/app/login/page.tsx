"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Role, ROLE_LABELS } from "@/types";
import { getUsers, loginUser, getCurrentUserSession } from "@/lib/actions";
import { useRole } from "@/components/RoleContext";
import {
  HardHat,
  ShieldCheck,
  Building2,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Lock,
  UserCheck,
  Eye,
  KeyRound,
  ShieldAlert,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { setCurrentUser } = useRole();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const uList = await getUsers();
        setUsers(uList);
      } catch (e) {
        console.error("Gagal memuat pengguna:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSelectPersona = async (user: User) => {
    setSubmittingId(user.id);
    setMessage(null);
    try {
      const res = await loginUser(user.id);
      if (res.success) {
        setCurrentUser(user);
        router.push("/");
        router.refresh();
      } else {
        setMessage(res.message || "Gagal masuk sesi.");
      }
    } catch (err: any) {
      setMessage(err.message || "Terjadi kesalahan saat login.");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-yellow-500 selection:text-slate-950">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3.5 bg-yellow-500 text-slate-950 rounded-3xl shadow-xl shadow-yellow-500/20 mb-2">
          <HardHat size={36} strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
          Portal Masuk <span className="text-yellow-500">SiteTracker CMD</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
          Pilih Persona Akun Demo di bawah ini untuk mengakses dashboard dengan hak akses & alur kerja terautentikasi (Server Session).
        </p>

        {message && (
          <div className="p-4 bg-red-950/60 border border-red-800 text-red-300 text-xs font-bold rounded-2xl">
            {message}
          </div>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-3xl">
        <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <span className="text-xs font-black uppercase tracking-wider text-yellow-500 flex items-center gap-2">
              <KeyRound size={16} /> Persona Akun Terdaftar
            </span>
            <span className="text-[11px] font-bold text-slate-400">
              Multi-Role Security Enabled
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 font-bold">Memuat daftar akun...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {users.map((user) => {
                const roleConfig = ROLE_LABELS[user.role];
                const isSubmitting = submittingId === user.id;

                return (
                  <button
                    key={user.id}
                    onClick={() => handleSelectPersona(user)}
                    disabled={Boolean(submittingId)}
                    className="text-left p-5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-yellow-500/70 hover:bg-slate-800/60 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold border ${roleConfig.badgeClass}`}>
                          {user.role}
                        </span>
                        <span className="text-[11px] text-slate-500 group-hover:text-yellow-400 transition-colors flex items-center gap-1 font-bold">
                          {isSubmitting ? "Masuk..." : "Masuk"} <ArrowRight size={13} />
                        </span>
                      </div>

                      <h3 className="text-base font-black text-white group-hover:text-yellow-400 transition-colors">
                        {user.name}
                      </h3>

                      <p className="text-xs text-slate-400 font-medium leading-relaxed line-clamp-2">
                        {roleConfig.description}
                      </p>

                      {user.project && (
                        <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 pt-1">
                          <Building2 size={12} className="text-slate-400" /> {user.project.name}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{user.email}</span>
                      <span className="font-mono text-slate-400">{user.phoneNumber}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-500 space-y-1">
            <p>🔒 Autentikasi menggunakan HTTP-Only Cookie Session yang terverifikasi di Next.js Server Actions.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
