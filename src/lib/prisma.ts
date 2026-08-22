import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 tidak lagi konek sendiri lewat connection string. Koneksi
// ditangani driver adapter (node-postgres di sini).
//
// Satu instance dipakai ulang antar hot-reload dev, supaya tidak membuka
// pool baru tiap kali file berubah dan menghabiskan koneksi Postgres.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function buatClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL belum diisi. Salin .env.example jadi .env lalu isi connection string Postgres."
    );
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? buatClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
