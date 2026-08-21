"use client";

import React, { useState, useEffect } from "react";
import { Project, User, Finding } from "@/types";
import { getProjects, getUsers, getFindings } from "@/lib/actions";
import { ROLE_LABELS } from "@/types";
import { Building2, MapPin, Users, HardHat, CheckCircle2, AlertCircle } from "lucide-react";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [pList, uList, fList] = await Promise.all([
          getProjects(),
          getUsers(),
          getFindings(),
        ]);
        setProjects(pList);
        setUsers(uList);
        setFindings(fList);
      } catch (e) {
        console.error("Gagal memuat data proyek:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200 text-xs font-bold rounded-lg">
          <Building2 size={14} /> Manajemen Proyek Konstruksi
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
          Daftar Proyek & Penanggung Jawab
        </h1>
        <p className="text-sm text-slate-500">
          Ringkasan seluruh lokasi proyek aktif beserta tim inspector CMD, PIC Subkontraktor, dan PM.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500 font-semibold">
          Memuat data proyek...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project) => {
            const projectUsers = users.filter((u) => u.projectId === project.id);
            const projectFindings = findings.filter((f) => f.projectId === project.id);
            const openCount = projectFindings.filter((f) => f.status === "OPEN").length;
            const resolvedCount = projectFindings.filter((f) => f.status === "RESOLVED").length;
            const closedCount = projectFindings.filter((f) => f.status === "CLOSED").length;

            return (
              <div
                key={project.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-lg transition-all space-y-6 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h2 className="text-xl font-black text-slate-900 dark:text-white">
                        {project.name}
                      </h2>
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <MapPin size={16} className="text-red-500 shrink-0" />
                        <span>{project.location}</span>
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-950 text-purple-600 rounded-2xl shrink-0">
                      <Building2 size={24} />
                    </div>
                  </div>

                  {/* Finding Stats Badge Grid */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-center text-xs font-bold">
                    <div className="p-2 bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-800">
                      <span className="block text-lg font-black">{openCount}</span>
                      <span>🔴 Open</span>
                    </div>
                    <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-xl border border-amber-200 dark:border-amber-800">
                      <span className="block text-lg font-black">{resolvedCount}</span>
                      <span>🟡 Resolved</span>
                    </div>
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <span className="block text-lg font-black">{closedCount}</span>
                      <span>🟢 Closed</span>
                    </div>
                  </div>

                  {/* Team Members List */}
                  <div className="space-y-2">
                    <span className="text-xs font-black uppercase text-slate-400 block tracking-wider flex items-center gap-1.5">
                      <Users size={14} /> Tim Penanggung Jawab Area
                    </span>
                    <div className="space-y-1.5">
                      {projectUsers.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">
                          Belum ada PIC terdaftar spesifik untuk lokasi ini.
                        </p>
                      ) : (
                        projectUsers.map((u) => {
                          const roleInfo = ROLE_LABELS[u.role];
                          return (
                            <div
                              key={u.id}
                              className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs"
                            >
                              <div>
                                <span className="font-bold block text-slate-900 dark:text-white">
                                  {u.name}
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  📞 {u.phoneNumber}
                                </span>
                              </div>
                              <span
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border ${roleInfo.badgeClass}`}
                              >
                                {u.role}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
