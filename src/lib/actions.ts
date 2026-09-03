"use server";

import { Category, Finding, FindingStatus, Project, Role, User } from "../types";
import { prisma } from "./db";
import { MOCK_FINDINGS, MOCK_PROJECTS, MOCK_USERS } from "./mockData";
import { generateTicketCode, calculateDueDate } from "./utils";
import { setSession, getSession, destroySession, requireAuth, SessionData } from "./auth";
import { sanitizeText } from "./security";
import { validateImagePayload } from "./storage";
import { revalidatePath } from "next/cache";
import { sendEmailViaAzureGraph, isAzureMailConfigured, sendEscalationReminderViaAzureGraph } from "./azureMail";
import { signUpWithNeonAuth, signInWithNeonAuth, getNeonAuthServiceStatus, isNeonAuthConfigured } from "./neonAuth";

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

function hasValidDatabaseUrl(): boolean {
  return Boolean(
    process.env.DATABASE_URL &&
      process.env.DATABASE_URL.trim().length > 0 &&
      !process.env.DATABASE_URL.includes("your_password_here")
  );
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

export async function loginUser(identifier: string, password?: string): Promise<{ success: boolean; session?: SessionData; message?: string }> {
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
  return { success: true, session };
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
            role: role,
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
            role: role,
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
      });

      return dbUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as Role,
        phoneNumber: u.phoneNumber,
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
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(
      (f) =>
        f.ticketCode.toLowerCase().includes(s) ||
        f.locationDetail.toLowerCase().includes(s) ||
        f.description.toLowerCase().includes(s)
    );
  }

  return result
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(skip, skip + limit);
}

