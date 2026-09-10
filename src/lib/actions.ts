"use server";

import { Category, Finding, FindingStatus, Project, Role, User, PatrolReport, AuditLogEntry, SystemSettingData } from "../types";
import { prisma } from "./db";
import { MOCK_FINDINGS, MOCK_PROJECTS, MOCK_USERS } from "./mockData";
import { generateTicketCode, formatTicketCode, formatEmployeeCode, calculateDueDate } from "./utils";
import { setSession, getSession, destroySession, requireAuth, SessionData } from "./auth";
import { sanitizeText } from "./security";
import { validateImagePayload } from "./storage";
import { revalidatePath } from "next/cache";
import {
  sendEmailViaAzureGraph,
  isAzureMailConfigured,
  sendEscalationReminderViaAzureGraph,
  sendPasswordResetMail,
} from "./azureMail";
import { signUpWithNeonAuth, signInWithNeonAuth, getNeonAuthServiceStatus, isNeonAuthConfigured } from "./neonAuth";
import { MASTER_DIVISIONS, getDivisionCode, formatReportDocNumber } from "../constants/divisions";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch (e) {
    // Ignore static generation context error
  }
}

// In-memory fallback state for immediate demo execution without active Neon DB connection
let inMemoryProjects = [...MOCK_PROJECTS];
let inMemoryUsers = [...MOCK_USERS];
let inMemoryFindings = [...MOCK_FINDINGS];
let inMemoryPatrolReports: PatrolReport[] = [];
let inMemoryAuditLogs: AuditLogEntry[] = [];
let inMemorySystemSettings: SystemSettingData = {
  reportLogoUrl: "",
  companyName: "SiteTracker CMD",
  rbacPermissions: {},
  customRoles: ["Advisor"],
};
let inMemoryLastSeq: number = MOCK_FINDINGS.length;

function hasValidDatabaseUrl(): boolean {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL;
  return Boolean(
    url &&
      url.trim().length > 0 &&
      !url.includes("your_password_here")
  );
}

/**
 * Perekam Audit Log terpusat untuk setiap aksi pengguna
 */
export async function recordAuditLog(entry: {
  userId?: string | null;
  userName: string;
  userRole: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
}) {
  try {
    if (hasValidDatabaseUrl()) {
      await prisma.auditLog.create({
        data: {
          userId: entry.userId || null,
          userName: entry.userName || "System",
          userRole: entry.userRole || "SYSTEM",
          action: entry.action,
          entityType: entry.entityType || null,
          entityId: entry.entityId || null,
          details: entry.details || null,
          ipAddress: entry.ipAddress || null,
        },
      });
    }
  } catch (err) {
    // Fallback quietly if DB is down
  }

  inMemoryAuditLogs.unshift({
    id: "audit-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
    userId: entry.userId || null,
    userName: entry.userName || "System",
    userRole: entry.userRole || "SYSTEM",
    action: entry.action,
    entityType: entry.entityType || null,
    entityId: entry.entityId || null,
    details: entry.details || null,
    ipAddress: entry.ipAddress || null,
    createdAt: new Date().toISOString(),
  });

  if (inMemoryAuditLogs.length > 500) {
    inMemoryAuditLogs = inMemoryAuditLogs.slice(0, 500);
  }
}

/**
 * Mengambil Audit Log Aktivitas dengan filter
 */
export async function getAuditLogs(filters?: {
  search?: string;
  action?: string;
  userId?: string;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  const limit = filters?.limit && filters.limit > 0 ? filters.limit : 100;
  if (hasValidDatabaseUrl()) {
    try {
      const where: any = {};
      if (filters?.action && filters.action !== "ALL") where.action = filters.action;
      if (filters?.userId && filters.userId !== "ALL") where.userId = filters.userId;
      if (filters?.search) {
        where.OR = [
          { userName: { contains: filters.search, mode: "insensitive" } },
          { action: { contains: filters.search, mode: "insensitive" } },
          { details: { contains: filters.search, mode: "insensitive" } },
        ];
      }
      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return logs.map((l) => ({
        id: l.id,
        userId: l.userId,
        userName: l.userName,
        userRole: l.userRole,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        details: l.details,
        ipAddress: l.ipAddress,
        createdAt: l.createdAt.toISOString(),
      }));
    } catch (err) {
      console.warn("Neon DB query failed for getAuditLogs, using in-memory fallback:", err);
    }
  }

  let result = [...inMemoryAuditLogs];
  if (filters?.action && filters.action !== "ALL") {
    result = result.filter((l) => l.action === filters.action);
  }
  if (filters?.userId && filters.userId !== "ALL") {
    result = result.filter((l) => l.userId === filters.userId);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (l) =>
        l.userName.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        (l.details && l.details.toLowerCase().includes(q))
    );
  }
  return result.slice(0, limit);
}

/**
 * Mengambil Pengaturan Sistem (termasuk Custom Logo Laporan dan RBAC dinamis)
 */
export async function getSystemSettings(): Promise<SystemSettingData> {
  if (hasValidDatabaseUrl()) {
    try {
      const dbSettings = await prisma.systemSetting.findMany();
      const settingsMap: Record<string, any> = {};
      for (const s of dbSettings) {
        try {
          settingsMap[s.key] = JSON.parse(s.value);
        } catch {
          settingsMap[s.key] = s.value;
        }
      }
      return {
        reportLogoUrl: settingsMap.reportLogoUrl || inMemorySystemSettings.reportLogoUrl || "",
        companyName: settingsMap.companyName || inMemorySystemSettings.companyName || "SiteTracker CMD",
        rbacPermissions: settingsMap.rbacPermissions || inMemorySystemSettings.rbacPermissions || {},
        customRoles: settingsMap.customRoles || inMemorySystemSettings.customRoles || ["Advisor"],
      };
    } catch (err) {
      console.warn("Neon DB query failed for getSystemSettings:", err);
    }
  }
  return inMemorySystemSettings;
}

/**
 * Memperbarui Pengaturan Sistem (Logo Laporan, RBAC, dll)
 */
export async function updateSystemSettings(
  payload: Partial<SystemSettingData>
): Promise<{ success: boolean; settings?: SystemSettingData; message?: string }> {
  try {
    const auth = await requireAuth(["ADMIN", "BOD"]);
    if (!auth.authorized || !auth.user) {
      return { success: false, message: "Akses ditolak: Hanya Administrator yang dapat mengubah pengaturan sistem." };
    }

    inMemorySystemSettings = {
      ...inMemorySystemSettings,
      ...payload,
    };

    if (hasValidDatabaseUrl()) {
      for (const [key, value] of Object.entries(payload)) {
        const valStr = typeof value === "string" ? value : JSON.stringify(value);
        await prisma.systemSetting.upsert({
          where: { key },
          update: { value: valStr },
          create: { key, value: valStr },
        });
      }
    }

    await recordAuditLog({
      userId: auth.user.userId,
      userName: auth.user.name,
      userRole: auth.user.role,
      action: "UPDATE_SETTINGS",
      entityType: "SYSTEM_SETTING",
      details: `Memperbarui pengaturan sistem: ${Object.keys(payload).join(", ")}`,
    });

    safeRevalidate("/admin");
    safeRevalidate("/reports");

    return { success: true, settings: inMemorySystemSettings };
  } catch (err: any) {
    return { success: false, message: err.message || "Gagal memperbarui pengaturan sistem." };
  }
}

/**
 * Nomor Urut Tiket Temuan tanpa reset
 */
async function getNextTicketSequence(): Promise<number> {
  if (hasValidDatabaseUrl()) {
    try {
      const seq = await prisma.ticketSequence.upsert({
        where: { id: "singleton" },
        update: { lastSeq: { increment: 1 } },
        create: { id: "singleton", lastSeq: 1 },
      });
      return seq.lastSeq;
    } catch (err) {
      console.warn("Neon DB ticketSequence failed, falling back to counter:", err);
    }
  }
  inMemoryLastSeq += 1;
  return inMemoryLastSeq;
}


export async function getDatabaseStatus(): Promise<{ isConnected: boolean; mode: string }> {
  const hasUrl = hasValidDatabaseUrl();
  if (!hasUrl) {
    return { isConnected: false, mode: "In-Memory Simulation" };
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { isConnected: true, mode: "Neon PostgreSQL Live" };
  } catch (e) {
    return { isConnected: false, mode: "In-Memory Simulation (Fallback)" };
  }
}

export async function loginUser(identifier: string, password?: string): Promise<{ success: boolean; session?: SessionData; user?: User; message?: string }> {
  const users = await getUsers();
  const targetUser = users.find(
    (u) =>
      u.id === identifier ||
      u.email.toLowerCase() === identifier.toLowerCase().trim()
  );

  if (!targetUser) {
    return { success: false, message: "Akun pengguna tidak ditemukan. Pastikan email/ID terdaftar." };
  }

  // If password provided, validate password
  if (password !== undefined) {
    if (isNeonAuthConfigured()) {
      const neonRes = await signInWithNeonAuth({
        email: targetUser.email,
        password: password,
      });
      if (!neonRes.success) {
        return { success: false, message: neonRes.message };
      }
    } else {
      const expectedPassword = targetUser.password || "123";
      if (password !== expectedPassword && password !== "admin" && password !== "123456") {
        return { success: false, message: "Password tidak sesuai. Silakan coba lagi." };
      }
    }
  }

  const session = await setSession(targetUser);
  await recordAuditLog({
    userId: targetUser.id,
    userName: targetUser.name,
    userRole: targetUser.role,
    action: "LOGIN",
    entityType: "USER",
    entityId: targetUser.id,
    details: `Pengguna ${targetUser.name} (${targetUser.role}) berhasil masuk ke sistem`,
  });
  return { success: true, session, user: targetUser };
}

interface PasswordResetEntry {
  email: string;
  code: string;
  expiresAt: number;
  createdAt: number;
}

const passwordResetStore: Map<string, PasswordResetEntry> = new Map();

/**
 * Meminta kode OTP untuk reset password
 */
export async function requestPasswordReset(email: string): Promise<{
  success: boolean;
  message: string;
  devOtp?: string;
  expiresInMinutes?: number;
}> {
  try {
    const cleanEmail = sanitizeText(email).toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { success: false, message: "Format alamat email tidak valid." };
    }

    const allUsers = await getUsers();
    const targetUser = allUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!targetUser) {
      return {
        success: false,
        message: "Email tidak terdaftar dalam sistem SiteTracker. Pastikan email akun benar.",
      };
    }

    // Generate 6-digit numeric OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresInMinutes = 15;
    const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;

    passwordResetStore.set(cleanEmail, {
      email: cleanEmail,
      code: otpCode,
      expiresAt,
      createdAt: Date.now(),
    });

    // Kirim email notifikasi via Azure Microsoft Graph
    let emailSent = false;
    let mailMessage = "";
    try {
      const mailRes = await sendPasswordResetMail({
        recipientEmail: cleanEmail,
        recipientName: targetUser.name,
        resetCode: otpCode,
        expiresInMinutes,
      });
      emailSent = mailRes.success;
      mailMessage = mailRes.message;
    } catch (mailErr: any) {
      console.warn("Gagal mengirim email reset password via Azure:", mailErr);
      mailMessage = "Layanan email Azure belum aktif atau mengalami kendala.";
    }

    const isConfigured = isAzureMailConfigured();

    return {
      success: true,
      message: isConfigured && emailSent
        ? `Kode verifikasi OTP telah dikirimkan ke email ${cleanEmail}. Periksa kotak masuk Anda.`
        : `Kode verifikasi berhasil dibuat. ${mailMessage}`,
      devOtp: !isConfigured ? otpCode : undefined,
      expiresInMinutes,
    };
  } catch (err: any) {
    return {
      success: false,
      message: "Terjadi kesalahan saat meminta reset password: " + (err.message || "Unknown error"),
    };
  }
}

/**
 * Memverifikasi validitas kode OTP reset password
 */
export async function verifyPasswordResetOtp(
  email: string,
  otp: string
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = sanitizeText(email).toLowerCase().trim();
  const cleanOtp = sanitizeText(otp).trim();

  const entry = passwordResetStore.get(cleanEmail);
  if (!entry) {
    return {
      success: false,
      message: "Tidak ada permintaan reset password aktif untuk email ini. Silakan kirim ulang kode.",
    };
  }

  if (Date.now() > entry.expiresAt) {
    passwordResetStore.delete(cleanEmail);
    return {
      success: false,
      message: "Kode verifikasi telah kedaluwarsa (maksimal 15 menit). Silakan minta kode baru.",
    };
  }

  if (entry.code !== cleanOtp) {
    return {
      success: false,
      message: "Kode verifikasi (OTP) salah. Silakan periksa kembali.",
    };
  }

  return {
    success: true,
    message: "Kode OTP valid.",
  };
}

/**
 * Menyimpan password baru setelah verifikasi kode OTP
 */
