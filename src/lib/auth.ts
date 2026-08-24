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
  projectIds?: string[];
  createdAt: number;
}

import crypto from "crypto";

const SESSION_SECRET = process.env.SESSION_SECRET || "sitetracker-cmd-sec-key-2026-auth-prod";

function signPayload(payloadStr: string): string {
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payloadStr)
    .digest("hex");
  return `${payloadStr}.${signature}`;
}

function verifyAndExtractPayload(signedToken: string): string | null {
  const parts = signedToken.split(".");
  if (parts.length !== 2) {
    // Fallback: Check if it's an un-signed base64 string during migration
    try {
      JSON.parse(Buffer.from(signedToken, "base64").toString("utf-8"));
      return signedToken;
    } catch {
      return null;
    }
  }

  const [payloadStr, providedSignature] = parts;
  const expectedSignature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payloadStr)
    .digest("hex");

  if (crypto.timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature))) {
    return payloadStr;
  }
  return null;
}

/**
 * Creates and sets the signed session cookie (HTTP-only)
 */
export async function setSession(user: User): Promise<SessionData> {
  const sessionData: SessionData = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phoneNumber: user.phoneNumber,
    projectId: user.projectId || (user.projectIds && user.projectIds.length > 0 ? user.projectIds[0] : null),
    projectIds: user.projectIds || (user.projectId ? [user.projectId] : []),
    createdAt: Date.now(),
  };

  const base64Data = Buffer.from(JSON.stringify(sessionData)).toString("base64");
  const signedToken = signPayload(base64Data);

  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, signedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return sessionData;
}

/**
 * Retrieves and cryptographically validates the current session from cookies
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }

    const payload = verifyAndExtractPayload(sessionCookie.value);
    if (!payload) {
      return null;
    }

    const decoded = Buffer.from(payload, "base64").toString("utf-8");
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
