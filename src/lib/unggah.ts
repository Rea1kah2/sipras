import "server-only";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

/**
 * Penyimpanan foto aset di Supabase Storage.
 *
 * DULU disimpan di folder lokal /public/uploads. Itu cukup untuk demo di
 * satu server, tapi tidak untuk Vercel: filesystem-nya sementara, jadi
 * foto hilang tiap deploy ulang. Dipindah ke object storage supaya
 * bertahan lintas deploy.
 *
 * Bucket-nya WAJIB publik (baca), karena foto ditampilkan langsung lewat
 * <img src> tanpa proses otorisasi apa pun, sama seperti dulu saat masih
 * di /public/uploads. Kunci peran layanan dipakai untuk menulis karena
 * unggahan terjadi di server action, tidak pernah sampai ke klien.
 */

const BUCKET = "aset-foto";
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
 * Klien dibuat sekali lalu dipakai ulang, bukan dibuat ulang tiap
 * pemanggilan. Diambil dari fungsi, bukan level modul, supaya kalau kunci
 * belum diisi, kegagalannya muncul saat benar benar dipakai dengan pesan
 * yang jelas, bukan saat modul dimuat dan meruntuhkan seluruh server.
 */
function klien() {
  const url = process.env.SUPABASE_URL;
  const kunci = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !kunci) return null;
  return createClient(url, kunci);
}

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

  const supabase = klien();
  if (!supabase) {
    // Sama prinsipnya dengan PENGINGAT_SECRET di api/pengingat/route.ts:
    // lebih baik gagal jelas daripada diam diam menulis ke tempat yang
    // salah atau berpura pura berhasil padahal fotonya tidak tersimpan
    // di mana pun.
    return {
      ok: false,
      pesan: "Penyimpanan foto belum disambungkan (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY belum diisi).",
    };
  }

  // Nama berkas selalu dibuat sistem, tidak pernah memakai nama dari
  // pengguna. Ini menutup jalan path traversal dan tabrakan nama sekaligus.
  const nama = `${randomUUID()}.${ekstensi}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(nama, Buffer.from(await berkas.arrayBuffer()), {
      contentType: berkas.type,
      cacheControl: "31536000", // setahun, nama berkasnya sudah unik permanen
    });

  if (error) {
    return {
      ok: false,
      pesan: `Foto gagal diunggah ke penyimpanan: ${error.message}`,
    };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(nama);
  return { ok: true, jalur: data.publicUrl };
}