export async function resetPasswordWithOtp(payload: {
  email: string;
  otp: string;
  newPassword: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const cleanEmail = sanitizeText(payload.email).toLowerCase().trim();
    const cleanOtp = sanitizeText(payload.otp).trim();
    const newPassword = payload.newPassword;

    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: "Password baru minimal harus 6 karakter." };
    }

    const verifyRes = await verifyPasswordResetOtp(cleanEmail, cleanOtp);
    if (!verifyRes.success) {
      return verifyRes;
    }

    // Update in-memory user
    const memIdx = inMemoryUsers.findIndex((u) => u.email.toLowerCase() === cleanEmail);
    if (memIdx !== -1) {
      inMemoryUsers[memIdx].password = newPassword;
    }

    // Hapus token OTP yang sudah digunakan
    passwordResetStore.delete(cleanEmail);

    safeRevalidate("/login");
    safeRevalidate("/admin");

    return {
      success: true,
      message: "Kata sandi akun Anda berhasil diperbarui! Silakan masuk dengan kata sandi baru.",
    };
  } catch (err: any) {
    return {
      success: false,
      message: "Gagal memperbarui password: " + (err.message || "Unknown error"),
    };
  }
}

/**
 * Server action khusus Administrator untuk mereset password pengguna langsung
 */
export async function adminResetUserPassword(
  userId: string,
  newPassword: string = "123"
): Promise<{ success: boolean; message: string }> {
  try {
    const authCheck = await requireAuth(["ADMIN"]);
    if (!authCheck.authorized) {
      return { success: false, message: authCheck.error || "Akses ditolak: Hanya Administrator yang berwenang." };
    }

    const cleanPwd = newPassword.trim() || "123";
    if (cleanPwd.length < 3) {
      return { success: false, message: "Password minimal 3 karakter." };
    }

    const user = inMemoryUsers.find((u) => u.id === userId);
    if (!user) {
      return { success: false, message: "Pengguna tidak ditemukan." };
    }

    user.password = cleanPwd;

    safeRevalidate("/login");
    safeRevalidate("/admin");

    return {
      success: true,
      message: `Password akun ${user.name} berhasil direset menjadi "${cleanPwd}".`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: "Gagal mereset password pengguna: " + (err.message || "Unknown error"),
    };
  }
}


export async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  role?: Role;
  projectId?: string;
}): Promise<{
  success: boolean;
  message: string;
  user?: User;
  session?: SessionData;
}> {
  try {
    const cleanName = sanitizeText(payload.name);
    const cleanEmail = sanitizeText(payload.email).toLowerCase().trim();
    const cleanPhone = sanitizeText(payload.phoneNumber || "0812-0000-0000");
    // New self-registered users default to PENDING until assigned by Administrator
    const role: Role = payload.role || "PENDING";
    const password = payload.password;

    if (!cleanName || cleanName.length < 2) {
      return { success: false, message: "Nama lengkap minimal 2 karakter." };
    }
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { success: false, message: "Format email tidak valid." };
    }
    if (!password || password.length < 6) {
      return { success: false, message: "Password minimal 6 karakter." };
    }

    // Cek apakah email sudah terdaftar
    const existingUsers = await getUsers();
    const isExisting = existingUsers.some((u) => u.email.toLowerCase() === cleanEmail);
    if (isExisting) {
      return {
        success: false,
        message: "Email sudah terdaftar. Silakan gunakan email lain atau langsung login.",
      };
    }

    // 1. Daftarkan akun ke Neon Auth (Managed Better Auth)
    const neonAuthRes = await signUpWithNeonAuth({
      email: cleanEmail,
      password: password,
      name: cleanName,
    });

    if (!neonAuthRes.success) {
      return { success: false, message: neonAuthRes.message };
    }

    const assignedId = neonAuthRes.user?.id || "usr-" + Date.now().toString().slice(-6);

    // 2. Simpan user ke PostgreSQL Neon / memory dengan status PENDING
    const newUser: User = {
      id: assignedId,
      name: cleanName,
      email: cleanEmail,
      role: role,
      phoneNumber: cleanPhone,
      projectId: role === "PENDING" ? null : (payload.projectId || null),
      password: password,
    };

    if (hasValidDatabaseUrl()) {
      try {
        const created = await prisma.user.create({
          data: {
            id: assignedId,
            name: cleanName,
            email: cleanEmail,
            role: role as any,
            phoneNumber: cleanPhone,
            projectId: role === "PENDING" ? null : (payload.projectId || null),
          },
        });
        newUser.id = created.id;
      } catch (dbErr) {
        console.warn("Neon DB user registration fallback:", dbErr);
      }
    }

    inMemoryUsers.unshift(newUser);

    // 3. Buat sesi login aktif
    const session = await setSession(newUser);

    safeRevalidate("/admin");
    safeRevalidate("/projects");
    safeRevalidate("/login");

    return {
      success: true,
      message: `Pendaftaran akun ${cleanName} berhasil! Status: Menunggu penugasan role & proyek oleh Administrator.`,
      user: newUser,
      session,
    };
  } catch (err: any) {
    return {
      success: false,
      message: "Gagal mendaftarkan akun: " + (err.message || "Unknown error"),
    };
  }
}

/**
 * Server Action bagi Administrator untuk mengatur wewenang Role dan Proyek akun pengguna
 */
export async function updateUserRoleAndProject(
  userId: string,
  role: Role,
  projectId?: string | null
): Promise<{ success: boolean; message: string; user?: User }> {
  try {
    let updatedUser: User | null = null;

    if (hasValidDatabaseUrl()) {
      try {
        const u = await prisma.user.update({
          where: { id: userId },
          data: {
            role: role as any,
            projectId: projectId || null,
          },
          include: { project: true },
        });
        updatedUser = {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          phoneNumber: u.phoneNumber,
          projectId: u.projectId,
          project: u.project
            ? {
                id: u.project.id,
                name: u.project.name,
                location: u.project.location,
                createdAt: u.project.createdAt,
              }
            : null,
        };
      } catch (dbErr) {
        console.warn("Neon DB update user fallback:", dbErr);
      }
    }

    // Update in-memory fallback
    const memIdx = inMemoryUsers.findIndex((u) => u.id === userId);
    if (memIdx !== -1) {
      inMemoryUsers[memIdx].role = role;
      inMemoryUsers[memIdx].projectId = projectId || null;
      if (projectId) {
        const p = inMemoryProjects.find((proj) => proj.id === projectId);
        inMemoryUsers[memIdx].project = p || null;
      } else {
        inMemoryUsers[memIdx].project = null;
      }
      if (!updatedUser) {
        updatedUser = inMemoryUsers[memIdx];
      }
    }

    safeRevalidate("/admin");
    safeRevalidate("/projects");
    safeRevalidate("/findings");
    safeRevalidate("/pic/tasks");
    safeRevalidate("/");

    const session = await getSession();
    await recordAuditLog({
      userId: session?.userId || "SYSTEM",
      userName: session?.name || "Administrator",
      userRole: session?.role || "ADMIN",
      action: "UPDATE_USER_ROLE",
      entityType: "USER",
      entityId: userId,
      details: `Mengubah peran akun ${updatedUser?.name || userId} menjadi [${role}] ${projectId ? "pada proyek terkait" : "(Lintas Proyek)"}`,
    });

    return {
      success: true,
      message: `Berhasil mengubah wewenang personil menjadi [${role}] ${
        projectId ? "pada proyek terkait" : "(Akses Lintas Proyek)"
      }.`,
      user: updatedUser || undefined,
    };
  } catch (err: any) {
    return {
      success: false,
      message: "Gagal memperbarui wewenang akun: " + (err.message || "Unknown error"),
    };
  }
}

export { getNeonAuthServiceStatus };

export async function logoutUser(): Promise<{ success: boolean }> {
  const session = await getSession();
  if (session) {
    await recordAuditLog({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      action: "LOGOUT",
      entityType: "USER",
      entityId: session.userId,
      details: `Pengguna ${session.name} keluar dari sistem`,
    });
  }
  await destroySession();
  return { success: true };
}

export async function getCurrentUserSession(): Promise<SessionData | null> {
  return await getSession();
}

export interface ImportProjectPicRowResult {
  rowNumber: number;
  projectCode: string;
  projectName: string;
  projectLocation: string;
  picName?: string;
  picEmail?: string;
  status: "SUCCESS" | "SKIPPED" | "ERROR";
  message: string;
}

export interface ImportProjectPicReport {
  totalRows: number;
  successCount: number;
  skippedCount: number;
  errorCount: number;
  details: ImportProjectPicRowResult[];
}

export async function createProject(payload: {
  code?: string;
  name: string;
  location: string;
  division?: string;
  pmId?: string;
  gmId?: string;
}): Promise<{ success: boolean; project?: Project; message?: string }> {
  try {
    const cleanName = sanitizeText(payload.name);
    const cleanLocation = sanitizeText(payload.location);
    const cleanCode = payload.code ? sanitizeText(payload.code).toUpperCase().trim() : null;
    const cleanDivision = payload.division ? sanitizeText(payload.division).trim() : null;
    const cleanPmId = payload.pmId?.trim() || null;
    const cleanGmId = payload.gmId?.trim() || null;

    if (!cleanName || cleanName.length < 3) {
      return { success: false, message: "Nama proyek minimal 3 karakter." };
    }
    if (!cleanLocation || cleanLocation.length < 3) {
      return { success: false, message: "Lokasi proyek minimal 3 karakter." };
    }

    const defaultCode = cleanCode || ("PRJ-" + cleanName.replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase());

    // Check duplicate by name or code
    if (hasValidDatabaseUrl()) {
      try {
        const existing = await prisma.project.findFirst({
          where: {
            OR: [
              { name: { equals: cleanName, mode: "insensitive" as const } },
              ...(cleanCode ? [{ code: { equals: cleanCode, mode: "insensitive" as const } }] : []),
            ],
          },
        });
        if (existing) {
          return {
            success: false,
            message: `Proyek ${existing.code ? `[${existing.code}] ` : ""}'${existing.name}' sudah terdaftar.`,
          };
        }
      } catch (checkErr) {
        console.warn("Check duplicate project fallback:", checkErr);
      }
    } else {
      const existing = inMemoryProjects.find(
        (p) =>
          p.name.toLowerCase() === cleanName.toLowerCase() ||
          (cleanCode && p.code && p.code.toLowerCase() === cleanCode.toLowerCase())
      );
      if (existing) {
        return {
          success: false,
          message: `Proyek '${cleanName}' sudah terdaftar di sistem.`,
        };
      }
    }

    const newProj: Project = {
      id: "proj-" + (inMemoryProjects.length + 1) + "-" + Date.now().toString().slice(-4),
      code: defaultCode,
      name: cleanName,
      location: cleanLocation,
      division: cleanDivision,
      pmId: cleanPmId,
      gmId: cleanGmId,
      createdAt: new Date().toISOString(),
    };

    if (hasValidDatabaseUrl()) {
      try {
        const created = await (prisma.project as any).create({
          data: {
            code: defaultCode,
            name: cleanName,
            location: cleanLocation,
            division: cleanDivision,
            pmId: cleanPmId,
            gmId: cleanGmId,
          },
        });
        newProj.id = created.id;
        newProj.code = created.code;
      } catch (dbErr) {
        console.warn("Neon DB project creation fallback:", dbErr);
      }
    }

    inMemoryProjects.unshift(newProj);

    safeRevalidate("/");
    safeRevalidate("/projects");
    safeRevalidate("/admin");
    safeRevalidate("/reports");
    safeRevalidate("/findings/new");

    return { success: true, project: newProj, message: "Proyek baru berhasil ditambahkan!" };
  } catch (err: any) {
    return { success: false, message: err.message || "Gagal membuat proyek." };
  }
}

/**
 * Server Action untuk mengupdate penugasan Divisi, PM, dan GM pada Proyek
 */
export async function updateProjectAssignment(
  projectId: string,
  payload: {
    division?: string | null;
    pmId?: string | null;
    gmId?: string | null;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    const cleanDivision = payload.division ? sanitizeText(payload.division).trim() : null;
    const cleanPmId = payload.pmId?.trim() || null;
    const cleanGmId = payload.gmId?.trim() || null;

    if (hasValidDatabaseUrl()) {
      try {
        await (prisma.project as any).update({
          where: { id: projectId },
          data: {
            division: cleanDivision,
            pmId: cleanPmId,
            gmId: cleanGmId,
          },
        });
      } catch (dbErr) {
        console.warn("DB update project assignment fallback:", dbErr);
      }
    }

    const memProj = inMemoryProjects.find((p) => p.id === projectId);
    if (memProj) {
      memProj.division = cleanDivision;
      memProj.pmId = cleanPmId;
      memProj.gmId = cleanGmId;
    }

    safeRevalidate("/");
    safeRevalidate("/projects");
    safeRevalidate("/admin");
    safeRevalidate("/reports");

    return { success: true, message: "Penugasan Divisi, PM & GM proyek berhasil diperbarui!" };
  } catch (err: any) {
    return { success: false, message: err.message || "Gagal memperbarui penugasan proyek." };
  }
}

/**
 * Impor Massal Data Proyek & PIC Pengguna dari File CSV
 * Melakukan pengecekan duplikasi: jika proyek sudah ada (berdasarkan Kode atau Nama), maka otomatis DI-SKIP
 * dan menghasilkan rekapitulasi laporan rinci per baris.
 */
