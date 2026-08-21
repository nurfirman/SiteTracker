"use client";

import React, { useState } from "react";
import { useRole } from "./RoleContext";
import { ROLE_LABELS, Role } from "../types";
import { UserCheck, ChevronDown, Check } from "lucide-react";
import { cn } from "../lib/utils";

export function RoleSwitcher() {
  const { currentUser, setCurrentUser, availableUsers } = useRole();
  const [isOpen, setIsOpen] = useState(false);

  const roleInfo = ROLE_LABELS[currentUser.role];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-xl border text-xs font-bold transition-all shadow-xs active:scale-95",
          roleInfo.badgeClass
        )}
      >
        <UserCheck size={16} />
        <div className="flex flex-col items-start text-left leading-tight">
          <span className="text-[10px] uppercase font-semibold opacity-75">Simulasi Mode:</span>
          <span className="font-extrabold text-xs truncate max-w-[130px] sm:max-w-none">
            {currentUser.name} ({currentUser.role})
          </span>
        </div>
        <ChevronDown size={14} className={cn("transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
            <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider block">
              Pilih Role / Pengguna Simulasi
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
              Ganti role untuk menguji seluruh alur kerja aplikasi
            </span>
          </div>

          <div className="space-y-1">
            {availableUsers.map((user) => {
              const label = ROLE_LABELS[user.role];
              const isSelected = user.id === currentUser.id;

              return (
                <button
                  key={user.id}
                  onClick={() => {
                    setCurrentUser(user);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all",
                    isSelected
                      ? "bg-slate-900 text-white font-bold dark:bg-slate-800"
                      : "hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60"
                  )}
                >
                  <div className="flex flex-col">
                    <span className="font-bold">{user.name}</span>
                    <span className="text-[10px] opacity-80">{label.label}</span>
                  </div>
                  {isSelected && <Check size={16} className="text-emerald-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
