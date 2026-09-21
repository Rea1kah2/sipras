import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hash, compare } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { createHash } from "node:crypto";
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

// ── reset kata sandi ───────────────────────────────────────────────────
const PENERBIT_RESET = "sipras-reset-sandi";
const UMUR_TOKEN_RESET = "20m";

/** Sidik jari pendek dari hash sandi saat ini, bukan hash itu sendiri. */
function sidikSandi(hashSandi: string): string {
  return createHash("sha256").update(hashSandi).digest("hex").slice(0, 16);
}

/**
 * Token reset kata sandi. Sengaja terpisah dari token sesi: klaim `purpose`
 * dan `issuer`-nya berbeda supaya satu jenis token mustahil dipakai sebagai
 * jenis yang lain walau kuncinya sama.
 *
 * Tidak ada tabel atau kolom baru untuk menyimpan token ini. Klaim `fp`
 * adalah sidik jari hash sandi PENGGUNA SAAT TOKEN DIBUAT. Begitu sandinya
 * berubah, sidik jarinya ikut berubah, dan token lama otomatis gagal
 * diverifikasi lagi, persis seperti token yang sudah dipakai. Jadi token
 * ini otomatis sekali pakai tanpa perlu daftar token yang sudah terpakai.
 */
export async function buatTokenResetSandi(
  userId: string,
  hashSandiSaatIni: string
): Promise<string> {
  return new SignJWT({ fp: sidikSandi(hashSandiSaatIni) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(PENERBIT_RESET)
    .setIssuedAt()
    .setExpirationTime(UMUR_TOKEN_RESET)
    .sign(kunci());
}

/**
 * Verifikasi token reset. Selalu mengambil ulang pengguna dari basis data
 * supaya sidik jari dicocokkan dengan hash sandi yang BENAR BENAR berlaku
 * sekarang, bukan yang tersimpan di dalam token.
 */
export async function verifikasiTokenResetSandi(
  token: string
): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, kunci(), { issuer: PENERBIT_RESET });
    const userId = payload.sub;
    const fp = payload.fp;
    if (!userId || typeof fp !== "string") return null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true, aktif: true },
    });
    if (!user || !user.aktif) return null;
    if (sidikSandi(user.password) !== fp) return null;

    return { userId };
  } catch {
    // Token kedaluwarsa, tanda tangannya tidak cocok, atau issuer beda.
    return null;
  }
}

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
