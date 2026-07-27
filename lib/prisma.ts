import { PrismaClient } from "@prisma/client";

// Refuse to let a dev server touch the production database once PROD_DB_HOST
// is set (do that after creating a Neon dev branch and pointing .env.local's
// DATABASE_URL at it). Until then this guard is dormant.
if (
  process.env.NODE_ENV !== "production" &&
  process.env.PROD_DB_HOST &&
  process.env.DATABASE_URL?.includes(process.env.PROD_DB_HOST)
) {
  throw new Error("Dev server refuses to run against the production database.");
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
