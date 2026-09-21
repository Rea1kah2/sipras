"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  buatSesi,
  buatTokenResetSandi,
  cocokSandi,
  hapusSesi,
  hashSandi,
  verifikasiTokenResetSandi,
} from "@/lib/auth";
import { kirimNotifikasi } from "@/lib/notifikasi";
import {
  daftarSchema,
  errorField,
  gagal,
  lupaSandiSchema,
  masukSchema,
  resetSandiSchema,
} from "@/lib/validasi";
import type { HasilAksi } from "@/lib/validasi";

export type StatusForm = HasilAksi<null> | null;

export async function aksiMasuk(
  _sebelum: StatusForm,
  data: FormData
): Promise<StatusForm> {
  const hasil = masukSchema.safeParse({
    email: data.get("email"),
    sandi: data.get("sandi"),
  });
  if (!hasil.success) {
    return gagal("Periksa lagi isian kamu.", errorField(hasil.error));
  }

  const user = await prisma.user.findUnique({
    where: { email: hasil.data.email },
    select: {
      id: true,
      nama: true,
      email: true,
      peran: true,
      password: true,
      aktif: true,
    },
  });

  // Pesan sengaja sama untuk email tidak terdaftar dan sandi salah, supaya
  // tidak bisa dipakai menebak email mana yang punya akun.
  const pesanUmum = "Email atau kata sandi salah.";
  if (!user) return gagal(pesanUmum);
  if (!(await cocokSandi(hasil.data.sandi, user.password))) return gagal(pesanUmum);
  if (!user.aktif) {
    return gagal("Akun ini dinonaktifkan. Hubungi petugas Sarpras.");
  }

  await buatSesi({
    id: user.id,
    nama: user.nama,
    email: user.email,
    peran: user.peran,
  });

  // Penanda ?sambut= dibaca ModalSambutan di layout aplikasi untuk
  // memunculkan ucapan, lalu dibuang lagi dari URL saat modal ditutup.
  redirect(user.peran === "ADMIN" ? "/admin?sambut=masuk" : "/dasbor?sambut=masuk");
}

export async function aksiDaftar(
  _sebelum: StatusForm,
  data: FormData
): Promise<StatusForm> {
  const hasil = daftarSchema.safeParse({
    nama: data.get("nama"),
    identitas: data.get("identitas"),
    email: data.get("email"),
    whatsapp: data.get("whatsapp"),
    unit: data.get("unit"),
    sandi: data.get("sandi"),
    ulangiSandi: data.get("ulangiSandi"),
    setuju: data.get("setuju") === "on",
  });
  if (!hasil.success) {
    return gagal("Periksa lagi isian kamu.", errorField(hasil.error));
  }

  const sudahAda = await prisma.user.findUnique({
    where: { email: hasil.data.email },
    select: { id: true },
  });
  if (sudahAda) {
    return gagal("Email ini sudah terdaftar.", {
      email: ["Email ini sudah terdaftar. Coba masuk saja."],
    });
  }

  // Self register selalu jadi PEMINJAM. Akun admin dibuat lewat seed.
  const user = await prisma.user.create({
    data: {
      nama: hasil.data.nama,
      identitas: hasil.data.identitas,
      email: hasil.data.email,
      whatsapp: hasil.data.whatsapp,
      unit: hasil.data.unit,
      password: await hashSandi(hasil.data.sandi),
      peran: "PEMINJAM",
    },
    select: { id: true, nama: true, email: true, peran: true },
  });

  await buatSesi(user);
  redirect("/dasbor?sambut=daftar");
}

export async function aksiKeluar(): Promise<void> {
  await hapusSesi();
  redirect("/masuk?sambut=keluar");
}

