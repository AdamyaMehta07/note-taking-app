import { PrismaClient } from "@prisma/client";

// Next.js dev mode reloads modules often. Without this, every reload would
// open a brand new database connection and eventually exhaust the connection
// pool. So we stash the client on the global object and reuse it.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