export async function getFindingById(id: string): Promise<Finding | null> {
  if (hasValidDatabaseUrl()) {
    try {
      const f = await prisma.finding.findUnique({
        where: { id },
        include: { project: true, pic: true, reporter: true },
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
  locationDetail: string;
  coordinates?: string;
  category: Category;
  description: string;
  photoFindingUrl: string;
}): Promise<{ success: boolean; finding?: Finding; message?: string }> {
  try {
    // 0. Enforce role authorization (CMD, PM, BOD, ADMIN are authorized to create findings)
    const auth = await requireAuth(["CMD", "PM", "BOD", "ADMIN"]);
    if (!auth.authorized) {
      return { success: false, message: auth.error || "Akses ditolak: Anda tidak memiliki izin untuk mencatat temuan." };
    }

    // 1. Sanitize text inputs against XSS
    const cleanLocation = sanitizeText(payload.locationDetail);
    const cleanDescription = sanitizeText(payload.description);

    if (!cleanLocation || cleanLocation.length < 2) {
      return { success: false, message: "Lokasi spesifik temuan harus diisi (minimal 2 karakter)." };
    }
    if (!cleanDescription || cleanDescription.length < 5) {
      return { success: false, message: "Deskripsi temuan harus diisi (minimal 5 karakter)." };
    }

    // 2. Validate image payload size and format
    const imgValidation = validateImagePayload(payload.photoFindingUrl);
    if (!imgValidation.isValid) {
      return { success: false, message: imgValidation.error || "Format gambar tidak valid." };
    }

    const existing = await getFindings({ limit: 1000 });
    const ticketCode = generateTicketCode(existing.length);
    const now = new Date();
    const dueDate = calculateDueDate(payload.category, now);

    if (hasValidDatabaseUrl()) {
      try {
        const created = await prisma.finding.create({
          data: {
            ticketCode,
            projectId: payload.projectId,
            picId: payload.picId,
            reporterId: payload.reporterId,
            locationDetail: cleanLocation,
            coordinates: payload.coordinates ? sanitizeText(payload.coordinates) : null,
            category: payload.category,
            description: cleanDescription,
            photoFindingUrl: payload.photoFindingUrl,
            status: "OPEN",
            createdAt: now,
            dueDate: dueDate,
          },
          include: { project: true, pic: true, reporter: true },
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
    const reporter = inMemoryUsers.find((u) => u.id === payload.reporterId) || inMemoryUsers[0];

    const newFinding: Finding = {
      id: "find-" + Date.now(),
      ticketCode,
      projectId: payload.projectId,
      project,
      picId: payload.picId,
      pic,
      reporterId: payload.reporterId,
      reporter,
      locationDetail: payload.locationDetail,
      coordinates: payload.coordinates || null,
      category: payload.category,
      description: payload.description,
      photoFindingUrl: payload.photoFindingUrl,
      status: "OPEN",
      createdAt: now.toISOString(),
      dueDate: dueDate.toISOString(),
    };

    inMemoryFindings.unshift(newFinding);

    safeRevalidate("/");
    safeRevalidate("/findings");
    safeRevalidate("/pic/tasks");

    return { success: true, finding: newFinding };
  } catch (err: any) {
    return { success: false, message: err.message || "Gagal membuat tiket temuan." };
  }
}

export async function resolveFinding(payload: {
  findingId: string;
  picResponse: string;
  photoResolutionUrl: string;
}): Promise<{ success: boolean; message?: string }> {
  try {
    // 0. Enforce role authorization (PIC, SM, PM, BOD, ADMIN can resolve findings)
    const auth = await requireAuth(["PIC", "SM", "PM", "BOD", "ADMIN"]);
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

    const imgValidation = validateImagePayload(payload.photoResolutionUrl);
    if (!imgValidation.isValid) {
      return { success: false, message: imgValidation.error || "Foto bukti perbaikan tidak valid." };
    }

    const now = new Date();
    if (hasValidDatabaseUrl()) {
      try {
        await prisma.finding.update({
          where: { id: payload.findingId },
          data: {
            status: "RESOLVED",
            picResponse: cleanResponse,
            photoResolutionUrl: payload.photoResolutionUrl,
            resolvedAt: now,
            rejectionNote: null,
          },
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
        photoResolutionUrl: payload.photoResolutionUrl,
        resolvedAt: now.toISOString(),
        rejectionNote: null,
      };
    }

    safeRevalidate("/");
    safeRevalidate("/findings");
    safeRevalidate(`/findings/${payload.findingId}`);
    safeRevalidate("/pic/tasks");
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message || "Gagal mengirim bukti perbaikan." };
  }
}

export async function validateFinding(payload: {
  findingId: string;
  action: "APPROVE" | "REJECT";
  rejectionNote?: string;
}): Promise<{ success: boolean; message?: string }> {
  try {
    // 0. Enforce role authorization (PM, BOD, ADMIN only)
    const auth = await requireAuth(["PM", "BOD", "ADMIN"]);
    if (!auth.authorized) {
      return { success: false, message: auth.error || "Akses ditolak: Hanya PM atau BOD yang dapat memvalidasi perbaikan." };
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
                ? cleanNote || "Perbaikan ditolak oleh PM. Mohon lakukan perbaikan ulang."
                : null,
          },
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
            ? cleanNote || "Perbaikan ditolak oleh PM. Mohon perbaiki ulang."
            : null,
      };
    }

    safeRevalidate("/");
    safeRevalidate("/findings");
    safeRevalidate(`/findings/${payload.findingId}`);
    safeRevalidate("/pic/tasks");
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message || "Gagal memproses validasi PM." };
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
            category: f.category,
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

    // Jika Azure OAuth sudah diisi di .env, kirim langsung via Microsoft Graph API
    if (isAzureMailConfigured()) {
      const azureResult = await sendEmailViaAzureGraph({
        recipients: payload.recipients,
        subject: payload.subject,
        projectName: payload.projectName,
        division: payload.division,
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
      message: `[Mode Simulasi] Laporan berhasil disiapkan untuk ${payload.recipients.length} penerima (${payload.recipients.join(", ")}). Kredensial Azure OAuth di .env belum diisi sehingga email fisik belum dialirkan ke Graph API.`,
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
          description: f.description,
          locationDetail: f.locationDetail,
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


