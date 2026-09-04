import { PrismaClient } from "@prisma/client";

// Normalize environment variables for Vercel + Neon integrations
if (!process.env.DATABASE_URL) {
  const fallbackUrl = process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;
  if (fallbackUrl) {
    process.env.DATABASE_URL = fallbackUrl;
  }
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
