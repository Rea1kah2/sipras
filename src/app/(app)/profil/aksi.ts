"use server";

import { refresh } from "next/cache";
import { prisma } from "@/lib/prisma";
import { buatSesi, cocokSandi, hashSandi, wajibLogin } from "@/lib/auth";
import { errorField, gagal, profilSchema, sandiSchema } from "@/lib/validasi";
import type { HasilAksi } from "@/lib/validasi";

export type StatusProfil = HasilAksi<null> | null;

export async function aksiSimpanProfil(
  _sebelum: StatusProfil,
  data: FormData
): Promise<StatusProfil> {
  // Identitas selalu dari sesi, tidak pernah dari input. Tanpa ini, siapa pun
  // bisa mengubah profil orang lain lewat POST langsung.
  const user = await wajibLogin();

  const hasil = profilSchema.safeParse({
    nama: data.get("nama"),
    whatsapp: data.get("whatsapp"),
    unit: data.get("unit"),
  });
  if (!hasil.success) {
    return gagal("Periksa lagi isian kamu.", errorField(hasil.error));
  }

  const baru = await prisma.user.update({
    where: { id: user.id },
    data: hasil.data,
    select: { id: true, nama: true, email: true, peran: true },
  });

  // Nama ikut tersimpan di dalam token sesi, jadi sesinya perlu dibuat ulang
  // supaya sapaan di header langsung memakai nama yang baru.
  await buatSesi(baru);

  refresh();
  return { ok: true, data: null, pesan: "Profil kamu tersimpan." };
}

export async function aksiUbahSandi(
  _sebelum: StatusProfil,
  data: FormData
): Promise<StatusProfil> {
  const user = await wajibLogin();

  const hasil = sandiSchema.safeParse({
    sandiLama: data.get("sandiLama"),
    sandiBaru: data.get("sandiBaru"),
    ulangiSandi: data.get("ulangiSandi"),
  });
  if (!hasil.success) {
    return gagal("Periksa lagi isian kamu.", errorField(hasil.error));
  }

  const akun = await prisma.user.findUnique({
    where: { id: user.id },
    select: { password: true },
  });
  if (!akun) return gagal("Akun tidak ditemukan.");

  // Kata sandi lama wajib dibuktikan, supaya sesi yang tertinggal terbuka di
  // komputer umum tidak bisa dipakai mengambil alih akun.
  if (!(await cocokSandi(hasil.data.sandiLama, akun.password))) {
    return gagal("Kata sandi saat ini salah.", {
      sandiLama: ["Kata sandi saat ini salah."],
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await hashSandi(hasil.data.sandiBaru) },
  });

  refresh();
  return { ok: true, data: null, pesan: "Kata sandi berhasil diganti." };
}
