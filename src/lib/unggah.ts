import "server-only";
import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";

/**
 * Penyimpanan foto aset di Vercel Blob.
 *
 * DULU disimpan di folder lokal /public/uploads. Itu cukup untuk demo di
 * satu server, tapi tidak untuk Vercel: filesystem-nya sementara, jadi
 * foto hilang tiap deploy ulang. Dipindah ke object storage supaya
 * bertahan lintas deploy.
 *
 * Diaktifkan lewat menu Storage di dashboard proyek Vercel. Setelah
 * disambungkan, BLOB_READ_WRITE_TOKEN terisi otomatis ke environment
 * proyek tanpa perlu disalin manual, beda dengan kunci layanan pihak
 * ketiga yang harus dipindahkan tangan lewat dashboard yang terpisah.
 */

const MAKS_BYTE = 4 * 1024 * 1024;

// Daftar putih, bukan daftar hitam: hanya tipe yang memang kita niatkan.
const TIPE_SAH: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export type HasilUnggah =
  | { ok: true; jalur: string | null }
  | { ok: false; pesan: string };

/**
 * Simpan satu berkas gambar, kembalikan URL publiknya.
 * Berkas kosong (pengguna tidak memilih apa apa) bukan error, hanya null.
 */
export async function simpanFoto(berkas: unknown): Promise<HasilUnggah> {
  if (!(berkas instanceof File) || berkas.size === 0) {
    return { ok: true, jalur: null };
  }

  if (berkas.size > MAKS_BYTE) {
    return {
      ok: false,
      pesan: `Ukuran foto ${(berkas.size / 1024 / 1024).toFixed(1)} MB, maksimal 4 MB. Perkecil dulu fotonya.`,
    };
  }

  const ekstensi = TIPE_SAH[berkas.type];
  if (!ekstensi) {
    return {
      ok: false,
      pesan: "Format foto harus JPG, PNG, WEBP, atau AVIF.",
    };
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // Sama prinsipnya dengan PENGINGAT_SECRET di api/pengingat/route.ts:
    // lebih baik gagal jelas daripada diam diam menulis ke tempat yang
    // salah atau berpura pura berhasil padahal fotonya tidak tersimpan
    // di mana pun.
    return {
      ok: false,
      pesan: "Penyimpanan foto belum disambungkan (Vercel Blob belum diaktifkan untuk proyek ini).",
    };
  }

  // Nama berkas selalu dibuat sistem, tidak pernah memakai nama dari
  // pengguna. Ini menutup jalan path traversal dan tabrakan nama sekaligus.
  const nama = `${randomUUID()}.${ekstensi}`;

  try {
    const hasil = await put(nama, berkas, {
      access: "public",
      // Nama berkasnya sudah unik permanen lewat randomUUID, jadi menambah
      // sufiks acak lagi cuma memperpanjang URL tanpa manfaat.
      addRandomSuffix: false,
      cacheControlMaxAge: 31536000, // setahun
    });
    return { ok: true, jalur: hasil.url };
  } catch (e) {
    const pesan = e instanceof Error ? e.message : String(e);
    return { ok: false, pesan: `Foto gagal diunggah ke penyimpanan: ${pesan}` };
  }
}
