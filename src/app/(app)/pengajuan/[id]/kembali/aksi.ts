"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { wajibPeminjam } from "@/lib/auth";
import { alasanTolakPindah, bolehPindah } from "@/lib/status";
import { kabariAdmin, kirimNotifikasi } from "@/lib/notifikasi";
import { errorField, gagal, pengembalianSchema } from "@/lib/validasi";
import { dariISO } from "@/lib/waktu";
import type { KondisiKembali } from "@/generated/prisma/enums";
import type { HasilAksi } from "@/lib/validasi";

export type StatusKembali = HasilAksi<null> | null;

/** Kondisi terburuk menentukan ringkasan yang dilihat admin di antrean. */
const URUTAN_BURUK: KondisiKembali[] = ["BAIK", "RUSAK_RINGAN", "RUSAK_HILANG"];

export async function aksiKirimPengembalian(
  _sebelum: StatusKembali,
  data: FormData
): Promise<StatusKembali> {
  const user = await wajibPeminjam();

  const pengajuanId = String(data.get("pengajuanId") ?? "");

  // Kondisi per item dikirim sebagai kondisi:<pengajuanItemId>.
  const kondisi = [...data.entries()]
    .filter(([k]) => k.startsWith("kondisi:"))
    .map(([k, v]) => ({
      pengajuanItemId: k.slice("kondisi:".length),
      kondisi: String(v),
    }));

  const hasil = pengembalianSchema.safeParse({
    pengajuanId,
    tanggalKembali: data.get("tanggalKembali"),
    catatan: data.get("catatan") ?? "",
    kondisi,
  });
  if (!hasil.success) {
    return gagal("Periksa lagi isian kamu.", errorField(hasil.error));
  }

  const pengajuan = await prisma.pengajuan.findUnique({
    where: { id: hasil.data.pengajuanId },
    select: {
      id: true,
      kode: true,
      status: true,
      pemohonId: true,
      items: { select: { id: true } },
    },
  });

  // Kepemilikan diperiksa di server, bukan sekadar disembunyikan di UI.
  if (!pengajuan || pengajuan.pemohonId !== user.id) {
    return gagal("Pengajuan tidak ditemukan.");
  }

  if (!bolehPindah(pengajuan.status, "DIKEMBALIKAN", "PEMINJAM")) {
    return gagal(
      alasanTolakPindah(pengajuan.status, "DIKEMBALIKAN", "PEMINJAM") ??
        "Status pengajuan tidak memungkinkan pengembalian."
    );
  }

  // Hanya terima kondisi untuk item milik pengajuan ini.
  const idSah = new Set(pengajuan.items.map((i) => i.id));
  const baris = hasil.data.kondisi.filter((k) => idSah.has(k.pengajuanItemId));
  if (baris.length !== pengajuan.items.length) {
    return gagal("Kondisi tiap item wajib diisi.");
  }

  const terburuk = baris.reduce<KondisiKembali>(
    (buruk, b) =>
      URUTAN_BURUK.indexOf(b.kondisi as KondisiKembali) > URUTAN_BURUK.indexOf(buruk)
        ? (b.kondisi as KondisiKembali)
        : buruk,
    "BAIK"
  );

  await prisma.$transaction(async (tx) => {
    const kembali = await tx.pengembalian.create({
      data: {
        pengajuanId: pengajuan.id,
        tanggalKembali: dariISO(hasil.data.tanggalKembali),
        kondisiRingkas: terburuk,
        catatan: hasil.data.catatan || null,
        foto: [],
        items: {
          create: baris.map((b) => ({
            pengajuanItemId: b.pengajuanItemId,
            kondisi: b.kondisi as KondisiKembali,
          })),
        },
      },
      select: { id: true },
    });

    await tx.pengajuan.update({
      where: { id: pengajuan.id },
      data: { status: "DIKEMBALIKAN" },
    });

    await tx.riwayatStatus.create({
      data: {
        pengajuanId: pengajuan.id,
        dari: pengajuan.status,
        ke: "DIKEMBALIKAN",
        olehId: user.id,
        catatan: hasil.data.catatan || "Pengembalian diajukan peminjam.",
      },
    });

    return kembali;
  });

  // Notifikasi di luar transaksi supaya gagal kirim tidak membatalkan
  // pengembalian yang sudah tersimpan.
  await kirimNotifikasi({
    userId: user.id,
    judul: `Pengembalian ${pengajuan.kode} terkirim`,
    isi: "Menunggu admin memeriksa kondisi fisiknya. Kamu akan dikabari begitu pengajuan ditutup.",
    kunci: "kembali.terkirim",
    data: { kode: pengajuan.kode },
    tautan: "/pengajuan",
    email: true,
  });
  await kabariAdmin({
    judul: "Pengembalian menunggu verifikasi",
    isi: `${user.nama} menandai ${pengajuan.kode} sudah dikembalikan.`,
    kunci: "kembali.adminBaru",
    data: { kode: pengajuan.kode, nama: user.nama },
    tautan: "/admin/verifikasi",
  });

  redirect(`/pengajuan?kembali=${encodeURIComponent(pengajuan.kode)}`);
}