// ── lupa kata sandi ────────────────────────────────────────────────────
// Kunci kamus dan waktu cooldown dipakai dua kali (kirim dan cek), jadi
// ditulis sekali di sini supaya tidak bisa mencar beda.
const KUNCI_LUPA_SANDI_DIMINTA = "lupaSandi.diminta";
const COOLDOWN_LUPA_SANDI_MS = 60_000;

export async function aksiMintaResetSandi(
  _sebelum: StatusForm,
  data: FormData
): Promise<StatusForm> {
  const hasil = lupaSandiSchema.safeParse({ email: data.get("email") });
  if (!hasil.success) {
    return gagal("Periksa lagi isian kamu.", errorField(hasil.error));
  }

  // Balasan SELALU sama, ada akunnya atau tidak, aktif atau tidak, kena
  // cooldown atau tidak. Prinsipnya sama dengan aksiMasuk: kalau balasannya
  // beda beda, itu sendiri sudah bocor jadi alat menebak email terdaftar.
  const pesanSukses =
    "Kalau email itu terdaftar, tautan reset kata sandi sudah dikirim.";

  const user = await prisma.user.findUnique({
    where: { email: hasil.data.email },
    select: { id: true, password: true, aktif: true },
  });

  if (user && user.aktif) {
    const kenaCooldown = await prisma.notifikasi.findFirst({
      where: {
        userId: user.id,
        kunci: KUNCI_LUPA_SANDI_DIMINTA,
        dibuatPada: { gte: new Date(Date.now() - COOLDOWN_LUPA_SANDI_MS) },
      },
      select: { id: true },
    });

    if (!kenaCooldown) {
      const token = await buatTokenResetSandi(user.id, user.password);
      await kirimNotifikasi({
        userId: user.id,
        judul: "Tautan reset kata sandi",
        isi: "Klik tautan di email untuk membuat kata sandi baru. Tautan ini berlaku 20 menit dan hanya bisa dipakai sekali. Kalau kamu tidak meminta ini, abaikan saja email ini.",
        kunci: KUNCI_LUPA_SANDI_DIMINTA,
        tautan: `/reset-sandi?token=${token}`,
        email: true,
      });
    }
  }

  return { ok: true, data: null, pesan: pesanSukses };
}

export async function aksiResetSandi(
  _sebelum: StatusForm,
  data: FormData
): Promise<StatusForm> {
  const hasil = resetSandiSchema.safeParse({
    token: data.get("token"),
    sandiBaru: data.get("sandiBaru"),
    ulangiSandi: data.get("ulangiSandi"),
  });
  if (!hasil.success) {
    return gagal("Periksa lagi isian kamu.", errorField(hasil.error));
  }

  // Pesan yang sama untuk kedaluwarsa, rusak, ATAU sudah pernah dipakai:
  // membedakannya cuma membocorkan detail yang tidak berguna bagi pemilik
  // akun yang sah, dan berguna bagi yang bukan.
  const diverifikasi = await verifikasiTokenResetSandi(hasil.data.token);
  if (!diverifikasi) {
    return gagal(
      "Tautan ini tidak valid atau sudah kedaluwarsa. Minta tautan baru dari halaman lupa kata sandi."
    );
  }

  await prisma.user.update({
    where: { id: diverifikasi.userId },
    data: { password: await hashSandi(hasil.data.sandiBaru) },
  });

  // In-app saja, bukan email: pemilik akun sedang berada tepat di alur ini,
  // notifikasi lewat lonceng cukup untuk transparansi kalau bukan dia yang
  // memintanya.
  await kirimNotifikasi({
    userId: diverifikasi.userId,
    judul: "Kata sandi kamu sudah diganti",
    isi: "Kata sandi akun kamu baru saja diganti lewat tautan lupa kata sandi. Kalau ini bukan kamu, segera hubungi petugas Sarpras.",
    kunci: "lupaSandi.selesai",
  });

  return {
    ok: true,
    data: null,
    pesan: "Kata sandi kamu berhasil diganti. Silakan masuk dengan kata sandi barumu.",
  };
}
