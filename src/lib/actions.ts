"use server";

import { Category, Finding, FindingStatus, Project, Role, User } from "../types";
import { prisma } from "./db";
import { MOCK_FINDINGS, MOCK_PROJECTS, MOCK_USERS } from "./mockData";
import { generateTicketCode, calculateDueDate } from "./utils";
import { setSession, getSession, destroySession, requireAuth, SessionData } from "./auth";
import { sanitizeText } from "./security";
import { validateImagePayload } from "./storage";
import { revalidatePath } from "next/cache";

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

export async function loginUser(userId: string): Promise<{ success: boolean; session?: SessionData; message?: string }> {
  const users = await getUsers();
  const targetUser = users.find((u) => u.id === userId);
  if (!targetUser) {
    return { success: false, message: "User tidak ditemukan." };
  }

  const session = await setSession(targetUser);
  return { success: true, session };
}

export async function logoutUser(): Promise<{ success: boolean }> {
  await destroySession();
  return { success: true };
}

export async function getCurrentUserSession(): Promise<SessionData | null> {
  return await getSession();
}



export async function getProjects(): Promise<Project[]> {
  if (hasValidDatabaseUrl()) {
    try {
      const dbProjects = await prisma.project.findMany({
        orderBy: { createdAt: "desc" },
      });
      return dbProjects.map((p) => ({
        id: p.id,
        name: p.name,
        location: p.location,
        createdAt: p.createdAt.toISOString(),
      }));
    } catch (e) {
      console.warn("Neon DB query failed for getProjects, using in-memory fallback:", e);
    }
  }
  return inMemoryProjects;
}

export async function getUsers(projectId?: string, role?: Role): Promise<User[]> {
  if (hasValidDatabaseUrl()) {
    try {
      const whereClause: any = {};
      if (projectId) whereClause.projectId = projectId;
      if (role) whereClause.role = role;

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
  if (projectId) {
    filtered = filtered.filter(
      (u) => u.projectId === projectId || u.role === "PM" || u.role === "CMD"
    );
  }
  if (role) {
    filtered = filtered.filter((u) => u.role === role);
  }
  return filtered;
}

export async function getFindings(filters?: {
  projectId?: string;
  category?: Category | "ALL";
  status?: FindingStatus | "ALL";
  search?: string;
  picId?: string;
}): Promise<Finding[]> {
  if (hasValidDatabaseUrl()) {
    try {
      const where: any = {};
      if (filters?.projectId && filters.projectId !== "ALL") where.projectId = filters.projectId;
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

  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

    const existing = await getFindings();
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

        revalidatePath("/");
        revalidatePath("/findings");
        revalidatePath("/pic/tasks");

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

    revalidatePath("/");
    revalidatePath("/findings");
    revalidatePath("/pic/tasks");

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

        revalidatePath("/");
        revalidatePath("/findings");
        revalidatePath(`/findings/${payload.findingId}`);
        revalidatePath("/pic/tasks");
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

    revalidatePath("/");
    revalidatePath("/findings");
    revalidatePath(`/findings/${payload.findingId}`);
    revalidatePath("/pic/tasks");
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

        revalidatePath("/");
        revalidatePath("/findings");
        revalidatePath(`/findings/${payload.findingId}`);
        revalidatePath("/pic/tasks");
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

    revalidatePath("/");
    revalidatePath("/findings");
    revalidatePath(`/findings/${payload.findingId}`);
    revalidatePath("/pic/tasks");
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
            role: u.role,
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
