/**
 * Neon Auth (Managed Better Auth) Integration Module
 * SiteTracker CMD Construction Patrol Management System
 */

export interface NeonAuthSignUpPayload {
  email: string;
  password: string;
  name: string;
}

export interface NeonAuthSignInPayload {
  email: string;
  password: string;
}

export interface NeonAuthResult {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  token?: string;
  rawResponse?: any;
}

/**
 * Mengecek apakah variabel lingkungan Neon Auth sudah dikonfigurasi di .env
 */
export function isNeonAuthConfigured(): boolean {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  return Boolean(
    baseUrl &&
      baseUrl.trim().length > 0 &&
      !baseUrl.includes("your_neon_auth_") &&
      (baseUrl.startsWith("http://") || baseUrl.startsWith("https://"))
  );
}

/**
 * Mendapatkan status konfigurasi layanan Neon Auth
 */
export function getNeonAuthServiceStatus(): {
  isConfigured: boolean;
  baseUrl: string;
  provider: string;
} {
  const configured = isNeonAuthConfigured();
  return {
    isConfigured: configured,
    baseUrl: process.env.NEON_AUTH_BASE_URL?.trim() || "Belum diatur di .env",
    provider: configured
      ? "Neon Auth (Managed Better Auth Live Service)"
      : "Database Neon Direct (Mode Fallback Siap Pakai)",
  };
}

import { headers } from "next/headers";

/**
 * Mendapatkan origin URL aplikasi saat ini (misal http://localhost:3000 atau domain production)
 */
function getAppOrigin(): string {
  try {
    const headersList = headers();
    const host = headersList.get("x-forwarded-host") || headersList.get("host");
    const proto = headersList.get("x-forwarded-proto") || "http";
    if (host) {
      return `${proto}://${host}`;
    }
  } catch {
    // Di luar konteks request Next.js
  }
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

/**
 * Mendaftarkan pengguna baru (Sign Up) menggunakan Neon Auth API (Better Auth)
 */
export async function signUpWithNeonAuth(
  payload: NeonAuthSignUpPayload
): Promise<NeonAuthResult> {
  const baseUrl = process.env.NEON_AUTH_BASE_URL?.trim().replace(/\/$/, "");

  if (!isNeonAuthConfigured() || !baseUrl) {
    // Mode fallback: Mengembalikan sinyal fallback jika Neon Auth URL belum diisi di .env
    return {
      success: true,
      message:
        "Registrasi diproses langsung ke Database Neon PostgreSQL (NEON_AUTH_BASE_URL belum diatur di .env).",
      user: {
        id: "usr-" + Date.now().toString().slice(-6),
        email: payload.email.toLowerCase().trim(),
        name: payload.name.trim(),
      },
    };
  }

  try {
    // Standard Better Auth / Neon Auth Sign-up endpoint
    const endpoint = `${baseUrl}/sign-up/email`;
    const origin = getAppOrigin();

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Origin: origin,
        Referer: `${origin}/login`,
      },
      body: JSON.stringify({
        email: payload.email.toLowerCase().trim(),
        password: payload.password,
        name: payload.name.trim(),
        callbackURL: `${origin}/login`,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      let errMsg =
        data?.message ||
        data?.error ||
        `Gagal mendaftar via Neon Auth (Status: ${response.status})`;

      if (errMsg.toLowerCase().includes("domain") || errMsg.toLowerCase().includes("origin")) {
        errMsg += `. Pastikan origin ${origin} telah ditambahkan ke daftar Trusted Domains di Neon Console > Auth > Settings.`;
      }

      return {
        success: false,
        message: `[Neon Auth] ${errMsg}`,
        rawResponse: data,
      };
    }

    return {
      success: true,
      message: "Akun berhasil didaftarkan melalui layanan Neon Auth!",
      user: data?.user || {
        id: data?.id || "usr-" + Date.now().toString().slice(-6),
        email: payload.email,
        name: payload.name,
      },
      token: data?.token || data?.session?.token,
      rawResponse: data,
    };
  } catch (err: any) {
    return {
      success: false,
      message:
        "Gagal menghubungi server Neon Auth: " + (err.message || "Network error"),
    };
  }
}

/**
 * Melakukan verifikasi login (Sign In) menggunakan Neon Auth API
 */
export async function signInWithNeonAuth(
  payload: NeonAuthSignInPayload
): Promise<NeonAuthResult> {
  const baseUrl = process.env.NEON_AUTH_BASE_URL?.trim().replace(/\/$/, "");

  if (!isNeonAuthConfigured() || !baseUrl) {
    return {
      success: true,
      message: "Verifikasi dilakukan melalui database Neon.",
    };
  }

  try {
    const endpoint = `${baseUrl}/sign-in/email`;
    const origin = getAppOrigin();

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Origin: origin,
        Referer: `${origin}/login`,
      },
      body: JSON.stringify({
        email: payload.email.toLowerCase().trim(),
        password: payload.password,
        callbackURL: `${origin}/login`,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      let errMsg =
        data?.message ||
        data?.error ||
        `Email atau password salah pada Neon Auth (Status: ${response.status})`;

      return {
        success: false,
        message: `[Neon Auth] ${errMsg}`,
        rawResponse: data,
      };
    }

    return {
      success: true,
      message: "Berhasil masuk melalui Neon Auth!",
      user: data?.user,
      token: data?.token || data?.session?.token,
      rawResponse: data,
    };
  } catch (err: any) {
    return {
      success: false,
      message:
        "Gagal menghubungi server Neon Auth: " + (err.message || "Network error"),
    };
  }
}