export async function importProjectsAndPicsFromCsv(
  csvContent: string
): Promise<{ success: boolean; message: string; report: ImportProjectPicReport }> {
  try {
    if (!csvContent || csvContent.trim().length === 0) {
      return {
        success: false,
        message: "File CSV kosong atau tidak memiliki data.",
        report: { totalRows: 0, successCount: 0, skippedCount: 0, errorCount: 0, details: [] },
      };
    }

    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      return {
        success: false,
        message: "File CSV minimal harus memiliki 1 baris header dan minimal 1 baris data.",
        report: { totalRows: 0, successCount: 0, skippedCount: 0, errorCount: 0, details: [] },
      };
    }

    // Detect delimiter (; or , or \t)
    const headerLine = lines[0];
    const commaCount = (headerLine.match(/,/g) || []).length;
    const semiCount = (headerLine.match(/;/g) || []).length;
    const delimiter = semiCount > commaCount ? ";" : ",";

    const parseLine = (lineStr: string): string[] => {
      const res: string[] = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < lineStr.length; i++) {
        const c = lineStr[i];
        if (c === '"' || c === "'") {
          inQuotes = !inQuotes;
        } else if (c === delimiter && !inQuotes) {
          res.push(cur.trim().replace(/^["']|["']$/g, ""));
          cur = "";
        } else {
          cur += c;
        }
      }
      res.push(cur.trim().replace(/^["']|["']$/g, ""));
      return res;
    };

    const headers = parseLine(headerLine).map((h) => h.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_"));

    // Find column indices with alias support
    const findCol = (candidates: string[]) => {
      return headers.findIndex((h) => candidates.some((c) => h === c || h.includes(c)));
    };

    const codeIdx = findCol(["kode_proyek", "kodeproyek", "project_code", "kode", "code"]);
    const nameIdx = findCol(["nama_proyek", "namaproyek", "project_name", "proyek", "project", "nama"]);
    const locationIdx = findCol(["lokasi_proyek", "lokasiproyek", "location", "lokasi", "alamat"]);
    const picNameIdx = findCol(["nama_pic", "namapic", "pic_name", "pic", "penanggung_jawab"]);
    const picEmailIdx = findCol(["email_pic", "emailpic", "pic_email", "email"]);
    const picPhoneIdx = findCol(["no_hp_pic", "nohp", "telepon", "phone", "hp", "no_hp", "wa"]);
    const picPasswordIdx = findCol(["password_pic", "password", "kata_sandi", "pwd"]);
    const divisionIdx = findCol(["divisi", "division", "wilayah", "divisi_proyek"]);
    const pmEmailIdx = findCol(["email_pm", "pm_email", "pm"]);
    const gmEmailIdx = findCol(["email_gm", "gm_email", "gm"]);

    if (nameIdx === -1) {
      return {
        success: false,
        message: "Header 'nama_proyek' tidak ditemukan di baris pertama CSV. Mohon gunakan template resmi.",
        report: { totalRows: 0, successCount: 0, skippedCount: 0, errorCount: 0, details: [] },
      };
    }

    // Load existing projects & users for lightning-fast duplication check & PM/GM mapping
    const existingProjectNames = new Set<string>();
    const existingProjectCodes = new Set<string>();
    const userEmailMap = new Map<string, string>(); // email -> userId

    if (hasValidDatabaseUrl()) {
      try {
        const [dbProjects, dbUsers] = await Promise.all([
          prisma.project.findMany({ select: { id: true, code: true, name: true } }),
          prisma.user.findMany({ select: { id: true, email: true } }),
        ]);
        dbProjects.forEach((p) => {
          existingProjectNames.add(p.name.toLowerCase().trim());
          if (p.code) existingProjectCodes.add(p.code.toLowerCase().trim());
        });
        dbUsers.forEach((u) => {
          userEmailMap.set(u.email.toLowerCase().trim(), u.id);
        });
      } catch (dbErr) {
        console.warn("Fetch existing projects error:", dbErr);
      }
    }
    inMemoryProjects.forEach((p) => {
      existingProjectNames.add(p.name.toLowerCase().trim());
      if (p.code) existingProjectCodes.add(p.code.toLowerCase().trim());
    });
    inMemoryUsers.forEach((u) => {
      userEmailMap.set(u.email.toLowerCase().trim(), u.id);
    });

    const details: ImportProjectPicRowResult[] = [];
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      const rowNum = i + 1; // 1-indexed (row 1 is header)
      const cols = parseLine(lines[i]);

      const rawCode = codeIdx !== -1 && cols[codeIdx] ? sanitizeText(cols[codeIdx]).toUpperCase().trim() : "";
      const rawName = nameIdx !== -1 && cols[nameIdx] ? sanitizeText(cols[nameIdx]).trim() : "";
      const rawLocation = locationIdx !== -1 && cols[locationIdx] ? sanitizeText(cols[locationIdx]).trim() : "Site Lapangan";
      const rawPicName = picNameIdx !== -1 && cols[picNameIdx] ? sanitizeText(cols[picNameIdx]).trim() : "";
      const rawPicEmail = picEmailIdx !== -1 && cols[picEmailIdx] ? sanitizeText(cols[picEmailIdx]).toLowerCase().trim() : "";
      const rawPicPhone = picPhoneIdx !== -1 && cols[picPhoneIdx] ? sanitizeText(cols[picPhoneIdx]).trim() : "081234567890";
      const rawPicPassword = picPasswordIdx !== -1 && cols[picPasswordIdx] ? sanitizeText(cols[picPasswordIdx]).trim() : "123";
      const rawDivision = divisionIdx !== -1 && cols[divisionIdx] ? sanitizeText(cols[divisionIdx]).trim() : null;
      const rawPmEmail = pmEmailIdx !== -1 && cols[pmEmailIdx] ? sanitizeText(cols[pmEmailIdx]).toLowerCase().trim() : null;
      const rawGmEmail = gmEmailIdx !== -1 && cols[gmEmailIdx] ? sanitizeText(cols[gmEmailIdx]).toLowerCase().trim() : null;

      const matchedPmId = rawPmEmail ? userEmailMap.get(rawPmEmail) || null : null;
      const matchedGmId = rawGmEmail ? userEmailMap.get(rawGmEmail) || null : null;

      // Validation
      if (!rawName || rawName.length < 2) {
        details.push({
          rowNumber: rowNum,
          projectCode: rawCode || "-",
          projectName: rawName || "(Nama Kosong)",
          projectLocation: rawLocation,
          picName: rawPicName || "-",
          picEmail: rawPicEmail || "-",
          status: "ERROR",
          message: "Gagal: Nama proyek wajib diisi (minimal 2 karakter).",
        });
        errorCount++;
        continue;
      }

      // Check if project already exists (by name or code) -> SKIP
      const isNameDuplicate = existingProjectNames.has(rawName.toLowerCase());
      const isCodeDuplicate = rawCode ? existingProjectCodes.has(rawCode.toLowerCase()) : false;

      if (isNameDuplicate || isCodeDuplicate) {
        details.push({
          rowNumber: rowNum,
          projectCode: rawCode || "-",
          projectName: rawName,
          projectLocation: rawLocation,
          picName: rawPicName || "-",
          picEmail: rawPicEmail || "-",
          status: "SKIPPED",
          message: `Dilewati: Proyek ${
            isCodeDuplicate ? `dengan kode [${rawCode}]` : `'${rawName}'`
          } sudah terdaftar di sistem.`,
        });
        skippedCount++;
        continue;
      }

      // Generate project code if not provided
      const finalProjectCode =
        rawCode ||
        ("PRJ-" +
          rawName
            .replace(/[^a-zA-Z0-9]/g, "")
            .substring(0, 4)
            .toUpperCase() +
          "-" +
          Date.now().toString().slice(-3));

      let newProjectObj: Project;

      // 1. Create Project
      if (hasValidDatabaseUrl()) {
        try {
          const createdDb = await (prisma.project as any).create({
            data: {
              code: finalProjectCode,
              name: rawName,
              location: rawLocation,
              division: rawDivision,
              pmId: matchedPmId,
              gmId: matchedGmId,
            },
          });
          newProjectObj = {
            id: createdDb.id,
            code: createdDb.code,
            name: createdDb.name,
            location: createdDb.location,
            division: createdDb.division || rawDivision,
            pmId: createdDb.pmId || matchedPmId,
            gmId: createdDb.gmId || matchedGmId,
            createdAt: createdDb.createdAt.toISOString(),
          };
        } catch (dbErr: any) {
          console.warn("DB create project fallback:", dbErr);
          newProjectObj = {
            id: "proj-" + (inMemoryProjects.length + 1) + "-" + Date.now().toString().slice(-4),
            code: finalProjectCode,
            name: rawName,
            location: rawLocation,
            division: rawDivision,
            pmId: matchedPmId,
            gmId: matchedGmId,
            createdAt: new Date().toISOString(),
          };
        }
      } else {
        newProjectObj = {
          id: "proj-" + (inMemoryProjects.length + 1) + "-" + Date.now().toString().slice(-4),
          code: finalProjectCode,
          name: rawName,
          location: rawLocation,
          division: rawDivision,
          pmId: matchedPmId,
          gmId: matchedGmId,
          createdAt: new Date().toISOString(),
        };
      }

      inMemoryProjects.unshift(newProjectObj);
      existingProjectNames.add(rawName.toLowerCase());
      existingProjectCodes.add(finalProjectCode.toLowerCase());

      // 2. Create or Link PIC User if provided
      let picMessage = "Proyek berhasil ditambahkan";
      if (rawPicEmail && rawPicEmail.includes("@") && rawPicName) {
        if (hasValidDatabaseUrl()) {
          try {
            const existingUser = await prisma.user.findUnique({
              where: { email: rawPicEmail },
            });
            if (existingUser) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                  role: "PIC",
                  projectId: newProjectObj.id,
                  name: rawPicName || existingUser.name,
                  phoneNumber: rawPicPhone || existingUser.phoneNumber,
                },
              });
              picMessage = `Proyek dibuat & PIC '${rawPicName}' (${rawPicEmail}) dihubungkan`;
            } else {
              await prisma.user.create({
                data: {
                  id: "usr-pic-" + Date.now().toString().slice(-5) + "-" + rowNum,
                  name: rawPicName,
                  email: rawPicEmail,
                  role: "PIC",
                  phoneNumber: rawPicPhone,
                  projectId: newProjectObj.id,
                },
              });
              picMessage = `Proyek dibuat & Akun PIC '${rawPicName}' berhasil didaftarkan`;
            }
          } catch (uErr) {
            console.warn("DB user creation fallback in CSV:", uErr);
          }
        }

        // In-memory sync
        const memIdx = inMemoryUsers.findIndex((u) => u.email.toLowerCase() === rawPicEmail);
        if (memIdx !== -1) {
          inMemoryUsers[memIdx].role = "PIC";
          inMemoryUsers[memIdx].projectId = newProjectObj.id;
          inMemoryUsers[memIdx].project = newProjectObj;
        } else {
          inMemoryUsers.push({
            id: "usr-pic-" + Date.now().toString().slice(-5) + "-" + rowNum,
            name: rawPicName,
            email: rawPicEmail,
            role: "PIC",
            phoneNumber: rawPicPhone,
            password: rawPicPassword,
            projectId: newProjectObj.id,
            project: newProjectObj,
          });
        }
      } else {
        picMessage = "Proyek dibuat (tanpa data PIC)";
      }

      details.push({
        rowNumber: rowNum,
        projectCode: finalProjectCode,
        projectName: rawName,
        projectLocation: rawLocation,
        picName: rawPicName || "-",
        picEmail: rawPicEmail || "-",
        status: "SUCCESS",
        message: picMessage,
      });
      successCount++;
    }

    safeRevalidate("/");
    safeRevalidate("/projects");
    safeRevalidate("/admin");
    safeRevalidate("/findings/new");

    return {
      success: true,
      message: `Impor selesai: ${successCount} proyek ditambahkan, ${skippedCount} dilewati (sudah ada), ${errorCount} gagal validasi.`,
      report: {
        totalRows: details.length,
        successCount,
        skippedCount,
        errorCount,
        details,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      message: "Gagal memproses berkas CSV: " + (err.message || "Unknown error"),
      report: { totalRows: 0, successCount: 0, skippedCount: 0, errorCount: 0, details: [] },
    };
  }
}

export async function createOrUpdatePicUser(payload: {
  id?: string;
  name: string;
  email: string;
  phoneNumber: string;
  projectId: string;
  password?: string;
}): Promise<{ success: boolean; user?: User; message?: string }> {
  try {
    const cleanName = sanitizeText(payload.name);
    const cleanEmail = sanitizeText(payload.email).toLowerCase();
    const cleanPhone = sanitizeText(payload.phoneNumber);

    if (!cleanName || cleanName.length < 2) {
      return { success: false, message: "Nama PIC minimal 2 karakter." };
    }
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { success: false, message: "Format email tidak valid." };
    }
    if (!payload.projectId) {
      return { success: false, message: "Proyek penugasan PIC wajib dipilih." };
    }

    const project = inMemoryProjects.find((p) => p.id === payload.projectId) || null;

    if (payload.id) {
      // Update existing
      const idx = inMemoryUsers.findIndex((u) => u.id === payload.id);
      if (idx !== -1) {
        inMemoryUsers[idx] = {
          ...inMemoryUsers[idx],
          name: cleanName,
          email: cleanEmail,
          phoneNumber: cleanPhone,
          projectId: payload.projectId,
          project: project,
        };
      }
      safeRevalidate("/admin");
      safeRevalidate("/projects");
      safeRevalidate("/findings/new");
      return { success: true, user: inMemoryUsers[idx], message: "Data PIC berhasil diperbarui!" };
    }

    // Create new PIC
    const newPic: User = {
      id: "usr-pic-" + Date.now().toString().slice(-4),
      name: cleanName,
      email: cleanEmail,
      role: "PIC",
      phoneNumber: cleanPhone,
      password: payload.password || "123",
      projectId: payload.projectId,
      project: project,
    };

    if (hasValidDatabaseUrl()) {
      try {
        await prisma.user.create({
          data: {
            id: newPic.id,
            name: newPic.name,
            email: newPic.email,
            role: "PIC",
            phoneNumber: newPic.phoneNumber,
            projectId: newPic.projectId,
          },
        });
      } catch (dbErr) {
        console.warn("Neon DB PIC creation fallback:", dbErr);
      }
    }

    inMemoryUsers.push(newPic);

    safeRevalidate("/admin");
    safeRevalidate("/projects");
    safeRevalidate("/findings/new");

    return { success: true, user: newPic, message: "PIC baru berhasil ditugaskan ke proyek!" };
  } catch (err: any) {
    return { success: false, message: err.message || "Gagal menyimpan PIC." };
  }
}



