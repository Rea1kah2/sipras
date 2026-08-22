import { penggunaSaatIni } from "@/lib/auth";
import { LABEL_KONDISI, LABEL_STATUS } from "@/lib/status";
import { fmtTanggal } from "@/lib/waktu";
import { teksItem } from "@/lib/pengajuan";
import { ambilRiwayat, bacaFilter } from "../data";

/**
 * Unduhan CSV memakai kriteria yang sama persis dengan tabel di layar,
 * jadi isi berkas tidak pernah berbeda dari yang dilihat admin.
 */
export async function GET(request: Request) {
  // Route handler tidak ikut penjagaan layout, jadi perannya diperiksa
  // di sini sendiri.
  const user = await penggunaSaatIni();
  if (!user || user.peran !== "ADMIN") {
    return new Response("Akses ditolak.", { status: 403 });
  }

  const sp = new URL(request.url).searchParams;
  const filter = bacaFilter({
    q: sp.get("q") ?? undefined,
    periode: sp.get("periode") ?? undefined,
  });

  const baris = await ambilRiwayat(filter);

  const judul = [
    "Kode", "Peminjam", "Unit", "Kegiatan", "Item",
    "Mulai", "Selesai", "Dikembalikan", "Kondisi", "Status",
  ];

  const isi = baris.map((r) => [
    r.kode,
    r.pemohon.nama,
    r.pemohon.unit ?? "",
    r.namaKegiatan ?? "",
    teksItem(r.items),
    fmtTanggal(r.mulai),
    fmtTanggal(r.selesai),
    r.pengembalian ? fmtTanggal(r.pengembalian.tanggalKembali) : "",
    r.pengembalian ? LABEL_KONDISI[r.pengembalian.kondisiRingkas] : "",
    LABEL_STATUS[r.status],
  ]);

  // BOM di depan supaya Excel di Windows membaca UTF-8 dengan benar,
  // kalau tidak nama dengan aksen jadi berantakan.
  const csv =
    "﻿" +
    [judul, ...isi].map((b) => b.map(kutip).join(",")).join("\r\n");

  const nama = `riwayat-sipras-${filter.periode.toLowerCase()}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nama}"`,
    },
  });
}

/** Bungkus nilai yang mengandung koma, kutip, atau baris baru. */
function kutip(nilai: string): string {
  const s = String(nilai ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
