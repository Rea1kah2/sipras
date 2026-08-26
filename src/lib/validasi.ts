import { z } from "zod";
import { hariIniISO } from "@/lib/waktu";
import { PANJANG_MINIMAL, PESAN_SANDI_LEMAH, cukupKuat } from "@/lib/sandi";

/**
 * Aturan kekuatan sandi memakai fungsi yang sama dengan bar di layar, jadi
 * apa yang dilihat pengguna dan apa yang diterima server tidak mungkin
 * berbeda. Berlaku saat membuat dan mengganti sandi, bukan saat masuk,
 * supaya akun lama tetap bisa login.
 */
const sandiBaru = z
  .string()
  .min(PANJANG_MINIMAL, `Kata sandi minimal ${PANJANG_MINIMAL} karakter`)
  .max(72)
  .refine(cukupKuat, { message: PESAN_SANDI_LEMAH });

/**
 * Skema dipakai DUA KALI untuk hal yang sama: di form (umpan balik cepat) dan
 * lagi di server action sebelum menyimpan, supaya validasi tidak bisa
 * dilewati dari klien.
 */

const iso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid");

export const daftarSchema = z
  .object({
    nama: z.string().trim().min(3, "Nama minimal 3 karakter").max(80),
    identitas: z.string().trim().min(3, "NIP / NUPTK wajib diisi").max(30),
    email: z.email("Format email tidak valid").toLowerCase(),
    whatsapp: z
      .string()
      .trim()
      .regex(/^[0-9+\s-]{9,20}$/, "Nomor WhatsApp tidak valid"),
    unit: z.string().trim().min(2, "Kelas / bidang tugas wajib diisi").max(80),
    sandi: sandiBaru,
    ulangiSandi: z.string(),
    setuju: z.literal(true, {
      message: "Kamu perlu menyetujui pernyataan tanggung jawab",
    }),
  })
  .refine((d) => d.sandi === d.ulangiSandi, {
    path: ["ulangiSandi"],
    message: "Ulangi kata sandi belum sama",
  });

export const masukSchema = z.object({
  email: z.email("Format email tidak valid").toLowerCase(),
  sandi: z.string().min(1, "Kata sandi wajib diisi"),
});

export const asetSchema = z
  .object({
    nama: z.string().trim().min(3, "Nama aset minimal 3 karakter").max(120),
    tipe: z.enum(["BARANG", "RUANG"]),
    kategori: z.string().trim().min(2, "Kategori wajib diisi").max(60),
    deskripsi: z.string().trim().max(1000).default(""),
    lokasi: z.string().trim().max(120).default(""),
    // Barang: jumlah unit. Ruang: kapasitas orang (0 = terbuka).
    kapasitasAtauStok: z.coerce
      .number()
      .int("Harus bilangan bulat")
      .min(0, "Tidak boleh negatif")
      .max(100_000),
  })
  .refine((d) => d.tipe === "RUANG" || d.kapasitasAtauStok >= 1, {
    path: ["kapasitasAtauStok"],
    message: "Stok barang minimal 1 unit",
  });

export const pengajuanSchema = z
  .object({
    namaKegiatan: z.string().trim().max(120).optional(),
    keperluan: z
      .string()
      .trim()
      .min(10, "Ceritakan keperluannya minimal 10 karakter")
      .max(1000),
    kontakWhatsapp: z
      .string()
      .trim()
      .regex(/^[0-9+\s-]{9,20}$/, "Nomor WhatsApp tidak valid"),
    mulai: iso,
    selesai: iso,
    setuju: z.literal(true, {
      message: "Centang pernyataan tanggung jawab dulu",
    }),
    items: z
      .array(
        z.object({
          asetId: z.string().min(1),
          jumlah: z.coerce.number().int().min(1).max(10_000),
        })
      )
      .min(1, "Tambahkan minimal satu barang atau ruang"),
  })
  .refine((d) => d.selesai >= d.mulai, {
    path: ["selesai"],
    message: "Tanggal kembali harus sama atau setelah tanggal pinjam",
  })
  .refine((d) => d.mulai >= hariIniISO(), {
    path: ["mulai"],
    message: "Tanggal pinjam tidak boleh di masa lalu",
  });

/**
 * Jam ditulis dengan titik, bukan titik dua, mengikuti lib/waktu.ts yang
 * sudah memformat stempel notifikasi sebagai "09.14". Satu konvensi jam di
 * seluruh sistem, jadi tidak ada layar yang terlihat memakai gaya lain.
 */
const jam = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3])\.[0-5]\d$/, "Tulis jam dalam bentuk 08.00");