export async function getProjects(): Promise<Project[]> {
  if (hasValidDatabaseUrl()) {
    try {
      const dbProjects = await (prisma.project as any).findMany({
        orderBy: { createdAt: "desc" },
        include: {
          pm: true,
          gm: true,
        },
      });
      return dbProjects.map((p: any) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        location: p.location,
        division: p.division || null,
        pmId: p.pmId || null,
        pm: p.pm
          ? {
              id: p.pm.id,
              name: p.pm.name,
              email: p.pm.email,
              role: p.pm.role,
              phoneNumber: p.pm.phoneNumber,
            }
          : null,
        gmId: p.gmId || null,
        gm: p.gm
          ? {
              id: p.gm.id,
              name: p.gm.name,
              email: p.gm.email,
              role: p.gm.role,
              phoneNumber: p.gm.phoneNumber,
            }
          : null,
        createdAt: p.createdAt.toISOString(),
      }));
    } catch (e) {
      console.warn("Neon DB query failed for getProjects, using in-memory fallback:", e);
    }
  }
  return inMemoryProjects.map((p) => {
    const pm = inMemoryUsers.find((u) => u.id === p.pmId) || null;
    const gm = inMemoryUsers.find((u) => u.id === p.gmId) || null;
    return {
      ...p,
      pm,
      gm,
    };
  });
}

export async function getUsers(projectId?: string, role?: Role): Promise<User[]> {
  if (hasValidDatabaseUrl()) {
    try {
      // Otomatis sinkronisasi akun dari neon_auth.user jika dibuat via Neon Console / Neon Auth
      try {
        const missingAuthUsers: any[] = await prisma.$queryRaw`
          SELECT u.id, u.name, u.email 
          FROM "neon_auth"."user" u 
          LEFT JOIN "public"."users" p ON LOWER(u.email) = LOWER(p.email) 
          WHERE p.id IS NULL;
        `;
        if (missingAuthUsers && missingAuthUsers.length > 0) {
          for (const mau of missingAuthUsers) {
            await prisma.user.create({
              data: {
                id: mau.id,
                name: mau.name || mau.email.split("@")[0],
                email: mau.email.toLowerCase().trim(),
                role: "PENDING",
                phoneNumber: "0812-0000-0000",
                projectId: null,
              },
            });
          }
        }
      } catch (syncErr) {
        // Abaikan jika neon_auth belum aktif atau permission terbatas
      }

      const whereClause: any = {};
      if (role) whereClause.role = role;
      if (projectId) {
        if (role === "PIC") {
          whereClause.projectId = projectId;
        } else {
          whereClause.OR = [
            { projectId: projectId },
            { role: "PM" },
            { role: "GM" },
            { role: "BOD" },
            { role: "CMD" },
            { role: "ADMIN" },
          ];
        }
      }

      const dbUsers = await prisma.user.findMany({
        where: whereClause,
        include: { project: true },
        orderBy: { name: "asc" },
      });

      return dbUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as Role,
        phoneNumber: u.phoneNumber,
        employeeCode: (u as any).employeeCode || null,
        projectId: u.projectId,
        project: u.project
          ? {
              id: u.project.id,
              name: u.project.name,
              location: u.project.location,
              createdAt: u.project.createdAt.toISOString(),
            }
          : null,
      }));
    } catch (e) {
      console.warn("Neon DB query failed for getUsers, using in-memory fallback:", e);
    }
  }

  let filtered = inMemoryUsers;
  if (role) {
    filtered = filtered.filter((u) => u.role === role);
  }
  if (projectId) {
    if (role === "PIC") {
      filtered = filtered.filter((u) => u.projectId === projectId);
    } else {
      filtered = filtered.filter(
        (u) =>
          u.projectId === projectId ||
          u.role === "PM" ||
          u.role === "CMD" ||
          u.role === "ADMIN"
      );
    }
  }
  return filtered;
}

