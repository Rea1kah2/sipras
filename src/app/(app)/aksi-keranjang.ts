"use server";

import { refresh } from "next/cache";
import { prisma } from "@/lib/prisma";
import { wajibPeminjam } from "@/lib/auth";
import { bacaKeranjang, tulisKeranjang } from "@/lib/keranjang";

/**
 * Semua aksi di sini memverifikasi sesi sendiri, sebab server action bisa
 * dipanggil lewat POST langsung, bukan hanya lewat tombol di UI.
 */

export async function tambahKeKeranjang(
  asetId: string,
  jumlah = 1
): Promise<void> {
  await wajibPeminjam();

  const aset = await prisma.aset.findUnique({
    where: { id: asetId },
    select: { id: true, tipe: true, stok: true, aktif: true },
  });
  if (!aset || !aset.aktif) return;

  const isi = await bacaKeranjang();
  const adaIndex = isi.findIndex((b) => b.asetId === asetId);

  if (adaIndex >= 0) {
    // Ruang tidak punya jumlah, satu ruang cuma bisa masuk sekali.
    if (aset.tipe === "RUANG") return;
    isi[adaIndex] = {
      asetId,
      jumlah: Math.min(aset.stok, isi[adaIndex].jumlah + jumlah),
    };
  } else {
    isi.push({
      asetId,
      jumlah: aset.tipe === "RUANG" ? 1 : Math.min(aset.stok, Math.max(1, jumlah)),
    });
  }

  await tulisKeranjang(isi);
  refresh();
}

export async function ubahJumlah(asetId: string, delta: number): Promise<void> {
  await wajibPeminjam();

  const aset = await prisma.aset.findUnique({
    where: { id: asetId },
    select: { stok: true, tipe: true },
  });
  if (!aset || aset.tipe === "RUANG") return;

  const isi = await bacaKeranjang();
  const i = isi.findIndex((b) => b.asetId === asetId);
  if (i < 0) return;

  isi[i] = {
    asetId,
    jumlah: Math.min(aset.stok, Math.max(1, isi[i].jumlah + delta)),
  };
  await tulisKeranjang(isi);
  refresh();
}

export async function hapusDariKeranjang(asetId: string): Promise<void> {
  await wajibPeminjam();
  const isi = await bacaKeranjang();
  await tulisKeranjang(isi.filter((b) => b.asetId !== asetId));
  refresh();
}

export async function kosongkanKeranjang(): Promise<void> {
  await wajibPeminjam();
  await tulisKeranjang([]);
  refresh();
}
