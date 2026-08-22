import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hash, compare } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { Peran } from "@/generated/prisma/enums";

const NAMA_COOKIE = "sipras_sesi";
const UMUR_SESI_DETIK = 60 * 60 * 24 * 7; // 7 hari

function kunci(): Uint8Array {
  const rahasia = process.env.SESSION_SECRET;
  if (!rahasia) {
    throw new Error(
      "SESSION_SECRET belum diisi di .env. Generate dengan: node -e \"console.log(require('crypto').randomBytes(32).toString('base64url'))\""
    );
  }
  return new TextEncoder().encode(rahasia);
}

export type Sesi = {
  id: string;
  nama: string;
  email: string;
  peran: Peran;
};

// ── password ────────────────────────────────────────────────────────────
export function hashSandi(sandi: string): Promise<string> {
  return hash(sandi, 10);
}

export function cocokSandi(sandi: string, hashed: string): Promise<boolean> {
  return compare(sandi, hashed);
}

// ── sesi ────────────────────────────────────────────────────────────────
export async function buatSesi(user: Sesi): Promise<void> {
  const token = await new SignJWT({
    nama: user.nama,
    email: user.email,
    peran: user.peran,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${UMUR_SESI_DETIK}s`)
    .sign(kunci());

  const jar = await cookies();
  jar.set(NAMA_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: UMUR_SESI_DETIK,
  });
}

export async function hapusSesi(): Promise<void> {
  const jar = await cookies();
  jar.delete(NAMA_COOKIE);
}

/**
 * Isi sesi dari cookie yang sudah diverifikasi tanda tangannya.
 * Di-cache per request supaya banyak komponen bisa memanggilnya tanpa
 * memverifikasi JWT berulang kali.
 */
export const bacaSesi = cache(async (): Promise<Sesi | null> => {
  const jar = await cookies();
  const token = jar.get(NAMA_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, kunci());
    if (!payload.sub) return null;
    return {
      id: payload.sub,
      nama: String(payload.nama ?? ""),
      email: String(payload.email ?? ""),
      peran: payload.peran as Peran,
    };
  } catch {
    // Token kedaluwarsa atau tanda tangannya tidak cocok.
    return null;
  }
});

/**
 * Pengguna yang sedang login, diambil ulang dari database. Dipakai kalau
 * butuh data terbaru (nama/peran bisa saja berubah setelah cookie dibuat)
 * atau kalau akunnya mungkin sudah dinonaktifkan.
 */
export const penggunaSaatIni = cache(async () => {
  const sesi = await bacaSesi();
  if (!sesi) return null;

  const user = await prisma.user.findUnique({
    where: { id: sesi.id },
    select: {
      id: true,
      nama: true,
      email: true,
      peran: true,
      whatsapp: true,
      unit: true,
      identitas: true,
      aktif: true,
      bahasa: true,
    },
  });

  if (!user || !user.aktif) return null;
  return user;
});

// ── penjaga rute ────────────────────────────────────────────────────────
export async function wajibLogin() {
  const user = await penggunaSaatIni();
  if (!user) redirect("/masuk");
  return user;
}

export async function wajibAdmin() {
  const user = await penggunaSaatIni();
  if (!user) redirect("/masuk");
  if (user.peran !== "ADMIN") redirect("/dasbor");
  return user;
}

export async function wajibPeminjam() {
  const user = await penggunaSaatIni();
  if (!user) redirect("/masuk");
  if (user.peran === "ADMIN") redirect("/admin");
  return user;
}

/** Inisial untuk avatar bulat di header. */
export function inisial(nama: string): string {
  return nama
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k[0]?.toUpperCase() ?? "")
    .join("");
}