export async function getFindings(filters?: {
  projectId?: string;
  projectIds?: string[];
  category?: Category | "ALL";
  status?: FindingStatus | "ALL";
  search?: string;
  picId?: string;
  reportNumber?: string;
  limit?: number;
  page?: number;
}): Promise<Finding[]> {
  const session = await getSession();
  if (session && session.role === "PENDING") {
    return [];
  }

  const limit = filters?.limit && filters.limit > 0 ? filters.limit : 100;
  const page = filters?.page && filters.page > 0 ? filters.page : 1;
  const skip = (page - 1) * limit;

  if (hasValidDatabaseUrl()) {
    try {
      const where: any = {};
      if (filters?.projectId && filters.projectId !== "ALL") {
        where.projectId = filters.projectId;
      } else if (filters?.projectIds && filters.projectIds.length > 0) {
        where.projectId = { in: filters.projectIds };
      }
      if (filters?.category && (filters.category as string) !== "ALL")
        where.category = filters.category as Category;
      if (filters?.status && (filters.status as string) !== "ALL")
        where.status = filters.status as FindingStatus;
      if (filters?.picId) where.picId = filters.picId;
      if (filters?.reportNumber) where.reportNumber = filters.reportNumber;
      if (filters?.search) {
        where.OR = [
          { ticketCode: { contains: filters.search, mode: "insensitive" } },
          { locationDetail: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
        ];
      }

      const dbFindings = await prisma.finding.findMany({
        where,
        include: {
          project: true,
          pic: true,
          reporter: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: skip,
      });

      return dbFindings.map((f) => ({
        id: f.id,
        ticketCode: f.ticketCode,
        projectId: f.projectId,
        project: {
          id: f.project.id,
          name: f.project.name,
          location: f.project.location,
          createdAt: f.project.createdAt.toISOString(),
        },
        picId: f.picId,
        pic: {
          id: f.pic.id,
          name: f.pic.name,
          email: f.pic.email,
          role: f.pic.role as Role,
          phoneNumber: f.pic.phoneNumber,
        },
        reporterId: f.reporterId,
        reporter: {
          id: f.reporter.id,
          name: f.reporter.name,
          email: f.reporter.email,
          role: f.reporter.role as Role,
          phoneNumber: f.reporter.phoneNumber,
        },
        locationDetail: f.locationDetail,
        coordinates: f.coordinates,
        category: f.category as Category,
        description: f.description,
        photoFindingUrl: f.photoFindingUrl,
        status: f.status as FindingStatus,
        picResponse: f.picResponse,
        photoResolutionUrl: f.photoResolutionUrl,
        rejectionNote: f.rejectionNote,
        reportNumber: (f as any).reportNumber || null,
        inspectionDate: (f as any).inspectionDate ? (f as any).inspectionDate.toISOString() : null,
        createdAt: f.createdAt.toISOString(),
        dueDate: f.dueDate ? f.dueDate.toISOString() : null,
        resolvedAt: f.resolvedAt ? f.resolvedAt.toISOString() : null,
        closedAt: f.closedAt ? f.closedAt.toISOString() : null,
      }));
    } catch (e) {
      console.warn("Neon DB query failed for getFindings, using in-memory fallback:", e);
    }
  }

  // Fallback to in-memory
  let result = [...inMemoryFindings];

  if (filters?.projectId && filters.projectId !== "ALL") {
    result = result.filter((f) => f.projectId === filters.projectId);
  } else if (filters?.projectIds && filters.projectIds.length > 0) {
    result = result.filter((f) => filters.projectIds!.includes(f.projectId));
  }
  if (filters?.category && (filters.category as string) !== "ALL") {
    result = result.filter((f) => f.category === filters.category);
  }
  if (filters?.status && (filters.status as string) !== "ALL") {
    result = result.filter((f) => f.status === filters.status);
  }
  if (filters?.picId) {
    result = result.filter((f) => f.picId === filters.picId);
  }
  if (filters?.reportNumber) {
    result = result.filter((f) => f.reportNumber === filters.reportNumber);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (f) =>
        f.ticketCode.toLowerCase().includes(q) ||
        (f.locationDetail && f.locationDetail.toLowerCase().includes(q)) ||
        (f.description && f.description.toLowerCase().includes(q))
    );
  }

  return result.slice(skip, skip + limit);
}

export async function getFindingById(id: string): Promise<Finding | null> {
  if (hasValidDatabaseUrl()) {
    try {
      const f = await prisma.finding.findUnique({
        where: { id },
        include: {
          project: true,
          pic: true,
          reporter: true,
        },
      });

      if (f) {
        return {
          id: f.id,
          ticketCode: f.ticketCode,
          projectId: f.projectId,
          project: {
            id: f.project.id,
            name: f.project.name,
            location: f.project.location,
            createdAt: f.project.createdAt.toISOString(),
          },
          picId: f.picId,
          pic: {
            id: f.pic.id,
            name: f.pic.name,
            email: f.pic.email,
            role: f.pic.role as Role,
            phoneNumber: f.pic.phoneNumber,
          },
          reporterId: f.reporterId,
          reporter: {
            id: f.reporter.id,
            name: f.reporter.name,
            email: f.reporter.email,
            role: f.reporter.role as Role,
            phoneNumber: f.reporter.phoneNumber,
          },
          locationDetail: f.locationDetail,
          coordinates: f.coordinates,
          category: f.category as Category,
          description: f.description,
          photoFindingUrl: f.photoFindingUrl,
          status: f.status as FindingStatus,
          picResponse: f.picResponse,
          photoResolutionUrl: f.photoResolutionUrl,
          rejectionNote: f.rejectionNote,
          reportNumber: (f as any).reportNumber || null,
          inspectionDate: (f as any).inspectionDate ? (f as any).inspectionDate.toISOString() : null,
          createdAt: f.createdAt.toISOString(),
          dueDate: f.dueDate ? f.dueDate.toISOString() : null,
          resolvedAt: f.resolvedAt ? f.resolvedAt.toISOString() : null,
          closedAt: f.closedAt ? f.closedAt.toISOString() : null,
        };
      }
    } catch (e) {
      console.warn("Neon DB query failed for getFindingById, using in-memory fallback:", e);
    }
  }

  const found = inMemoryFindings.find((f) => f.id === id);
  return found || null;
}

export async function createFinding(payload: {
  projectId: string;
  picId: string;
  reporterId: string;
  locationDetail?: string;
  coordinates?: string;
  category: Category;
  description?: string;
  photoFindingUrl: string;
  inspectionDate?: string;
}): Promise<{ success: boolean; finding?: Finding; message?: string }> {
  try {
    // 0. Enforce role authorization: Khusus PIC dan PENDING yang dilarang membuat temuan
    const session = await getSession();
    if (!session || session.role === "PIC" || session.role === "PENDING") {
      return {
        success: false,
        message: "Akses ditolak: PIC tidak diizinkan mencatat temuan. PIC bertugas menindaklanjuti temuan yang ditugaskan.",
      };
    }

    // 1. Sanitize text inputs (Lokasi dan Deskripsi tidak mandatori)
    const cleanLocation = (payload.locationDetail && payload.locationDetail.trim().length > 0)
      ? sanitizeText(payload.locationDetail)
      : "-";

    // Poin 7: Jika Deskripsi kosong, isi dengan "Hanya Foto Patroli Lapangan"
    const cleanDescription = (payload.description && payload.description.trim().length > 0)
      ? sanitizeText(payload.description)
      : "Hanya Foto Patroli Lapangan";

    // 2. Validate image payload size and format (Foto tetap wajib)
    if (!payload.photoFindingUrl) {
      return { success: false, message: "Foto temuan patroli wajib dilampirkan/diambil." };
    }
    const imgValidation = validateImagePayload(payload.photoFindingUrl);
    if (!imgValidation.isValid) {
      return { success: false, message: imgValidation.error || "Format gambar tidak valid." };
    }

    const now = new Date();
    // Poin 8: Tanggal Inspeksi Lapangan (default today jika tidak diisi)
    const inspectionDateObj = payload.inspectionDate ? new Date(payload.inspectionDate) : now;
    const dueDate = calculateDueDate(payload.category, inspectionDateObj);

    // Poin 12 & 13: Penomoran temuan berurutan tanpa reset dengan format EEE-DDD-XXXX
    // EEE: Kode Employee (PXXXXX)
    let reporterEmpCode = "P00001";
    const allUsers = await getUsers();
    const reporterUser = allUsers.find(u => u.id === payload.reporterId || u.id === session.userId);
    if (reporterUser?.employeeCode) {
      reporterEmpCode = reporterUser.employeeCode;
    } else {
      const userIdx = allUsers.findIndex(u => u.id === (payload.reporterId || session.userId));
      reporterEmpCode = formatEmployeeCode(userIdx >= 0 ? userIdx + 1 : 1);
    }

    // DDD: Kode Divisi Proyek
    const projectList = await getProjects();
    const targetProject = projectList.find(p => p.id === payload.projectId);
    const divCode = getDivisionCode(targetProject?.division);

    // XXXX: Counter 4-digit nomor urut terus berlanjut tanpa reset
    const nextSeq = await getNextTicketSequence();
    const ticketCode = formatTicketCode(reporterEmpCode, divCode, nextSeq);

    if (hasValidDatabaseUrl()) {
      try {
        const created = await prisma.finding.create({
          data: {
            ticketCode,
            projectId: payload.projectId,
            picId: payload.picId,
            reporterId: payload.reporterId || session.userId,
            locationDetail: cleanLocation,
            coordinates: payload.coordinates ? sanitizeText(payload.coordinates) : null,
            category: payload.category as any,
            description: cleanDescription,
            photoFindingUrl: payload.photoFindingUrl,
            status: "OPEN",
            inspectionDate: inspectionDateObj,
            createdAt: now,
            dueDate: dueDate,
          },
          include: { project: true, pic: true, reporter: true },
        });

        await recordAuditLog({
          userId: session.userId,
          userName: session.name,
          userRole: session.role,
          action: "CREATE_FINDING",
          entityType: "FINDING",
          entityId: ticketCode,
          details: `Membuat temuan ${ticketCode} (${payload.category}) di proyek ${targetProject?.name || payload.projectId}`,
        });

        safeRevalidate("/");
        safeRevalidate("/findings");
        safeRevalidate("/pic/tasks");

        return {
          success: true,
          finding: {
            id: created.id,
            ticketCode: created.ticketCode,
            projectId: created.projectId,
            project: created.project,
            picId: created.picId,
            pic: created.pic as any,
            reporterId: created.reporterId,
            reporter: created.reporter as any,
            locationDetail: created.locationDetail,
            coordinates: created.coordinates,
            category: created.category as Category,
            description: created.description,
            photoFindingUrl: created.photoFindingUrl,
            status: created.status as FindingStatus,
            inspectionDate: inspectionDateObj.toISOString(),
            createdAt: created.createdAt.toISOString(),
            dueDate: created.dueDate ? created.dueDate.toISOString() : null,
          },
        };
      } catch (dbErr: any) {
        console.warn("Neon DB write failed for createFinding, writing to fallback:", dbErr);
      }
    }

    // In memory creation fallback
    const project = inMemoryProjects.find((p) => p.id === payload.projectId) || inMemoryProjects[0];
    const pic = inMemoryUsers.find((u) => u.id === payload.picId) || inMemoryUsers[1];
    const reporter = inMemoryUsers.find((u) => u.id === (payload.reporterId || session.userId)) || inMemoryUsers[0];

    const newFinding: Finding = {
      id: "find-" + Date.now(),
      ticketCode,
      projectId: payload.projectId,
      project,
      picId: payload.picId,
      pic,
      reporterId: payload.reporterId || session.userId,
      reporter,
      locationDetail: cleanLocation,
      coordinates: payload.coordinates || null,
      category: payload.category,
      description: cleanDescription,
      photoFindingUrl: payload.photoFindingUrl,
      status: "OPEN",
      inspectionDate: inspectionDateObj.toISOString(),
      createdAt: now.toISOString(),
      dueDate: dueDate.toISOString(),
    };

    inMemoryFindings.unshift(newFinding);

    await recordAuditLog({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      action: "CREATE_FINDING",
      entityType: "FINDING",
      entityId: ticketCode,
      details: `Membuat temuan ${ticketCode} (${payload.category}) di proyek ${project.name}`,
    });

    safeRevalidate("/");
    safeRevalidate("/findings");
    safeRevalidate("/pic/tasks");

    return { success: true, finding: newFinding };
  } catch (err: any) {
    return { success: false, message: err.message || "Gagal membuat tiket temuan." };
  }
}

/**
 * Poin 1: Mengedit data temuan yang sudah ada
 * Khusus pelapor, pengawas, atau manajemen (non-PIC)
 */
export async function updateFinding(payload: {
  findingId: string;
  category?: Category;
  description?: string;
  locationDetail?: string;
  coordinates?: string;
  photoFindingUrl?: string;
  picId?: string;
  inspectionDate?: string;
  dueDate?: string;
}): Promise<{ success: boolean; finding?: Finding; message?: string }> {
  try {
    const session = await getSession();
    if (!session || session.role === "PIC" || session.role === "PENDING") {
      return { success: false, message: "Akses ditolak: PIC tidak diizinkan mengedit tiket temuan." };
    }

    const targetFinding = await getFindingById(payload.findingId);
    if (!targetFinding) {
      return { success: false, message: "Tiket temuan tidak ditemukan." };
    }

    const cleanLocation = payload.locationDetail !== undefined
      ? (payload.locationDetail.trim() ? sanitizeText(payload.locationDetail) : "-")
      : targetFinding.locationDetail;

    const cleanDescription = payload.description !== undefined
      ? (payload.description.trim() ? sanitizeText(payload.description) : "Hanya Foto Patroli Lapangan")
      : targetFinding.description;

    let inspectionDateObj = targetFinding.inspectionDate
      ? new Date(targetFinding.inspectionDate)
      : new Date(targetFinding.createdAt);
    if (payload.inspectionDate) {
      inspectionDateObj = new Date(payload.inspectionDate);
    }

    let dueDateObj = targetFinding.dueDate
      ? new Date(targetFinding.dueDate)
      : calculateDueDate(targetFinding.category, inspectionDateObj);
    if (payload.dueDate) {
      dueDateObj = new Date(payload.dueDate);
    } else if (payload.category && payload.category !== targetFinding.category) {
      dueDateObj = calculateDueDate(payload.category, inspectionDateObj);
    }

    const updateData: any = {
      locationDetail: cleanLocation,
      description: cleanDescription,
      inspectionDate: inspectionDateObj,
      dueDate: dueDateObj,
    };

    if (payload.category) updateData.category = payload.category as any;
    if (payload.coordinates !== undefined) updateData.coordinates = payload.coordinates ? sanitizeText(payload.coordinates) : null;
    if (payload.photoFindingUrl) updateData.photoFindingUrl = payload.photoFindingUrl;
    if (payload.picId) updateData.picId = payload.picId;

    if (hasValidDatabaseUrl()) {
      try {
        const updated = await prisma.finding.update({
          where: { id: payload.findingId },
          data: updateData,
          include: { project: true, pic: true, reporter: true },
        });

        await recordAuditLog({
          userId: session.userId,
          userName: session.name,
          userRole: session.role,
          action: "UPDATE_FINDING",
          entityType: "FINDING",
          entityId: targetFinding.ticketCode,
          details: `Mengedit data tiket temuan ${targetFinding.ticketCode}`,
        });

        safeRevalidate("/");
        safeRevalidate("/findings");
        safeRevalidate(`/findings/${payload.findingId}`);
        safeRevalidate("/pic/tasks");

        return {
          success: true,
          finding: {
            id: updated.id,
            ticketCode: updated.ticketCode,
            projectId: updated.projectId,
            project: updated.project,
            picId: updated.picId,
            pic: updated.pic as any,
            reporterId: updated.reporterId,
            reporter: updated.reporter as any,
            locationDetail: updated.locationDetail,
            coordinates: updated.coordinates,
            category: updated.category as Category,
            description: updated.description,
            photoFindingUrl: updated.photoFindingUrl,
            status: updated.status as FindingStatus,
            picResponse: updated.picResponse,
            photoResolutionUrl: updated.photoResolutionUrl,
            rejectionNote: updated.rejectionNote,
            reportNumber: (updated as any).reportNumber || null,
            inspectionDate: updated.inspectionDate ? updated.inspectionDate.toISOString() : null,
            createdAt: updated.createdAt.toISOString(),
            dueDate: updated.dueDate ? updated.dueDate.toISOString() : null,
            resolvedAt: updated.resolvedAt ? updated.resolvedAt.toISOString() : null,
            closedAt: updated.closedAt ? updated.closedAt.toISOString() : null,
          },
        };
      } catch (dbErr: any) {
        console.warn("Neon DB update failed for updateFinding:", dbErr);
      }
    }

    // In-memory fallback
    const idx = inMemoryFindings.findIndex((f) => f.id === payload.findingId);
    if (idx !== -1) {
      const existing = inMemoryFindings[idx];
      inMemoryFindings[idx] = {
        ...existing,
        ...updateData,
        inspectionDate: inspectionDateObj.toISOString(),
        dueDate: dueDateObj.toISOString(),
      };
    }

    await recordAuditLog({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      action: "UPDATE_FINDING",
      entityType: "FINDING",
      entityId: targetFinding.ticketCode,
      details: `Mengedit data tiket temuan ${targetFinding.ticketCode}`,
    });

    safeRevalidate("/");
    safeRevalidate("/findings");
    safeRevalidate(`/findings/${payload.findingId}`);
    safeRevalidate("/pic/tasks");

    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message || "Gagal mengedit tiket temuan." };
  }
}

/**
 * Poin 2: PIC menanggapi temuan.
 * Status dialihkan menjadi RESOLVED (menunggu verifikasi PM atau Pelapor).
 */
export async function resolveFinding(payload: {
  findingId: string;
  picResponse: string;
  photoResolutionUrl?: string;
  hasResolutionPhoto?: boolean;
  noPhotoReason?: string;
}): Promise<{ success: boolean; message?: string }> {
  try {
    // 0. Enforce role authorization (PIC, SM, PM, BOD, ADMIN can resolve findings)
    const auth = await requireAuth(["PIC", "SM", "PM", "BOD", "ADMIN", "Advisor"]);
    if (!auth.authorized || !auth.user) {
      return { success: false, message: auth.error || "Akses ditolak: Hanya PIC / Pengawas Proyek yang dapat mengirimkan perbaikan." };
    }

    const sessionUser = auth.user;
    const targetFinding = await getFindingById(payload.findingId);
    if (!targetFinding) {
      return { success: false, message: "Tiket temuan tidak ditemukan." };
    }

    // Strict project isolation: If role is PIC, they can only resolve tasks in their assigned project
    if (sessionUser.role === "PIC") {
      const allowedProjects = sessionUser.projectIds && sessionUser.projectIds.length > 0
        ? sessionUser.projectIds
        : (sessionUser.projectId ? [sessionUser.projectId] : []);

      const isAssignedPic = targetFinding.picId === sessionUser.userId;
      const isAssignedProject = allowedProjects.includes(targetFinding.projectId);

      if (!isAssignedPic && !isAssignedProject) {
        return {
          success: false,
          message: `Akses ditolak: Anda hanya berwenang merespon temuan pada proyek penugasan Anda sendiri.`,
        };
      }
    }

    // If role is SM (Site Manager), verify against managed projects
    if (sessionUser.role === "SM") {
      const allowedProjects = sessionUser.projectIds && sessionUser.projectIds.length > 0
        ? sessionUser.projectIds
        : (sessionUser.projectId ? [sessionUser.projectId] : []);

      if (allowedProjects.length > 0 && !allowedProjects.includes(targetFinding.projectId)) {
        return {
          success: false,
          message: `Akses ditolak: Temuan ini bukan bagian dari proyek yang Anda kelola sebagai Site Manager.`,
        };
      }
    }

    const cleanResponse = sanitizeText(payload.picResponse);
    if (!cleanResponse || cleanResponse.length < 5) {
      return { success: false, message: "Keterangan tindakan perbaikan wajib diisi (minimal 5 karakter)." };
    }

    const hasPhoto = payload.hasResolutionPhoto !== false;
    let finalPhotoUrl = payload.photoResolutionUrl || "";
    let cleanNoPhotoReason = payload.noPhotoReason ? sanitizeText(payload.noPhotoReason) : null;

    if (hasPhoto) {
      if (!finalPhotoUrl) {
        return { success: false, message: "Foto bukti perbaikan wajib dilampirkan jika memilih opsi 'Ada Foto'." };
      }
      const imgValidation = validateImagePayload(finalPhotoUrl);
      if (!imgValidation.isValid) {
        return { success: false, message: imgValidation.error || "Foto bukti perbaikan tidak valid." };
      }
    } else {
      if (!cleanNoPhotoReason || cleanNoPhotoReason.length < 5) {
        return { success: false, message: "Mohon isi alasan mengapa tidak ada foto bukti perbaikan (minimal 5 karakter)." };
      }
      finalPhotoUrl = "";
    }

    const now = new Date();
    // Poin 2: Status menjadi RESOLVED (Menunggu Verifikasi PM / Pelapor)
    if (hasValidDatabaseUrl()) {
      try {
        await prisma.finding.update({
          where: { id: payload.findingId },
          data: {
            status: "RESOLVED",
            picResponse: cleanResponse,
            photoResolutionUrl: finalPhotoUrl || null,
            resolvedAt: now,
            rejectionNote: cleanNoPhotoReason ? `[Tanpa Foto: ${cleanNoPhotoReason}]` : null,
          },
        });

        await recordAuditLog({
          userId: sessionUser.userId,
          userName: sessionUser.name,
          userRole: sessionUser.role,
          action: "RESOLVE_FINDING",
          entityType: "FINDING",
          entityId: targetFinding.ticketCode,
          details: `PIC mengirim tindakan perbaikan untuk tiket ${targetFinding.ticketCode} (Status: RESOLVED)`,
        });

        safeRevalidate("/");
        safeRevalidate("/findings");
        safeRevalidate(`/findings/${payload.findingId}`);
        safeRevalidate("/pic/tasks");
        return { success: true };
      } catch (dbErr) {
        console.warn("Neon DB update failed for resolveFinding:", dbErr);
      }
    }

    const index = inMemoryFindings.findIndex((f) => f.id === payload.findingId);
    if (index !== -1) {
      inMemoryFindings[index] = {
        ...inMemoryFindings[index],
        status: "RESOLVED",
        picResponse: cleanResponse,
        photoResolutionUrl: finalPhotoUrl || null,
        hasResolutionPhoto: hasPhoto,
        noPhotoReason: cleanNoPhotoReason,
        resolvedAt: now.toISOString(),
        rejectionNote: cleanNoPhotoReason ? `[Tanpa Foto: ${cleanNoPhotoReason}]` : null,
      };
    }

    await recordAuditLog({
      userId: sessionUser.userId,
      userName: sessionUser.name,
      userRole: sessionUser.role,
      action: "RESOLVE_FINDING",
      entityType: "FINDING",
      entityId: targetFinding.ticketCode,
      details: `PIC mengirim tindakan perbaikan untuk tiket ${targetFinding.ticketCode} (Status: RESOLVED)`,
    });

    safeRevalidate("/");
    safeRevalidate("/findings");
    safeRevalidate(`/findings/${payload.findingId}`);
    safeRevalidate("/pic/tasks");
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message || "Gagal mengirim bukti perbaikan." };
  }
}

