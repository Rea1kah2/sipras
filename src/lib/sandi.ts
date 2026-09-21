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

const HURUF_KECIL = "abcdefghijkmnopqrstuvwxyz"; // tanpa 'l', mirip '1'
const HURUF_BESAR = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // tanpa 'I', 'O'
const ANGKA = "23456789"; // tanpa '0', '1'
const SIMBOL = "!@#%^&*-_=+";

/**
 * Bilangan acak [0, maks) tanpa bias modulo, pakai Web Crypto API lewat
 * `globalThis.crypto`. Dipilih ketimbang `node:crypto`, karena berkas ini
 * sengaja murni dan dipakai juga dari komponen klien (lihat catatan di
 * atas), dan `node:crypto` tidak bisa dibundel untuk peramban.
 */
function acakIndeks(maks: number): number {
  const batas = Math.floor(0x1_0000_0000 / maks) * maks;
  const larik = new Uint32Array(1);
  let n: number;
  do {
    globalThis.crypto.getRandomValues(larik);
    n = larik[0];
  } while (n >= batas);
  return n % maks;
}

/**
 * Kata sandi acak yang dijamin "kuat" oleh konstruksi, bukan dicoba lalu
 * dicek. Dipakai admin mereset sandi pengguna lain: satu karakter dari
 * tiap kelompok diambil lebih dulu supaya jenis karakternya pasti
 * terpenuhi, sisanya diisi acak dari gabungan semuanya, lalu urutannya
 * dikocok.
 */
export function buatSandiAcak(panjang = 14): string {
  const semua = HURUF_KECIL + HURUF_BESAR + ANGKA + SIMBOL;
  const acak = (set: string) => set[acakIndeks(set.length)];

  const karakter = [acak(HURUF_KECIL), acak(HURUF_BESAR), acak(ANGKA), acak(SIMBOL)];
  for (let i = karakter.length; i < panjang; i++) {
    karakter.push(acak(semua));
  }

  for (let i = karakter.length - 1; i > 0; i--) {
    const j = acakIndeks(i + 1);
    [karakter[i], karakter[j]] = [karakter[j], karakter[i]];
  }
  return karakter.join("");
}

/**
 * Dipakai skema validasi Zod, yang dirakit sekali saat modul dimuat sehingga
 * belum tahu bahasa pembacanya. Sengaja dibiarkan memakai teks bawaan, dan
 * ini bagian dari cacat sistemik yang sama dengan pesan di berkas aksi.ts:
 * seluruh pesan validasi server memang belum ikut bahasa. Itu pekerjaan
 * tersendiri, bukan diselundupkan ke sini setengah jadi.
 */
export const PESAN_SANDI_LEMAH = TEKS_BAWAAN.terlaluLemah;
