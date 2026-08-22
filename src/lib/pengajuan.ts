import type { KlienDB } from "@/lib/ketersediaan";

/** Ringkasan item satu pengajuan: "Proyektor ×2 + Ruang Seminar B2". */
export function teksItem(
  items: { namaAset: string; jumlah: number; aset?: { tipe: string } | null }[]
): string {
  return items
    .map((i) =>
      i.jumlah > 1 && i.aset?.tipe !== "RUANG"
        ? `${i.namaAset} ×${i.jumlah}`
        : i.namaAset
    )
    .join(" + ");
}

/** Bentuk data pengajuan yang dipakai hampir semua layar. */
export const PILIH_PENGAJUAN = {
  id: true,
  kode: true,
  mulai: true,
  selesai: true,
  namaKegiatan: true,
  keperluan: true,
  status: true,
  catatanAdmin: true,
  diajukanPada: true,
  pemohon: { select: { id: true, nama: true, unit: true, email: true, whatsapp: true } },
  items: {
    select: {
      id: true,
      jumlah: true,
      namaAset: true,
      asetId: true,
      aset: { select: { id: true, tipe: true, kategori: true, lokasi: true, stok: true, kapasitas: true, foto: true } },
    },
  },
} as const;

/**
 * Nomor pengajuan berurutan per tahun: PJ-2026-0143.
 * Dihitung di dalam transaksi supaya dua pengajuan bersamaan tidak bisa
 * mendapat nomor yang sama.
 */
export async function kodeBerikutnya(db: KlienDB): Promise<string> {
  const tahun = new Date().getUTCFullYear();
  const awalan = `PJ-${tahun}-`;

  const terakhir = await db.pengajuan.findFirst({
    where: { kode: { startsWith: awalan } },
    orderBy: { kode: "desc" },
    select: { kode: true },
  });

  const urut = terakhir ? Number(terakhir.kode.slice(awalan.length)) + 1 : 1;
  return awalan + String(urut).padStart(4, "0");
}

/*
 * majukanYangJatuhTempo() SUDAH DIHAPUS, dan alasannya perlu diingat supaya
 * tidak dibangun ulang.
 *
 * Dulu fungsi ini memindahkan DISETUJUI menjadi DIPINJAM begitu tanggal mulai
 * tiba, dipanggil saat halaman dibuka. Empat cacatnya nyata:
 *
 *   1. Ia menyatakan barang SEDANG DIPINJAM walau tidak ada satu pun manusia
 *      yang pernah menyerahkannya. Laporan peminjaman jadi ikut berbohong.
 *   2. Zona waktunya salah. Fungsi ini memakai komponen UTC sedangkan seluruh
 *      sistem lain memakai WIB lewat hariIniISO(). Setiap hari dari 00.00
 *      sampai 06.59 WIB keduanya tidak sepakat soal hari ini.
 *   3. Ia hanya dipanggil dari 4 halaman. Peminjam yang langsung membuka
 *      /pengajuan/[id] bisa tidak melihat tombol Ajukan pengembalian, karena
 *      halaman itu tidak pernah memanggilnya.
 *   4. Ia menulis ke basis data saat request GET, pola yang sudah sengaja
 *      dihindari di ambilPengaturan() pada lib/penutupan.ts.
 *
 * Penggantinya: admin menyatakan serah terima di /admin/serah. Perpindahannya
 * jadi punya pelaku yang bisa ditunjuk, dan keempat cacat di atas hilang
 * bersama fungsinya, bukan ditambal satu per satu.
 */