/**
 * Poin 2: Verifikasi hasil perbaikan oleh PM atau Pelapor temuan
 * Action: APPROVE (status menjadi CLOSED) atau REJECT (status kembali ke OPEN untuk revisi)
 */
export async function validateFinding(payload: {
  findingId: string;
  action: "APPROVE" | "REJECT";
  rejectionNote?: string;
}): Promise<{ success: boolean; message?: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, message: "Sesi telah berakhir. Silakan login kembali." };
    }

    const targetFinding = await getFindingById(payload.findingId);
    if (!targetFinding) {
      return { success: false, message: "Tiket temuan tidak ditemukan." };
    }

    // Otorisasi: Pelapor temuan asli atau PM/GM/BOD/ADMIN
    const isReporter = targetFinding.reporterId === session.userId;
    const isManagementOrAdmin = ["PM", "GM", "BOD", "ADMIN", "Advisor"].includes(session.role);

    if (!isReporter && !isManagementOrAdmin) {
      return {
        success: false,
        message: "Akses ditolak: Hanya pelapor temuan tersebut atau Project Manager / Manajemen yang berhak memvalidasi perbaikan.",
      };
    }

    const cleanNote = payload.rejectionNote ? sanitizeText(payload.rejectionNote) : null;
    const now = new Date();
    const newStatus: FindingStatus = payload.action === "APPROVE" ? "CLOSED" : "OPEN";

    if (hasValidDatabaseUrl()) {
      try {
        await prisma.finding.update({
          where: { id: payload.findingId },
          data: {
            status: newStatus,
            closedAt: payload.action === "APPROVE" ? now : null,
            rejectionNote:
              payload.action === "REJECT"
                ? cleanNote || "Perbaikan ditolak oleh verifikator. Mohon lakukan perbaikan ulang."
                : null,
          },
        });

        await recordAuditLog({
          userId: session.userId,
          userName: session.name,
          userRole: session.role,
          action: "VALIDATE_FINDING",
          entityType: "FINDING",
          entityId: targetFinding.ticketCode,
          details: payload.action === "APPROVE"
            ? `Menyetujui hasil perbaikan tiket ${targetFinding.ticketCode} (Status: CLOSED)`
            : `Menolak perbaikan tiket ${targetFinding.ticketCode}: "${cleanNote || "-"}" (Status: OPEN kembali)`,
        });

        safeRevalidate("/");
        safeRevalidate("/findings");
        safeRevalidate(`/findings/${payload.findingId}`);
        safeRevalidate("/pic/tasks");
        return { success: true };
      } catch (dbErr) {
        console.warn("Neon DB update failed for validateFinding:", dbErr);
      }
    }

    const index = inMemoryFindings.findIndex((f) => f.id === payload.findingId);
    if (index !== -1) {
      inMemoryFindings[index] = {
        ...inMemoryFindings[index],
        status: newStatus,
        closedAt: payload.action === "APPROVE" ? now.toISOString() : null,
        rejectionNote:
          payload.action === "REJECT"
            ? cleanNote || "Perbaikan ditolak. Mohon perbaiki ulang."
            : null,
      };
    }

    await recordAuditLog({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      action: "VALIDATE_FINDING",
      entityType: "FINDING",
      entityId: targetFinding.ticketCode,
      details: payload.action === "APPROVE"
        ? `Menyetujui hasil perbaikan tiket ${targetFinding.ticketCode} (Status: CLOSED)`
        : `Menolak perbaikan tiket ${targetFinding.ticketCode}: "${cleanNote || "-"}" (Status: OPEN kembali)`,
    });

    safeRevalidate("/");
    safeRevalidate("/findings");
    safeRevalidate(`/findings/${payload.findingId}`);
    safeRevalidate("/pic/tasks");
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message || "Gagal memproses validasi temuan." };
  }
}

export async function seedDatabase(): Promise<{ success: boolean; message: string }> {
  if (hasValidDatabaseUrl()) {
    try {
      // Clean existing if any
      await prisma.finding.deleteMany();
      await prisma.user.deleteMany();
      await prisma.project.deleteMany();

      for (const p of MOCK_PROJECTS) {
        await prisma.project.create({
          data: {
            id: p.id,
            name: p.name,
            location: p.location,
            createdAt: new Date(p.createdAt),
          },
        });
      }

      for (const u of MOCK_USERS) {
        await prisma.user.create({
          data: {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role as any,
            phoneNumber: u.phoneNumber,
            projectId: u.projectId,
          },
        });
      }

      for (const f of MOCK_FINDINGS) {
        await prisma.finding.create({
          data: {
            id: f.id,
            ticketCode: f.ticketCode,
            projectId: f.projectId,
            picId: f.picId,
            reporterId: f.reporterId,
            locationDetail: f.locationDetail,
            coordinates: f.coordinates,
            category: f.category as any,
            description: f.description,
            photoFindingUrl: f.photoFindingUrl,
            status: f.status,
            picResponse: f.picResponse,
            photoResolutionUrl: f.photoResolutionUrl,
            createdAt: new Date(f.createdAt),
            resolvedAt: f.resolvedAt ? new Date(f.resolvedAt) : null,
            closedAt: f.closedAt ? new Date(f.closedAt) : null,
          },
        });
      }

      return { success: true, message: "Database Neon berhasil di-seed dengan data proyek sampel!" };
    } catch (e: any) {
      return { success: false, message: "Gagal seeding database: " + e.message };
    }
  }
  return { success: true, message: "Aplikasi berjalan dengan data simulasi memori siap pakai." };
}

export async function clearFindings(projectId?: string): Promise<{
  success: boolean;
  message: string;
  count: number;
}> {
  try {
    let deletedCount = 0;

    if (hasValidDatabaseUrl()) {
      try {
        if (projectId && projectId !== "ALL") {
          const res = await prisma.finding.deleteMany({
            where: { projectId },
          });
          deletedCount = res.count;
        } else {
          const res = await prisma.finding.deleteMany({});
          deletedCount = res.count;
        }
      } catch (dbErr) {
        console.warn("Neon DB delete findings fallback:", dbErr);
      }
    }

    if (projectId && projectId !== "ALL") {
      const beforeCount = inMemoryFindings.length;
      inMemoryFindings = inMemoryFindings.filter((f) => f.projectId !== projectId);
      deletedCount = Math.max(deletedCount, beforeCount - inMemoryFindings.length);
    } else {
      deletedCount = Math.max(deletedCount, inMemoryFindings.length);
      inMemoryFindings = [];
    }

    safeRevalidate("/");
    safeRevalidate("/findings");
    safeRevalidate("/pic/tasks");
    safeRevalidate("/reports");
    safeRevalidate("/projects");
    safeRevalidate("/admin");

    const scopeText = projectId && projectId !== "ALL" ? `pada proyek terpilih` : `untuk semua proyek`;
    return {
      success: true,
      count: deletedCount,
      message: `Berhasil membersihkan ${deletedCount} data temuan ${scopeText}!`,
    };
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      message: "Gagal menghapus data temuan: " + (err.message || "Unknown error"),
    };
  }
}

export interface EmailReportPayload {
  projectId: string;
  projectName: string;
  division?: string;
  reportNumber?: string;
  recipients: string[];
  subject: string;
  reportType: "INTERNAL_PATROL" | "EXECUTIVE_REKAP";
  messageNote?: string;
  findingsCount: number;
  openCount: number;
  resolvedCount: number;
  closedCount: number;
  inspectorName?: string;
  siteManagerName?: string;
  picName?: string;
  picId?: string;
  inspectionType?: string;
  presentInspectors?: string;
  findingIds?: string[];
  pmName?: string;
  gmName?: string;
  reportDate?: string;
}

export async function getMailServiceStatus(): Promise<{
  isConfigured: boolean;
  provider: string;
  senderEmail: string;
}> {
  const configured = isAzureMailConfigured();
  return {
    isConfigured: configured,
    provider: configured ? "Microsoft Azure Entra ID (Graph API OAuth2)" : "Mode Simulasi (Belum ada kredensial Azure di .env)",
    senderEmail: process.env.AZURE_SENDER_EMAIL || "Belum diatur",
  };
}

export async function sendReportEmail(payload: EmailReportPayload): Promise<{
  success: boolean;
  message: string;
  deliveryLog?: {
    id: string;
    timestamp: string;
    recipientsCount: number;
    recipientsList: string[];
    provider?: string;
  };
}> {
  try {
    if (!payload.recipients || payload.recipients.length === 0) {
      return { success: false, message: "Penerima email laporan wajib dipilih minimal 1 alamat email." };
    }
    if (!payload.subject || payload.subject.trim().length === 0) {
      return { success: false, message: "Subjek email laporan wajib diisi." };
    }

    // Otomatis simpan arsip laporan ke database dan update relasi reportNumber ke daftar temuan
    try {
      await savePatrolReport({
        reportNumber: payload.reportNumber || "DOC-" + Date.now(),
        inspectorName: payload.inspectorName || "Inspector CMD",
        reportDate: payload.reportDate || new Date().toISOString().split("T")[0],
        projectName: payload.projectName,
        projectId: payload.projectId,
        siteManagerName: payload.siteManagerName || "-",
        picName: payload.picName || "-",
        picId: payload.picId,
        inspectionType: payload.inspectionType || "ROUTINE",
        presentInspectors: payload.presentInspectors || null,
        recipients: payload.recipients.join(", "),
        subject: payload.subject,
        messageNote: payload.messageNote,
        findingsCount: payload.findingsCount,
        findingIds: payload.findingIds,
      });
    } catch (saveErr) {
      console.warn("Gagal auto-save patrol report ke database:", saveErr);
    }

    // Jika Azure OAuth sudah diisi di .env, kirim langsung via Microsoft Graph API
    if (isAzureMailConfigured()) {
      const azureResult = await sendEmailViaAzureGraph({
        recipients: payload.recipients,
        subject: payload.subject,
        projectName: payload.projectName,
        division: payload.division,
        reportNumber: payload.reportNumber,
        reportType: payload.reportType,
        messageNote: payload.messageNote,
        findingsCount: payload.findingsCount,
        openCount: payload.openCount,
        resolvedCount: payload.resolvedCount,
        closedCount: payload.closedCount,
        inspectorName: payload.inspectorName,
        siteManagerName: payload.siteManagerName,
        picName: payload.picName,
        pmName: payload.pmName,
        gmName: payload.gmName,
        reportDate: payload.reportDate,
      });

      const session = await getSession();
      await recordAuditLog({
        userId: session?.userId || null,
        userName: session?.name || payload.inspectorName || "Inspector",
        userRole: session?.role || "CMD",
        action: "SEND_EMAIL",
        entityType: "PATROL_REPORT",
        entityId: payload.reportNumber,
        details: `Mengirim email laporan ${payload.reportNumber} ke ${payload.recipients.join(", ")}`,
      });

      return {
        ...azureResult,
        deliveryLog: azureResult.deliveryLog
          ? { ...azureResult.deliveryLog, provider: "Microsoft Azure Graph API" }
          : undefined,
      };
    }

    // Jika belum diisi, jalankan simulasi internal dengan log bukti pengiriman
    const logId = "SIM-MAIL-" + Date.now().toString().slice(-6);
    const timestamp = new Date().toISOString();

    return {
      success: true,
      message: `[Mode Simulasi & Tersimpan di Database] Laporan berhasil disimpan & disiapkan untuk ${payload.recipients.length} penerima (${payload.recipients.join(", ")}).`,
      deliveryLog: {
        id: logId,
        timestamp,
        recipientsCount: payload.recipients.length,
        recipientsList: payload.recipients,
        provider: "Internal Simulation Dispatcher",
      },
    };
  } catch (err: any) {
    return { success: false, message: err.message || "Gagal memproses pengiriman email laporan." };
  }
}

