import { KondisiKembali, Peran, StatusPengajuan } from "@/generated/prisma/enums";

export const LABEL_KONDISI: Record<KondisiKembali, string> = {
  BAIK: "Baik, tanpa kerusakan",
  RUSAK_RINGAN: "Ada kerusakan ringan",
  RUSAK_HILANG: "Rusak atau hilang",
};

export const URUT_KONDISI: KondisiKembali[] = ["BAIK", "RUSAK_RINGAN", "RUSAK_HILANG"];

/**
 * Mesin keadaan pengajuan. SEMUA perubahan status wajib lewat bolehPindah().
 * Tanpa ini, satu endpoint yang lupa dijaga jadi lubang paling awal
 * ditemukan penguji.
 *
 *   MENUNGGU ──▶ DISETUJUI ──▶ DIPINJAM ──▶ DIKEMBALIKAN ──▶ SELESAI
 *        └────▶ DITOLAK
 */

/**
 * Setiap perpindahan status punya pelakunya, dan pelakunya selalu ORANG.
 *
 * Dulu ada aktor "SISTEM" untuk perpindahan otomatis saat tanggal mulai tiba.
 * Aktor itu dihapus bersama otomatisasinya, karena otomatisasi itu menyatakan
 * barang sedang dipinjam walau tidak ada yang pernah mengambilnya. Sekarang
 * DISETUJUI baru jadi DIPINJAM setelah admin menyatakan barangnya diserahkan,
 * jadi tiap baris RiwayatStatus selalu bisa ditunjuk siapa yang bertanggung
 * jawab. Itu juga yang membuat laporan peminjaman bisa dipercaya.
 */
export type Aktor = Peran;

const TRANSISI: Record<StatusPengajuan, Partial<Record<StatusPengajuan, Aktor[]>>> = {
  MENUNGGU: {
    DISETUJUI: ["ADMIN"],
    DITOLAK: ["ADMIN"],
  },
  DISETUJUI: {
    // Hanya lewat serah terima yang dinyatakan admin di /admin/serah.
    DIPINJAM: ["ADMIN"],
    DITOLAK: ["ADMIN"],
  },
  DIPINJAM: {
    // Satu-satunya perpindahan yang boleh dilakukan peminjam.
    DIKEMBALIKAN: ["PEMINJAM", "ADMIN"],
  },
  DIKEMBALIKAN: {
    SELESAI: ["ADMIN"],
  },
  DITOLAK: {},
  SELESAI: {},
};

export function bolehPindah(
  dari: StatusPengajuan,
  ke: StatusPengajuan,
  aktor: Aktor
): boolean {
  return TRANSISI[dari]?.[ke]?.includes(aktor) ?? false;
}

export function alasanTolakPindah(
  dari: StatusPengajuan,
  ke: StatusPengajuan,
  aktor: Aktor
): string | null {
  if (bolehPindah(dari, ke, aktor)) return null;

  // Biasanya terjadi karena form dikirim dua kali atau tab lama disubmit
  // ulang, jadi sebut keadaannya apa adanya alih alih bilang "tidak bisa
  // jadi X" padahal sudah X.
  if (dari === ke) {
    return `Pengajuan ini sudah berstatus ${LABEL_STATUS[dari].toLowerCase()}.`;
  }

  const tujuanSah = Object.keys(TRANSISI[dari] ?? {});
  if (tujuanSah.length === 0) {
    return `Pengajuan berstatus ${LABEL_STATUS[dari].toLowerCase()} sudah final dan tidak bisa diubah lagi.`;
  }
  if (!tujuanSah.includes(ke)) {
    return `Status ${LABEL_STATUS[dari].toLowerCase()} tidak bisa langsung jadi ${LABEL_STATUS[ke].toLowerCase()}.`;
  }
  return "Kamu tidak punya hak untuk mengubah status ini.";
}

/** Aset dianggap terpakai (mengurangi ketersediaan) pada status ini saja. */
export const STATUS_MEMAKAI_ASET: StatusPengajuan[] = ["DISETUJUI", "DIPINJAM"];

/** Masih berjalan dari sudut pandang peminjam. */
export const STATUS_BERJALAN: StatusPengajuan[] = [
  "MENUNGGU",
  "DISETUJUI",
  "DIPINJAM",
  "DIKEMBALIKAN",
];

export const LABEL_STATUS: Record<StatusPengajuan, string> = {
  MENUNGGU: "Menunggu review",
  DISETUJUI: "Disetujui",
  DITOLAK: "Ditolak",
  DIPINJAM: "Sedang dipinjam",
  DIKEMBALIKAN: "Menunggu verifikasi",
  SELESAI: "Selesai",
};

/**
 * Badge dibedakan tiga cara sekaligus: warna, isian (lembut/garis/solid),
 * dan titik. Dengan begitu tetap terbaca oleh pengguna buta warna dan saat
 * dicetak hitam putih. Makin gelap dan makin solid berarti makin dekat ke
 * akhir alur.
 */
export type GayaBadge = {
  latar: string;
  teks: string;
  titik: string;
  garis?: string;
};

// Isian memakai tingkat 300, bukan 200. Tingkat 200 terbaca sebagai pastel
// dan membuat halaman terasa pudar, padahal badge status muncul di hampir
// setiap layar. Teksnya turun ke 900 supaya kontrasnya tetap aman.
export const GAYA_STATUS: Record<StatusPengajuan, GayaBadge> = {
  MENUNGGU: {
    latar: "var(--color-neutral-300)",
    teks: "var(--color-neutral-900)",
    titik: "var(--color-neutral-600)",
  },
  DISETUJUI: {
    latar: "var(--color-accent-2-300)",
    teks: "var(--color-accent-2-900)",
    titik: "var(--color-accent-2-700)",
  },
  DIPINJAM: {
    latar: "var(--color-warn-300)",
    teks: "var(--color-warn-900)",
    titik: "var(--color-warn-700)",
  },
  DIKEMBALIKAN: {
    latar: "transparent",
    teks: "var(--color-accent-2-900)",
    titik: "var(--color-accent-2-700)",
    garis: "var(--color-accent-2-600)",
  },
  SELESAI: {
    latar: "var(--color-accent-2-700)",
    teks: "var(--color-accent-2-100)",
    titik: "var(--color-accent-2-100)",
  },
  DITOLAK: {
    latar: "var(--color-danger-700)",
    teks: "var(--color-danger-100)",
    titik: "var(--color-danger-100)",
  },
};

/** Urutan langkah untuk garis waktu di kartu pengajuan. */
export const LANGKAH_ALUR: { status: StatusPengajuan; label: string }[] = [
  { status: "MENUNGGU", label: "Diajukan" },
  { status: "DISETUJUI", label: "Disetujui" },
  { status: "DIPINJAM", label: "Dipinjam" },
  { status: "SELESAI", label: "Selesai" },
];

/** Indeks langkah yang sudah tercapai, untuk mewarnai garis waktu. */
export function indeksLangkah(status: StatusPengajuan): number {
  switch (status) {
    case "MENUNGGU":
      return 0;
    case "DISETUJUI":
      return 1;
    case "DIPINJAM":
    case "DIKEMBALIKAN":
      return 2;
    case "SELESAI":
      return 3;
    case "DITOLAK":
      return 0;
  }
}
