/**
 * Penilaian kekuatan kata sandi.
 *
 * Sengaja diletakkan di lib tanpa `server-only` supaya dipakai bersama oleh
 * komponen klien (bar kekuatan) dan skema validasi di server. Kalau aturannya
 * ditulis dua kali, cepat atau lambat keduanya berbeda dan pengguna melihat
 * label "Kuat" tapi tetap ditolak server.
 */

export const PANJANG_MINIMAL = 8;

export type Tingkat = "lemah" | "sedang" | "kuat";

export type Kekuatan = {
  tingkat: Tingkat;
  label: string;
  /** 1 sampai 3, dipakai untuk mengisi bar. */
  skor: number;
  /** Satu kalimat saran perbaikan, atau null kalau sudah kuat. */
  saran: string | null;
};

/**
 * Teks penilai kekuatan sandi.
 *
 * Bentuknya struktural, bukan mengimpor Kamus, mengikuti pola yang sudah
 * dipakai TeksKetersediaan di lib/ketersediaan.ts dan TeksTutup di
 * lib/penutupan.ts. Alasannya sama: berkas ini pustaka murni yang dipakai
 * dari komponen klien, dari skema validasi, dan dari aksi server sekaligus,
 * jadi mengimpor kamus akan menyeret seluruhnya ke ketiga tempat itu.
 * Karena strukturnya cocok, pemanggil cukup mengoper kamusnya apa adanya.
 */
export type TeksSandi = {
  lemah: string;
  sedang: string;
  kuat: string;
  sudahAman: string;
  tambahKarakter: string;
  campurJenis: string;
  panjangkan: string;
  tambahJenis: string;
  terlaluLemah: string;
};

const TEKS_BAWAAN: TeksSandi = {
  lemah: "Lemah",
  sedang: "Sedang",
  kuat: "Kuat",
  sudahAman: "Sandi ini sudah aman.",
  tambahKarakter: "Tambah lagi {n} karakter.",
  campurJenis: "Campur huruf dengan angka atau simbol.",
  panjangkan: "Panjangkan sampai 12 karakter supaya jadi kuat.",
  tambahJenis: "Tambah satu jenis karakter lagi supaya jadi kuat.",
  terlaluLemah:
    "Kata sandi terlalu lemah. Minimal 8 karakter dan campur huruf dengan angka atau simbol.",
};

/** Berapa jenis karakter yang dipakai: huruf kecil, besar, angka, simbol. */
function jenisKarakter(sandi: string): number {
  let n = 0;
  if (/[a-z]/.test(sandi)) n++;
  if (/[A-Z]/.test(sandi)) n++;
  if (/[0-9]/.test(sandi)) n++;
  if (/[^A-Za-z0-9]/.test(sandi)) n++;
  return n;
}

export function nilaiKekuatan(
  sandi: string,
  ts: TeksSandi = TEKS_BAWAAN
): Kekuatan {
  const panjang = sandi.length;

  if (panjang === 0) {
    return { tingkat: "lemah", label: ts.lemah, skor: 0, saran: null };
  }

  // Di bawah panjang minimal, seberapa pun beragam karakternya tetap lemah.
  // Panjang adalah faktor yang paling menentukan, jadi tidak bisa ditawar.
  if (panjang < PANJANG_MINIMAL) {
    return {
      tingkat: "lemah",
      label: ts.lemah,
      skor: 1,
      saran: ts.tambahKarakter.replace("{n}", String(PANJANG_MINIMAL - panjang)),
    };
  }

  const jenis = jenisKarakter(sandi);

  // Satu jenis karakter saja tetap lemah walau panjang, karena "12345678"
  // dan "passwordpassword" sama sama mudah ditebak.
  if (jenis < 2) {
    return {
      tingkat: "lemah",
      label: ts.lemah,
      skor: 1,
      saran: ts.campurJenis,
    };
  }

  const kuat = panjang >= 12 && jenis >= 3;
  if (kuat) {
    return { tingkat: "kuat", label: ts.kuat, skor: 3, saran: null };
  }

  return {
    tingkat: "sedang",
    label: ts.sedang,
    skor: 2,
    saran: panjang < 12 ? ts.panjangkan : ts.tambahJenis,
  };
}

/** Ambang yang dipakai saat membuat atau mengganti kata sandi. */
export function cukupKuat(sandi: string): boolean {
  return nilaiKekuatan(sandi).tingkat !== "lemah";
}

/**
 * Dipakai skema validasi Zod, yang dirakit sekali saat modul dimuat sehingga
 * belum tahu bahasa pembacanya. Sengaja dibiarkan memakai teks bawaan, dan
 * ini bagian dari cacat sistemik yang sama dengan pesan di berkas aksi.ts:
 * seluruh pesan validasi server memang belum ikut bahasa. Itu pekerjaan
 * tersendiri, bukan diselundupkan ke sini setengah jadi.
 */
export const PESAN_SANDI_LEMAH = TEKS_BAWAAN.terlaluLemah;