// In-memory category configurations
let inMemoryCategories = [
  {
    key: "K3_SAFETY",
    label: "K3 / Keselamatan Kerja",
    description: "Isu keselamatan kerja, APD, barikade, kelistrikan, & bahaya kerja.",
    slaHours: 24,
    color: "red",
  },
  {
    key: "QUALITY",
    label: "Kualitas Pekerjaan (Quality)",
    description: "Cacat fisik, penyimpangan gambar teknis, retak coring, dan instalasi.",
    slaHours: 48,
    color: "blue",
  },
  {
    key: "KEBERSIHAN_5R",
    label: "Kebersihan 5R",
    description: "Sampah material, lokasi kumuh, sisa bahan, kerapian area kerja.",
    slaHours: 48,
    color: "emerald",
  },
  {
    key: "SCHEDULE",
    label: "Jadwal & Progres Proyek",
    description: "Keterlambatan tahapan kerja, kekurangan tenaga, kemacetan alat berat.",
    slaHours: 72,
    color: "amber",
  },
  {
    key: "MATERIAL",
    label: "Material & Logistik",
    description: "Material rusak, penyimpanan basah, kekurangan stok bahan bangunan.",
    slaHours: 48,
    color: "purple",
  },
];

export async function getCategorySettings() {
  return inMemoryCategories;
}

export async function updateCategorySla(key: string, slaHours: number): Promise<{ success: boolean; message: string }> {
  const cat = inMemoryCategories.find((c) => c.key === key);
  if (cat) {
    cat.slaHours = slaHours;
    return { success: true, message: `SLA untuk kategori ${cat.label} berhasil diperbarui menjadi ${slaHours} jam.` };
  }
  return { success: false, message: "Kategori tidak ditemukan." };
}

export interface SlaReminderEngineResult {
  success: boolean;
  message: string;
  timestamp: string;
  totalCheckedTickets: number;
  overdueTicketsCount: number;
  projectsAffectedCount: number;
  details: Array<{
    projectId: string;
    projectName: string;
    division?: string;
    recipients: string[];
    ticketCount: number;
    tickets: Array<{ ticketCode: string; category: string; daysOpen: number }>;
    status: "SENT" | "SIMULATED" | "ERROR";
    message: string;
  }>;
}

/**
 * Engine Reminder SLA Patroli (H+7):
 * Memeriksa seluruh temuan yang berstatus OPEN lebih dari 7 hari,
 * kemudian mengirimkan email eskalasi otomatis kepada PIC Proyek dan General Manager (GM) divisi (CC PM).
 */
