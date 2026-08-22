"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buatSesi, cocokSandi, hapusSesi, hashSandi } from "@/lib/auth";
import { daftarSchema, errorField, gagal, masukSchema } from "@/lib/validasi";
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