export const pengaturanLayananSchema = z
  .object({
    // Daftar kosong akan menutup seluruh pekan dan membuat sistem tidak bisa
    // dipakai siapa pun. Ditolak di sini, bukan cuma disembunyikan di UI,
    // karena form bisa dikirim langsung lewat POST tanpa lewat layarnya.
    hariLayanan: z
      .array(z.coerce.number().int().min(0).max(6))
      .min(1, "Pilih minimal satu hari layanan"),
    jamBuka: jam,
    jamTutup: jam,
  })
  .refine((d) => d.jamTutup > d.jamBuka, {
    path: ["jamTutup"],
    message: "Jam selesai harus setelah jam mulai",
  });

export const penutupanSchema = z
  .object({
    tanggal: iso,
    // Kosong berarti satu hari saja. Diseragamkan jadi undefined supaya
    // pemakainya tidak perlu membedakan string kosong dari tidak diisi.
    tanggalAkhir: iso.optional().or(z.literal("").transform(() => undefined)),
    alasan: z
      .string()
      .trim()
      .min(3, "Tulis alasannya minimal 3 karakter")
      .max(120),
    jenis: z.enum(["LIBUR", "PERAWATAN", "LAIN"]),
  })
  .refine((d) => !d.tanggalAkhir || d.tanggalAkhir >= d.tanggal, {
    path: ["tanggalAkhir"],
    message: "Tanggal akhir harus sama atau setelah tanggal awal",
  })
  // Batas atas ada supaya satu penyerahan form tidak menulis ribuan baris.
  // 60 hari cukup untuk libur semester terpanjang.
  .refine(
    (d) =>
      !d.tanggalAkhir ||
      (Date.parse(`${d.tanggalAkhir}T00:00:00Z`) -
        Date.parse(`${d.tanggal}T00:00:00Z`)) /
        86_400_000 <
        60,
    { path: ["tanggalAkhir"], message: "Sekali tandai maksimal 60 hari" }
  );

export const reviewSchema = z.object({
  pengajuanId: z.string().min(1),
  keputusan: z.enum(["SETUJU", "TOLAK"]),
  catatan: z.string().trim().max(1000).default(""),
});

export const pengembalianSchema = z.object({
  pengajuanId: z.string().min(1),
  tanggalKembali: iso,
  catatan: z.string().trim().max(1000).default(""),
  kondisi: z
    .array(
      z.object({
        pengajuanItemId: z.string().min(1),
        kondisi: z.enum(["BAIK", "RUSAK_RINGAN", "RUSAK_HILANG"]),
      })
    )
    .min(1, "Kondisi tiap item wajib diisi"),
});

export const profilSchema = z.object({
  nama: z.string().trim().min(3, "Nama minimal 3 karakter").max(80),
  whatsapp: z
    .string()
    .trim()
    .regex(/^[0-9+\s-]{9,20}$/, "Nomor WhatsApp tidak valid"),
  unit: z.string().trim().min(2, "Kelas / bidang tugas wajib diisi").max(80),
});

export const sandiSchema = z
  .object({
    sandiLama: z.string().min(1, "Kata sandi saat ini wajib diisi"),
    sandiBaru,
    ulangiSandi: z.string(),
  })
  .refine((d) => d.sandiBaru === d.ulangiSandi, {
    path: ["ulangiSandi"],
    message: "Ulangi kata sandi belum sama",
  })
  .refine((d) => d.sandiBaru !== d.sandiLama, {
    path: ["sandiBaru"],
    message: "Kata sandi baru harus berbeda dari yang sekarang",
  });

export const peranSchema = z.object({
  userId: z.string().min(1),
  peran: z.enum(["PEMINJAM", "ADMIN"]),
});

export const aktifSchema = z.object({
  userId: z.string().min(1),
  aktif: z.enum(["ya", "tidak"]),
});

export const verifikasiSchema = z.object({
  pengajuanId: z.string().min(1),
  hasil: z.enum(["SESUAI", "PERLU_TINDAK_LANJUT"]),
  catatan: z.string().trim().max(1000).default(""),
});

// ── util ────────────────────────────────────────────────────────────────

export type HasilAksi<T = void> =
  | { ok: true; data: T; pesan?: string }
  | { ok: false; pesan: string; error?: Record<string, string[]> };

/** Ubah ZodError jadi peta { namaField: [pesan] } untuk ditempel di form. */
export function errorField(e: z.ZodError): Record<string, string[]> {
  const peta: Record<string, string[]> = {};
  for (const masalah of e.issues) {
    const kunci = masalah.path.join(".") || "_";
    (peta[kunci] ??= []).push(masalah.message);
  }
  return peta;
}

export function gagal(
  pesan: string,
  error?: Record<string, string[]>
): HasilAksi<never> {
  return { ok: false, pesan, error };
}