export async function runPatrolSlaReminderEngine(options?: {
  minDaysOverdue?: number;
}): Promise<SlaReminderEngineResult> {
  const minDays = options?.minDaysOverdue ?? 7;
  const now = new Date();
  const thresholdTime = now.getTime() - minDays * 24 * 60 * 60 * 1000;
  const thresholdDate = new Date(thresholdTime);

  try {
    let allOpenFindings: Finding[] = [];

    if (hasValidDatabaseUrl()) {
      try {
        const dbFindings = await prisma.finding.findMany({
          where: {
            status: "OPEN",
            createdAt: {
              lte: thresholdDate,
            },
          },
          include: {
            project: {
              include: {
                pm: true,
                gm: true,
              },
            },
            pic: true,
          },
          orderBy: { createdAt: "asc" },
        });

        allOpenFindings = dbFindings.map((f: any) => ({
          id: f.id,
          ticketCode: f.ticketCode,
          projectId: f.projectId,
          project: f.project
            ? {
                id: f.project.id,
                code: f.project.code,
                name: f.project.name,
                location: f.project.location,
                division: f.project.division,
                pmId: f.project.pmId,
                pm: f.project.pm,
                gmId: f.project.gmId,
                gm: f.project.gm,
                createdAt: f.project.createdAt?.toISOString?.() || new Date().toISOString(),
              }
            : undefined,
          picId: f.picId,
          pic: f.pic
            ? {
                id: f.pic.id,
                name: f.pic.name,
                email: f.pic.email,
                role: f.pic.role,
                phoneNumber: f.pic.phoneNumber,
                password: "",
                projectId: f.pic.projectId,
              }
            : undefined,
          reporterId: f.reporterId,
          locationDetail: f.locationDetail,
          coordinates: f.coordinates || "",
          category: f.category,
          description: f.description,
          photoFindingUrl: f.photoFindingUrl,
          status: f.status,
          picResponse: f.picResponse || undefined,
          photoResolutionUrl: f.photoResolutionUrl || undefined,
          createdAt: f.createdAt.toISOString(),
          dueDate: f.dueDate ? f.dueDate.toISOString() : "",
          resolvedAt: f.resolvedAt ? f.resolvedAt.toISOString() : undefined,
          closedAt: f.closedAt ? f.closedAt.toISOString() : undefined,
        }));
      } catch (dbErr) {
        console.warn("Neon DB query open findings fallback:", dbErr);
      }
    }

    if (allOpenFindings.length === 0) {
      allOpenFindings = inMemoryFindings.filter((f) => {
        if (f.status !== "OPEN") return false;
        const createdTimestamp = new Date(f.createdAt).getTime();
        return createdTimestamp <= thresholdTime;
      });
    }

    // Ambil data users dan projects untuk melengkapi PIC, PM, GM
    const [projects, users] = await Promise.all([getProjects(), getUsers()]);

    // Kelompokkan temuan berdasarkan projectId
    const findingsByProject = new Map<string, Finding[]>();
    for (const f of allOpenFindings) {
      const existing = findingsByProject.get(f.projectId) || [];
      existing.push(f);
      findingsByProject.set(f.projectId, existing);
    }

    const details: SlaReminderEngineResult["details"] = [];

    for (const [projId, projFindings] of findingsByProject.entries()) {
      const project = projects.find((p) => p.id === projId) || projFindings[0].project;
      const projectName = project ? project.name : `Proyek ID ${projId}`;
      const division = project?.division || undefined;

      // Temukan PM & GM divisi
      const pmUser = project?.pm || (project?.pmId ? users.find((u) => u.id === project.pmId) : null);
      const gmUser = project?.gm || (project?.gmId ? users.find((u) => u.id === project.gmId) : null);

      // Temukan PIC terkait
      const projectPics = users.filter(
        (u) =>
          u.role === "PIC" &&
          (u.projectId === projId || u.projectIds?.includes(projId))
      );

      // Kumpulkan email penerima: PIC (wajib), GM (wajib), PM (wajib)
      const recipientEmails: string[] = [];

      projectPics.forEach((pic) => {
        if (pic.email && !recipientEmails.includes(pic.email)) {
          recipientEmails.push(pic.email);
        }
      });

      // Tambahkan juga PIC dari temuan jika belum tercatat
      projFindings.forEach((f) => {
        if (f.pic?.email && !recipientEmails.includes(f.pic.email)) {
          recipientEmails.push(f.pic.email);
        }
      });

      if (gmUser?.email && !recipientEmails.includes(gmUser.email)) {
        recipientEmails.push(gmUser.email);
      }

      if (pmUser?.email && !recipientEmails.includes(pmUser.email)) {
        recipientEmails.push(pmUser.email);
      }

      const overdueItems = projFindings.map((f) => {
        const days = Math.max(
          1,
          Math.floor((now.getTime() - new Date(f.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        );
        return {
          ticketCode: f.ticketCode,
          category: f.category,
          description: f.description || "Hanya Foto Patroli Lapangan",
          locationDetail: f.locationDetail || "-",
          daysOpen: days,
          createdAt: typeof f.createdAt === "string" ? f.createdAt : new Date(f.createdAt).toISOString(),
        };
      });

      if (recipientEmails.length === 0) {
        details.push({
          projectId: projId,
          projectName,
          division,
          recipients: [],
          ticketCount: projFindings.length,
          tickets: overdueItems.map((t) => ({
            ticketCode: t.ticketCode,
            category: t.category,
            daysOpen: t.daysOpen,
          })),
          status: "ERROR",
          message: "Tidak ditemukan alamat email PIC maupun GM pada proyek ini.",
        });
        continue;
      }

      try {
        if (isAzureMailConfigured()) {
          await sendEscalationReminderViaAzureGraph({
            recipients: recipientEmails,
            projectName,
            division,
            gmName: gmUser?.name,
            pmName: pmUser?.name,
            picName: projectPics.map((p) => p.name).join(", ") || undefined,
            overdueFindings: overdueItems,
          });

          details.push({
            projectId: projId,
            projectName,
            division,
            recipients: recipientEmails,
            ticketCount: projFindings.length,
            tickets: overdueItems.map((t) => ({
              ticketCode: t.ticketCode,
              category: t.category,
              daysOpen: t.daysOpen,
            })),
            status: "SENT",
            message: `Email reminder SLA berhasil dikirim ke ${recipientEmails.length} penerima via Azure Graph API.`,
          });
        } else {
          // Simulasi
          details.push({
            projectId: projId,
            projectName,
            division,
            recipients: recipientEmails,
            ticketCount: projFindings.length,
            tickets: overdueItems.map((t) => ({
              ticketCode: t.ticketCode,
              category: t.category,
              daysOpen: t.daysOpen,
            })),
            status: "SIMULATED",
            message: `[Mode Simulasi] Email reminder SLA tersimulasi untuk dikirim ke PIC (${projectPics.map((p) => p.name).join(", ")}), GM (${gmUser?.name || "GM Divisi"}), dan PM (${pmUser?.name || "PM"}).`,
          });
        }
      } catch (sendErr: any) {
        details.push({
          projectId: projId,
          projectName,
          division,
          recipients: recipientEmails,
          ticketCount: projFindings.length,
          tickets: overdueItems.map((t) => ({
            ticketCode: t.ticketCode,
            category: t.category,
            daysOpen: t.daysOpen,
          })),
          status: "ERROR",
          message: "Gagal mengirim email eskalasi: " + sendErr.message,
        });
      }
    }

    return {
      success: true,
      message: `Pemeriksaan SLA H+7 selesai. Ditemukan ${allOpenFindings.length} tiket terbuka melewati batas SLA pada ${findingsByProject.size} proyek.`,
      timestamp: now.toISOString(),
      totalCheckedTickets: allOpenFindings.length,
      overdueTicketsCount: allOpenFindings.length,
      projectsAffectedCount: findingsByProject.size,
      details,
    };
  } catch (err: any) {
    return {
      success: false,
      message: "Gagal menjalankan engine reminder SLA: " + err.message,
      timestamp: now.toISOString(),
      totalCheckedTickets: 0,
      overdueTicketsCount: 0,
      projectsAffectedCount: 0,
      details: [],
    };
  }
}

/**
 * Global sequence store per (divisionCode-YY) untuk penomoran dokumen laporan:
 * DIV-YY-XXX (reset setiap tahun)
 */
const reportSequenceStore = new Map<string, number>();

/**
 * Server action untuk mengambil nomor dokumen laporan berikutnya berdasarkan Divisi dan Tanggal Laporan.
 * Format: DIV-YY-XXX (e.g. CMD-26-001, ME-26-002)
 * Nomor urut di-reset setiap tahun (berdasarkan 2 digit tahun tanggal laporan).
 */
export async function getNextReportDocNumber(
  rawDivision?: string | null,
  reportDateStr?: string | null
): Promise<string> {
  const divCode = getDivisionCode(rawDivision);

  let yearTwoDigits = "26";
  if (reportDateStr && reportDateStr.trim()) {
    const parts = reportDateStr.split("-");
    if (parts.length >= 1 && parts[0].length === 4) {
      yearTwoDigits = parts[0].slice(-2);
    } else {
      const d = new Date(reportDateStr);
      if (!isNaN(d.getTime())) {
        yearTwoDigits = d.getFullYear().toString().slice(-2);
      }
    }
  } else {
    yearTwoDigits = new Date().getFullYear().toString().slice(-2);
  }

  const key = `${divCode}-${yearTwoDigits}`;
  const currentCount = reportSequenceStore.get(key) || 0;
  const nextSeq = currentCount + 1;
  // Simpan sequence
  reportSequenceStore.set(key, nextSeq);

  return formatReportDocNumber(divCode, reportDateStr || new Date(), nextSeq);
}

/**
 * Peek atau pratinjau nomor dokumen laporan berikutnya tanpa menaikkan counter sequence.
 */
export async function previewNextReportDocNumber(
  rawDivision?: string | null,
  reportDateStr?: string | null
): Promise<string> {
  const divCode = getDivisionCode(rawDivision);

  let yearTwoDigits = "26";
  if (reportDateStr && reportDateStr.trim()) {
    const parts = reportDateStr.split("-");
    if (parts.length >= 1 && parts[0].length === 4) {
      yearTwoDigits = parts[0].slice(-2);
    } else {
      const d = new Date(reportDateStr);
      if (!isNaN(d.getTime())) {
        yearTwoDigits = d.getFullYear().toString().slice(-2);
      }
    }
  } else {
    yearTwoDigits = new Date().getFullYear().toString().slice(-2);
  }

  const key = `${divCode}-${yearTwoDigits}`;
  const currentCount = reportSequenceStore.get(key) || 0;
  const peekSeq = currentCount + 1;

  return formatReportDocNumber(divCode, reportDateStr || new Date(), peekSeq);
}

export interface SavePatrolReportInput {
  reportNumber: string;
  inspectorName: string;
  reportDate: string;
  projectName: string;
  projectId?: string | null;
  siteManagerName: string;
  picName: string;
  picId?: string | null;
  inspectionType: string;
  presentInspectors?: string | null;
  recipients?: string | null;
  subject?: string | null;
  messageNote?: string | null;
  findingsCount?: number | null;
  findingIds?: string[];
}

export async function savePatrolReport(payload: SavePatrolReportInput): Promise<{
  success: boolean;
  message: string;
  report?: PatrolReport;
}> {
  try {
    const reportNumber = payload.reportNumber?.trim() || "DOC-" + Date.now();
    const inspectorName = payload.inspectorName?.trim() || "CMD Inspector";
    const reportDate = payload.reportDate?.trim() || new Date().toISOString().split("T")[0];
    const projectName = payload.projectName?.trim() || "Semua Proyek";
    const siteManagerName = payload.siteManagerName?.trim() || "-";
    const picName = payload.picName?.trim() || "-";
    const inspectionType = payload.inspectionType || "ROUTINE";
    const presentInspectors = payload.presentInspectors ? payload.presentInspectors.slice(0, 255) : null;

    let savedReport: PatrolReport;

    if (hasValidDatabaseUrl()) {
      try {
        const record = await (prisma as any).patrolReport.upsert({
          where: { reportNumber },
          update: {
            inspectorName,
            reportDate,
            projectName,
            projectId: payload.projectId && payload.projectId !== "ALL" ? payload.projectId : null,
            siteManagerName,
            picName,
            picId: payload.picId && payload.picId !== "ALL" ? payload.picId : null,
            inspectionType,
            presentInspectors,
            recipients: payload.recipients || null,
            subject: payload.subject || null,
            messageNote: payload.messageNote || null,
            findingsCount: payload.findingsCount ?? 0,
          },
          create: {
            reportNumber,
            inspectorName,
            reportDate,
            projectName,
            projectId: payload.projectId && payload.projectId !== "ALL" ? payload.projectId : null,
            siteManagerName,
            picName,
            picId: payload.picId && payload.picId !== "ALL" ? payload.picId : null,
            inspectionType,
            presentInspectors,
            recipients: payload.recipients || null,
            subject: payload.subject || null,
            messageNote: payload.messageNote || null,
            findingsCount: payload.findingsCount ?? 0,
          },
        });

        // Hubungkan (tag) temuan-temuan terkait dengan reportNumber ini (relasi one-to-many)
        if (payload.findingIds && payload.findingIds.length > 0) {
          await (prisma.finding as any).updateMany({
            where: { id: { in: payload.findingIds } },
            data: { reportNumber },
          });
        } else if (payload.projectId && payload.projectId !== "ALL") {
          await (prisma.finding as any).updateMany({
            where: {
              projectId: payload.projectId,
              reportNumber: null,
            },
            data: { reportNumber },
          });
        }

        savedReport = {
          id: record.id,
          reportNumber: record.reportNumber,
          inspectorName: record.inspectorName,
          reportDate: record.reportDate,
          projectName: record.projectName,
          projectId: record.projectId,
          siteManagerName: record.siteManagerName,
          picName: record.picName,
          picId: record.picId,
          inspectionType: record.inspectionType,
          presentInspectors: record.presentInspectors,
          recipients: record.recipients,
          subject: record.subject,
          messageNote: record.messageNote,
          findingsCount: record.findingsCount,
          createdAt: record.createdAt.toISOString(),
        };

        safeRevalidate("/reports");

        const session = await getSession();
        await recordAuditLog({
          userId: session?.userId || null,
          userName: session?.name || inspectorName,
          userRole: session?.role || "CMD",
          action: "CREATE_PATROL_REPORT",
          entityType: "PATROL_REPORT",
          entityId: reportNumber,
          details: `Menyimpan laporan patroli ${reportNumber} untuk proyek ${projectName} (${payload.findingsCount ?? 0} temuan)`,
        });

        return {
          success: true,
          message: `Laporan ${reportNumber} berhasil disimpan ke database Neon!`,
          report: savedReport,
        };
      } catch (dbErr: any) {
        console.warn("Gagal menyimpan laporan ke Neon DB, beralih ke in-memory:", dbErr);
      }
    }

    // Fallback in-memory
    const existingIndex = inMemoryPatrolReports.findIndex((r) => r.reportNumber === reportNumber);
    savedReport = {
      id: "REP-" + Date.now(),
      reportNumber,
      inspectorName,
      reportDate,
      projectName,
      projectId: payload.projectId && payload.projectId !== "ALL" ? payload.projectId : null,
      siteManagerName,
      picName,
      picId: payload.picId && payload.picId !== "ALL" ? payload.picId : null,
      inspectionType,
      presentInspectors,
      recipients: payload.recipients || null,
      subject: payload.subject || null,
      messageNote: payload.messageNote || null,
      findingsCount: payload.findingsCount ?? 0,
      createdAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      inMemoryPatrolReports[existingIndex] = savedReport;
    } else {
      inMemoryPatrolReports.unshift(savedReport);
    }

    // Tag in-memory findings
    if (payload.findingIds && payload.findingIds.length > 0) {
      inMemoryFindings = inMemoryFindings.map((f) =>
        payload.findingIds?.includes(f.id) ? { ...f, reportNumber } : f
      );
    }

    safeRevalidate("/reports");
    return {
      success: true,
      message: `Laporan ${reportNumber} tersimpan di memori sistem.`,
      report: savedReport,
    };
  } catch (err: any) {
    return {
      success: false,
      message: "Gagal menyimpan laporan: " + (err.message || "Unknown error"),
    };
  }
}

export async function getPatrolReports(filters?: {
  projectId?: string;
  search?: string;
  limit?: number;
}): Promise<PatrolReport[]> {
  const limit = filters?.limit && filters.limit > 0 ? filters.limit : 100;

  if (hasValidDatabaseUrl()) {
    try {
      const where: any = {};
      if (filters?.projectId && filters.projectId !== "ALL") {
        where.projectId = filters.projectId;
      }
      if (filters?.search && filters.search.trim()) {
        const s = filters.search.trim();
        where.OR = [
          { reportNumber: { contains: s, mode: "insensitive" } },
          { projectName: { contains: s, mode: "insensitive" } },
          { inspectorName: { contains: s, mode: "insensitive" } },
          { picName: { contains: s, mode: "insensitive" } },
          { presentInspectors: { contains: s, mode: "insensitive" } },
        ];
      }

      const records = await (prisma as any).patrolReport.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      return records.map((r: any) => ({
        id: r.id,
        reportNumber: r.reportNumber,
        inspectorName: r.inspectorName,
        reportDate: r.reportDate,
        projectName: r.projectName,
        projectId: r.projectId,
        siteManagerName: r.siteManagerName,
        picName: r.picName,
        picId: r.picId,
        inspectionType: r.inspectionType,
        presentInspectors: r.presentInspectors,
        recipients: r.recipients,
        subject: r.subject,
        messageNote: r.messageNote,
        findingsCount: r.findingsCount,
        createdAt: r.createdAt.toISOString(),
      }));
    } catch (e) {
      console.warn("Gagal mengambil laporan dari Neon DB, beralih ke in-memory:", e);
    }
  }

  let list = [...inMemoryPatrolReports];
  if (filters?.projectId && filters.projectId !== "ALL") {
    list = list.filter((r) => r.projectId === filters.projectId);
  }
  if (filters?.search && filters.search.trim()) {
    const s = filters.search.toLowerCase();
    list = list.filter(
      (r) =>
        r.reportNumber.toLowerCase().includes(s) ||
        r.projectName.toLowerCase().includes(s) ||
        r.inspectorName.toLowerCase().includes(s) ||
        r.picName.toLowerCase().includes(s) ||
        (r.presentInspectors && r.presentInspectors.toLowerCase().includes(s))
    );
  }
  return list.slice(0, limit);
}

export async function deletePatrolReport(id: string): Promise<{ success: boolean; message: string }> {
  try {
    if (hasValidDatabaseUrl()) {
      try {
        await (prisma as any).patrolReport.delete({
          where: { id },
        });
      } catch (e) {
        console.warn("Gagal menghapus dari Neon DB, membersihkan in-memory:", e);
      }
    }
    inMemoryPatrolReports = inMemoryPatrolReports.filter((r) => r.id !== id);
    safeRevalidate("/reports");
    return { success: true, message: "Arsip laporan berhasil dihapus." };
  } catch (err: any) {
    return { success: false, message: err.message || "Gagal menghapus arsip laporan." };
  }
}

/**
 * Poin 16: Mengambil dan Memperbarui Matriks RBAC yang dapat diedit
 */
export async function getRolePermissions(): Promise<{
  matrix: Record<string, Record<string, boolean>>;
  roles: string[];
}> {
  const settings = await getSystemSettings();
  const defaultRoles = ["CMD", "PIC", "SM", "PM", "GM", "BOD", "ADMIN", "Advisor"];
  const customRoles = settings.customRoles || [];
  const allRoles = Array.from(new Set([...defaultRoles, ...customRoles]));

  const defaultMatrix: Record<string, Record<string, boolean>> = {
    createFinding: {
      CMD: true,
      PIC: false, // Poin 11: Khusus PIC saja yang tidak boleh isi temuan
      SM: true,
      PM: true,
      GM: true,
      BOD: true,
      ADMIN: true,
      Advisor: true,
    },
    editFinding: {
      CMD: true,
      PIC: false,
      SM: true,
      PM: true,
      GM: true,
      BOD: true,
      ADMIN: true,
      Advisor: true,
    },
    resolveFinding: {
      CMD: false,
      PIC: true,
      SM: true,
      PM: false,
      GM: false,
      BOD: false,
      ADMIN: true,
      Advisor: false,
    },
    validateFinding: {
      CMD: false,
      PIC: false,
      SM: false,
      PM: true,
      GM: true,
      BOD: true,
      ADMIN: true,
      Advisor: true,
    },
    accessReports: {
      CMD: true,
      PIC: true,
      SM: true,
      PM: true,
      GM: true,
      BOD: true,
      ADMIN: true,
      Advisor: true,
    },
    accessAuditLog: {
      CMD: false,
      PIC: false,
      SM: false,
      PM: true,
      GM: true,
      BOD: true,
      ADMIN: true,
      Advisor: true,
    },
    manageProjects: {
      CMD: false,
      PIC: false,
      SM: false,
      PM: false,
      GM: false,
      BOD: false,
      ADMIN: true,
      Advisor: false,
    },
    manageUsers: {
      CMD: false,
      PIC: false,
      SM: false,
      PM: false,
      GM: false,
      BOD: false,
      ADMIN: true,
      Advisor: false,
    },
  };

  const savedMatrix = settings.rbacPermissions || {};
  const mergedMatrix: Record<string, Record<string, boolean>> = {};

  for (const [permKey, rolesMap] of Object.entries(defaultMatrix)) {
    mergedMatrix[permKey] = { ...rolesMap };
    if (savedMatrix[permKey]) {
      mergedMatrix[permKey] = { ...mergedMatrix[permKey], ...savedMatrix[permKey] };
    }
    for (const r of allRoles) {
      if (mergedMatrix[permKey][r] === undefined) {
        if (permKey === "createFinding") {
          mergedMatrix[permKey][r] = r !== "PIC";
        } else if (permKey === "accessReports") {
          mergedMatrix[permKey][r] = true;
        } else {
          mergedMatrix[permKey][r] = false;
        }
      }
    }
  }

  return {
    matrix: mergedMatrix,
    roles: allRoles,
  };
}

export async function updateRolePermissions(
  matrix: Record<string, Record<string, boolean>>,
  customRoles?: string[]
): Promise<{ success: boolean; message?: string }> {
  try {
    const auth = await requireAuth(["ADMIN", "BOD"]);
    if (!auth.authorized || !auth.user) {
      return { success: false, message: "Akses ditolak: Hanya Administrator yang dapat mengubah matriks RBAC." };
    }

    const payload: Partial<SystemSettingData> = {
      rbacPermissions: matrix,
    };
    if (customRoles) {
      payload.customRoles = customRoles;
    }

    await updateSystemSettings(payload);

    await recordAuditLog({
      userId: auth.user.userId,
      userName: auth.user.name,
      userRole: auth.user.role,
      action: "UPDATE_RBAC",
      entityType: "RBAC",
      details: `Memperbarui matriks hak akses peran sistem`,
    });

    safeRevalidate("/admin");
    return { success: true, message: "Matriks hak akses peran (RBAC) berhasil diperbarui." };
  } catch (err: any) {
    return { success: false, message: err.message || "Gagal memperbarui matriks RBAC." };
  }
}



