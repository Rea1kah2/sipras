"use server";

import { refresh } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashSandi, wajibAdmin } from "@/lib/auth";
import { buatSandiAcak } from "@/lib/sandi";
import { kirimNotifikasi } from "@/lib/notifikasi";
import {
  aktifSchema,
  errorField,
  gagal,
  peranSchema,
  resetSandiAdminSchema,
} from "@/lib/validasi";
import type { HasilAksi } from "@/lib/validasi";

export type StatusPengguna = HasilAksi<null> | null;

/**
 * Dua penjagaan yang harus hidup di server, bukan sekadar tombol yang
 * disembunyikan di UI:
 *
 * 1. Admin tidak bisa menurunkan atau menonaktifkan dirinya sendiri, supaya
 *    tidak ada yang tidak sengaja mengunci diri di luar sistem.
 * 2. Admin aktif terakhir tidak bisa diturunkan atau dinonaktifkan, supaya
 *    sistem tidak pernah kehabisan admin dan jadi mustahil dikelola.
 *
 * Keduanya diperiksa DI DALAM transaksi. Kalau hanya diperiksa sebelum
 * transaksi, dua admin yang saling menurunkan di detik yang sama bisa
 * sama sama lolos dan menyisakan nol admin.
 */

class TolakError extends Error {}

export async function aksiUbahPeran(
  _sebelum: StatusPengguna,
  data: FormData
): Promise<StatusPengguna> {
  const admin = await wajibAdmin();

  const hasil = peranSchema.safeParse({
    userId: data.get("userId"),
    peran: data.get("peran"),
  });
  if (!hasil.success) {
    return gagal("Data tidak valid.", errorField(hasil.error));
  }

  const { userId, peran } = hasil.data;

  if (userId === admin.id && peran === "PEMINJAM") {
    return gagal(
      "Kamu tidak bisa menurunkan peran akunmu sendiri. Minta admin lain yang melakukannya."
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, nama: true, peran: true, aktif: true },
      });
      if (!target) throw new TolakError("Pengguna tidak ditemukan.");
      if (target.peran === peran) {
        throw new TolakError(`${target.nama} memang sudah berperan sebagai ${labelPeran(peran)}.`);
      }

      if (peran === "PEMINJAM") {
        await pastikanBukanAdminTerakhir(tx, userId);
      }

      await tx.user.update({ where: { id: userId }, data: { peran } });
    });
  } catch (e) {
    if (e instanceof TolakError) return gagal(e.message);
    throw e;
  }

  refresh();
  return { ok: true, data: null, pesan: `Peran diubah jadi ${labelPeran(peran)}.` };
}

export async function aksiUbahAktif(
  _sebelum: StatusPengguna,
  data: FormData
): Promise<StatusPengguna> {
  const admin = await wajibAdmin();

  const hasil = aktifSchema.safeParse({
    userId: data.get("userId"),
    aktif: data.get("aktif"),
  });
  if (!hasil.success) {
    return gagal("Data tidak valid.", errorField(hasil.error));
  }

  const { userId } = hasil.data;
  const aktif = hasil.data.aktif === "ya";

  if (userId === admin.id && !aktif) {
    return gagal("Kamu tidak bisa menonaktifkan akunmu sendiri.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, nama: true, peran: true, aktif: true },
      });
      if (!target) throw new TolakError("Pengguna tidak ditemukan.");

      if (!aktif && target.peran === "ADMIN") {
        await pastikanBukanAdminTerakhir(tx, userId);
      }

      await tx.user.update({ where: { id: userId }, data: { aktif } });
    });
  } catch (e) {
    if (e instanceof TolakError) return gagal(e.message);
    throw e;
  }

  refresh();
  return {
    ok: true,
    data: null,
    pesan: aktif ? "Akun diaktifkan kembali." : "Akun dinonaktifkan.",
  };
}

/**
 * Reset kata sandi pengguna lain. Sistem yang membuat sandi barunya secara
 * acak, bukan admin yang mengetik, supaya tidak bergantung pada admin
 * mengarang sandi yang cukup kuat. Sandinya cuma tampil SEKALI di layar
 * admin lewat pesan sukses aksi ini, admin yang menyampaikannya sendiri ke
 * pengguna (lewat WhatsApp misalnya) karena email tidak bisa diandalkan
 * sampai ke sembarang alamat (lihat catatan EMAIL_UJI_KE di README).
 *
 * Target diri sendiri sengaja ditolak: sudah ada jalur self-service di
 * halaman Profil yang mewajibkan sandi lama, dan membiarkan dua jalur
 * ganti sandi yang berbeda untuk akun yang sama hanya menambah kebingungan.
 */
export async function aksiResetSandiPengguna(
  _sebelum: StatusPengguna,
  data: FormData
): Promise<StatusPengguna> {
  const admin = await wajibAdmin();

  const hasil = resetSandiAdminSchema.safeParse({ userId: data.get("userId") });
  if (!hasil.success) {
    return gagal("Data tidak valid.", errorField(hasil.error));
  }
  const { userId } = hasil.data;

  if (userId === admin.id) {
    return gagal("Gunakan halaman Profil untuk mengganti kata sandimu sendiri.");
  }

  const sandiBaru = buatSandiAcak();
  let namaTarget = "";

  try {
    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, nama: true },
      });
      if (!target) throw new TolakError("Pengguna tidak ditemukan.");
      namaTarget = target.nama;

      await tx.user.update({
        where: { id: userId },
        data: { password: await hashSandi(sandiBaru) },
      });
    });
  } catch (e) {
    if (e instanceof TolakError) return gagal(e.message);
    throw e;
  }

  // In-app saja, tanpa sandi plaintext-nya: pengguna perlu tahu sandinya
  // baru saja diganti, tapi sandi barunya disampaikan admin di luar sistem.
  await kirimNotifikasi({
    userId,
    judul: "Kata sandi kamu direset admin",
    isi: "Admin baru saja mengganti kata sandi akunmu. Hubungi admin untuk mendapatkan kata sandi barumu.",
    kunci: "pengguna.sandiDireset",
  });

  refresh();
  return {
    ok: true,
    data: null,
    pesan: `Kata sandi ${namaTarget} diganti jadi: ${sandiBaru}`,
  };
}

/**
 * Lempar TolakError kalau userId adalah satu satunya admin yang masih aktif.
 *
 * Baris admin dikunci lebih dulu dengan FOR UPDATE. Tanpa kunci itu, dua
 * admin yang saling menurunkan di detik yang sama sama sama membaca "masih
 * ada admin lain" lalu sama sama lolos, dan sistem berakhir tanpa admin
 * sama sekali. Menghitung saja tidak cukup di isolasi READ COMMITTED.
 */
async function pastikanBukanAdminTerakhir(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string
): Promise<void> {
  const terkunci = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "User"
    WHERE peran = 'ADMIN' AND aktif = true
    FOR UPDATE
  `;

  const adminLain = terkunci.filter((a) => a.id !== userId).length;
  if (adminLain === 0) {
    throw new TolakError(
      "Ini admin aktif terakhir. Angkat admin lain dulu, kalau tidak sistem jadi tidak punya pengelola sama sekali."
    );
  }
}

function labelPeran(peran: "ADMIN" | "PEMINJAM"): string {
  return peran === "ADMIN" ? "admin sarpras" : "peminjam";
}
