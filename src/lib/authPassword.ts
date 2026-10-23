import crypto from "crypto";
import { prisma } from "./db";

/**
 * Meng-hash password menggunakan format scrypt Better Auth (salt:derivedKey hex)
 * N: 16384, r: 8, p: 1, keyLen: 64
 */
export function hashPasswordScrypt(password: string, saltHex?: string): Promise<string> {
  const salt = saltHex || crypto.randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password.normalize("NFKC"),
      salt,
      64,
      { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (err, derivedKey) => {
        if (err) return reject(err);
        resolve(`${salt}:${derivedKey.toString("hex")}`);
      }
    );
  });
}

/**
 * Memverifikasi plaintext password dengan hash scrypt (salt:keyHex)
 */
export function verifyPasswordScrypt(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash || !storedHash.includes(":")) return Promise.resolve(false);
  const [salt, keyHex] = storedHash.split(":");
  if (!salt || !keyHex) return Promise.resolve(false);

  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password.normalize("NFKC"),
      salt,
      64,
      { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (err, derivedKey) => {
        if (err) return reject(err);
        const storedKey = Buffer.from(keyHex, "hex");
        if (derivedKey.length !== storedKey.length) {
          return resolve(false);
        }
        resolve(crypto.timingSafeEqual(derivedKey, storedKey));
      }
    );
  });
}

/**
 * Memperbarui password pengguna langsung di skema neon_auth.account
 */
export async function updateNeonAuthAccountPassword(
  email: string,
  newPasswordPlain: string
): Promise<{ success: boolean; message: string }> {
  try {
    const cleanEmail = email.toLowerCase().trim();
    // 1. Dapatkan userId dari neon_auth.user atau public.users
    const authUsers: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, email FROM "neon_auth"."user" WHERE LOWER(email) = $1 LIMIT 1;`,
      cleanEmail
    );

    let neonUserId = authUsers && authUsers.length > 0 ? authUsers[0].id : null;

    // Jika belum ada di neon_auth.user, cek apakah ada di public.users
    if (!neonUserId) {
      const pubUser = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });
      if (!pubUser) {
        return { success: false, message: "Pengguna tidak ditemukan di database." };
      }

      // Buat entri di neon_auth.user
      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "neon_auth"."user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
           VALUES ($1::uuid, $2, $3, true, NOW(), NOW())
           ON CONFLICT ("id") DO NOTHING;`,
          pubUser.id,
          pubUser.name,
          cleanEmail
        );
        neonUserId = pubUser.id;
      } catch (e: any) {
        // Jika format ID bukan uuid, biarkan neon generate atau buat baru
        const generatedId: any[] = await prisma.$queryRawUnsafe(
          `INSERT INTO "neon_auth"."user" ("name", "email", "emailVerified", "createdAt", "updatedAt")
           VALUES ($1, $2, true, NOW(), NOW())
           ON CONFLICT ("email") DO UPDATE SET "name" = EXCLUDED."name"
           RETURNING id;`,
          pubUser.name,
          cleanEmail
        );
        neonUserId = generatedId?.[0]?.id;
      }
    }

    if (!neonUserId) {
      return { success: false, message: "Gagal menemukan atau mengaitkan ID Neon Auth." };
    }

    // 2. Hash password baru
    const hashedPassword = await hashPasswordScrypt(newPasswordPlain);

    // 3. Upsert ke neon_auth.account
    await prisma.$executeRawUnsafe(
      `INSERT INTO "neon_auth"."account" ("accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
       VALUES ($1, 'credential', $2::uuid, $3, NOW(), NOW())
       ON CONFLICT ("id") DO UPDATE SET "password" = $3, "updatedAt" = NOW();`,
      neonUserId,
      neonUserId,
      hashedPassword
    );

    // Pastikan juga jika sudah ada baris berdasarkan userId & providerId
    await prisma.$executeRawUnsafe(
      `UPDATE "neon_auth"."account" 
       SET "password" = $1, "updatedAt" = NOW() 
       WHERE "userId" = $2::uuid AND "providerId" = 'credential';`,
      hashedPassword,
      neonUserId
    );

    return { success: true, message: "Password berhasil diperbarui di database Neon Auth." };
  } catch (err: any) {
    console.error("Gagal mengupdate password di neon_auth:", err);
    return {
      success: false,
      message: err.message || "Gagal mengupdate password database.",
    };
  }
}
