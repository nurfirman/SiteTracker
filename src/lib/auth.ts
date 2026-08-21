import { cookies } from "next/headers";
import { Role, User } from "../types";
import { MOCK_USERS } from "./mockData";

export const SESSION_COOKIE_NAME = "sitetracker_session";

export interface SessionData {
  userId: string;
  name: string;
  email: string;
  role: Role;
  phoneNumber: string;
  projectId?: string | null;
  createdAt: number;
}

/**
 * Creates and sets the session cookie (HTTP-only)
 */
export async function setSession(user: User): Promise<SessionData> {
  const sessionData: SessionData = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phoneNumber: user.phoneNumber,
    projectId: user.projectId || null,
    createdAt: Date.now(),
  };

  const encoded = Buffer.from(JSON.stringify(sessionData)).toString("base64");

  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return sessionData;
}

/**
 * Retrieves the current session from cookies
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }

    const decoded = Buffer.from(sessionCookie.value, "base64").toString("utf-8");
    const session: SessionData = JSON.parse(decoded);
    return session;
  } catch (err) {
    return null;
  }
}

/**
 * Clears the session cookie
 */
export async function destroySession(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Enforces role authorization check
 */
export async function requireAuth(allowedRoles?: Role[]): Promise<{ authorized: boolean; user: SessionData | null; error?: string }> {
  const session = await getSession();
  if (!session) {
    return { authorized: false, user: null, error: "Akses ditolak: Anda harus login terlebih dahulu." };
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    return {
      authorized: false,
      user: session,
      error: `Akses ditolak: Peran ${session.role} tidak memiliki izin untuk aksi ini. Diperlukan: ${allowedRoles.join(", ")}.`,
    };
  }

  return { authorized: true, user: session };
}
