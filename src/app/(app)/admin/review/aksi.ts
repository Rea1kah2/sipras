"use server";

import { refresh } from "next/cache";
import { prisma } from "@/lib/prisma";
import { wajibAdmin } from "@/lib/auth";
import { alasanTolakPindah, bolehPindah } from "@/lib/status";
import { cekBentrok } from "@/lib/ketersediaan";
import { kirimNotifikasi } from "@/lib/notifikasi";
import { errorField, gagal, reviewSchema } from "@/lib/validasi";
import { fmtRentang , keISO} from "@/lib/waktu";
import type { HasilAksi } from "@/lib/validasi";

export type StatusReview = HasilAksi<null> | null;

export async function aksiReview(
  _sebelum: StatusReview,
  data: FormData
): Promise<StatusReview> {
  const admin = await wajibAdmin();

  const hasil = reviewSchema.safeParse({
    pengajuanId: data.get("pengajuanId"),
    keputusan: data.get("keputusan"),
    catatan: data.get("catatan") ?? "",
  });
  if (!hasil.success) {
    return gagal("Periksa lagi isian kamu.", errorField(hasil.error));
  }

  const setuju = hasil.data.keputusan === "SETUJU";
  const tujuan = setuju ? "DISETUJUI" : "DITOLAK";

  const pengajuan = await prisma.pengajuan.findUnique({
    where: { id: hasil.data.pengajuanId },
    select: {
      id: true,
      kode: true,
      status: true,
      mulai: true,
      selesai: true,
      pemohonId: true,
      items: { select: { asetId: true, jumlah: true } },
    },
  });
  if (!pengajuan) return gagal("Pengajuan tidak ditemukan.");

  if (!bolehPindah(pengajuan.status, tujuan, "ADMIN")) {
    return gagal(
      alasanTolakPindah(pengajuan.status, tujuan, "ADMIN") ??
        "Status pengajuan tidak memungkinkan keputusan ini."
    );
  }

  const catatan =
    hasil.data.catatan ||
    (setuju
      ? "Disetujui. Silakan koordinasi dengan petugas sarpras sebelum pengambilan."
      : "Ditolak karena jadwal atau ketersediaan tidak memungkinkan.");

  try {
    await prisma.$transaction(async (tx) => {
      // Menyetujui berarti aset benar benar dikunci, jadi ketersediaan
      // diperiksa ulang di dalam transaksi. Tanpa ini, dua admin yang
      // menyetujui dua pengajuan bentrok di detik yang sama sama sama lolos.
      if (setuju) {
        const bentrok = await cekBentrok(
          tx,
          pengajuan.items,
          pengajuan.mulai,
          pengajuan.selesai,
          pengajuan.id
        );
        if (bentrok.length > 0) {
          throw new BentrokError(bentrok.map((b) => b.pesan));
        }
      }

      await tx.pengajuan.update({
        where: { id: pengajuan.id },
        data: { status: tujuan, catatanAdmin: catatan },
      });

      await tx.riwayatStatus.create({
        data: {
          pengajuanId: pengajuan.id,
          dari: pengajuan.status,
          ke: tujuan,
          olehId: admin.id,
          catatan,
        },
      });
    });
  } catch (e) {
    if (e instanceof BentrokError) {
      return gagal(
        "Tidak bisa disetujui: asetnya sudah keburu dipakai pengajuan lain.",
        { bentrok: e.pesan }
      );
    }
    throw e;
  }

  await kirimNotifikasi({
    userId: pengajuan.pemohonId,
    judul: setuju
      ? `Pengajuan ${pengajuan.kode} disetujui`
      : `Pengajuan ${pengajuan.kode} ditolak`,
    isi: setuju
      ? `Pemakaian ${fmtRentang(pengajuan.mulai, pengajuan.selesai)} disetujui. ${catatan}`
      : catatan,
    kunci: setuju ? "review.disetujui" : "review.ditolak",

    data: {

      kode: pengajuan.kode,

      mulai: keISO(pengajuan.mulai),

      selesai: keISO(pengajuan.selesai),

      catatan,

    },

    tautan: "/pengajuan",
    email: true,
  });

  refresh();
  return { ok: true, data: null, pesan: setuju ? "Pengajuan disetujui." : "Pengajuan ditolak." };
}

class BentrokError extends Error {
  pesan: string[];
  constructor(pesan: string[]) {
    super("bentrok");
    this.pesan = pesan;
  }
}
