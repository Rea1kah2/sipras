"use server";

import { refresh } from "next/cache";
import { prisma } from "@/lib/prisma";
import { wajibAdmin } from "@/lib/auth";
import { alasanTolakPindah, bolehPindah } from "@/lib/status";
import { kirimNotifikasi } from "@/lib/notifikasi";
import { errorField, gagal, verifikasiSchema } from "@/lib/validasi";
import type { HasilAksi } from "@/lib/validasi";

export type StatusVerifikasi = HasilAksi<null> | null;

export async function aksiVerifikasi(
  _sebelum: StatusVerifikasi,
  data: FormData
): Promise<StatusVerifikasi> {
  const admin = await wajibAdmin();

  const hasil = verifikasiSchema.safeParse({
    pengajuanId: data.get("pengajuanId"),
    hasil: data.get("hasil"),
    catatan: data.get("catatan") ?? "",
  });
  if (!hasil.success) {
    return gagal("Periksa lagi isian kamu.", errorField(hasil.error));
  }

  const sesuai = hasil.data.hasil === "SESUAI";

  const pengajuan = await prisma.pengajuan.findUnique({
    where: { id: hasil.data.pengajuanId },
    select: {
      id: true,
      kode: true,
      status: true,
      pemohonId: true,
      pengembalian: { select: { id: true } },
    },
  });
  if (!pengajuan) return gagal("Pengajuan tidak ditemukan.");

  if (!bolehPindah(pengajuan.status, "SELESAI", "ADMIN")) {
    return gagal(
      alasanTolakPindah(pengajuan.status, "SELESAI", "ADMIN") ??
        "Pengajuan ini tidak sedang menunggu verifikasi."
    );
  }
  if (!pengajuan.pengembalian) {
    return gagal("Data pengembaliannya belum ada, jadi belum bisa diverifikasi.");
  }

  const catatan =
    hasil.data.catatan ||
    (sesuai
      ? "Pengembalian diverifikasi, kondisi sesuai laporan."
      : "Ditutup dengan catatan kerusakan, perlu tindak lanjut perbaikan.");

  await prisma.$transaction(async (tx) => {
    await tx.pengajuan.update({
      where: { id: pengajuan.id },
      data: { status: "SELESAI", catatanAdmin: catatan },
    });

    await tx.pengembalian.update({
      where: { id: pengajuan.pengembalian!.id },
      data: {
        diverifikasi: true,
        verifikatorId: admin.id,
        diverifikasiPada: new Date(),
        catatanVerifikasi: catatan,
      },
    });

    await tx.riwayatStatus.create({
      data: {
        pengajuanId: pengajuan.id,
        dari: pengajuan.status,
        ke: "SELESAI",
        olehId: admin.id,
        catatan,
      },
    });
  });

  await kirimNotifikasi({
    userId: pengajuan.pemohonId,
    judul: `Pengajuan ${pengajuan.kode} selesai`,
    isi: sesuai
      ? "Pengembalian kamu sudah diverifikasi dan pengajuan ditutup. Terima kasih."
      : `Pengajuan ditutup dengan catatan: ${catatan}`,
    kunci: sesuai ? "verifikasi.sesuai" : "verifikasi.catatan",
    data: { kode: pengajuan.kode, catatan },
    tautan: "/pengajuan",
    email: true,
  });

  refresh();
  return {
    ok: true,
    data: null,
    pesan: `${pengajuan.kode} ditutup${sesuai ? "" : " dengan catatan kerusakan"}.`,
  };
}
