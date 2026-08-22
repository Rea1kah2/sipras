// Semua tanggal pemakaian disimpan sebagai DATE (tanpa jam). Supaya tidak
// pernah bergeser sehari karena zona waktu, tanggal selalu diperlakukan
// sebagai UTC midnight dan diformat manual, bukan lewat toLocaleDateString.

export const BULAN_PENDEK = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export const BULAN_PANJANG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export const HARI_PANJANG = [
  "Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu",
];

/**
 * Nama bulan dan hari untuk pemformat di bawah.
 *
 * Tipenya sengaja struktural, bukan mengimpor `Kamus`, supaya berkas ini
 * tetap bisa dipakai tanpa menyeret seluruh kamus, dan tidak ada lingkaran
 * impor antara waktu dan kamus.
 *
 * Argumennya opsional dengan cadangan bahasa Indonesia. Dengan begitu
 * pemanggil yang belum disesuaikan tetap menampilkan tanggal yang benar,
 * bukan tanggal kosong atau "undefined".
 */
export type NamaWaktu = {
  bulanPendek: string[];
  bulanPanjang: string[];
  hariPanjang: string[];
};

const BAWAAN: NamaWaktu = {
  bulanPendek: BULAN_PENDEK,
  bulanPanjang: BULAN_PANJANG,
  hariPanjang: HARI_PANJANG,
};

/** "2026-08-14" → Date pada UTC midnight. */
export function dariISO(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Date → "2026-08-14" (komponen UTC, jadi tidak bergeser oleh zona waktu). */
export function keISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Tanggal hari ini di zona Asia/Jakarta, sebagai "YYYY-MM-DD". */
export function hariIniISO(): string {
  const sekarang = new Date();
  // WIB = UTC+7. Geser dulu, baru ambil komponen UTC-nya.
  const wib = new Date(sekarang.getTime() + 7 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 10);
}

/** "14 Agu 2026", atau "14 Aug 2026" dalam bahasa Inggris. */
export function fmtTanggal(
  d: Date | string | null | undefined,
  t: NamaWaktu = BAWAAN
): string {
  if (!d) return "-";
  const iso = typeof d === "string" ? d.slice(0, 10) : keISO(d);
  const [y, m, day] = iso.split("-").map(Number);
  return `${day} ${t.bulanPendek[m - 1]} ${y}`;
}

/**
 * "Jumat, 14 Agustus 2026", atau "Friday, 14 August 2026".
 *
 * Urutan angkanya sengaja tetap tanggal lalu bulan lalu tahun di kedua
 * bahasa. Memakai urutan Amerika di mode Inggris akan membuat "03/04"
 * ambigu, dan di sistem yang isinya tanggal semua itu risiko nyata.
 */
export function fmtTanggalPanjang(
  d: Date | string | null | undefined,
  t: NamaWaktu = BAWAAN
): string {
  if (!d) return "-";
  const iso = typeof d === "string" ? d.slice(0, 10) : keISO(d);
  const [y, m, day] = iso.split("-").map(Number);
  const namaHari = t.hariPanjang[dariISO(iso).getUTCDay()];
  return `${namaHari}, ${day} ${t.bulanPanjang[m - 1]} ${y}`;
}

/** "14 Agu 2026 - 16 Agu 2026" */
export function fmtRentang(
  mulai: Date | string,
  selesai: Date | string,
  t: NamaWaktu = BAWAAN
): string {
  return `${fmtTanggal(mulai, t)} - ${fmtTanggal(selesai, t)}`;
}

/** Jumlah hari pemakaian, inklusif. 14→16 Agustus = 3 hari. */
export function hitungHari(
  mulai: Date | string,
  selesai: Date | string
): number {
  const a = typeof mulai === "string" ? dariISO(mulai) : mulai;
  const b = typeof selesai === "string" ? dariISO(selesai) : selesai;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
}

/**
 * Dua rentang tanggal beririsan bila mulaiA <= selesaiB && mulaiB <= selesaiA.
 * Ini satu-satunya definisi bentrok yang dipakai di seluruh sistem.
 */
export function beririsan(
  mulaiA: Date | string,
  selesaiA: Date | string,
  mulaiB: Date | string,
  selesaiB: Date | string
): boolean {
  const a1 = typeof mulaiA === "string" ? dariISO(mulaiA) : mulaiA;
  const a2 = typeof selesaiA === "string" ? dariISO(selesaiA) : selesaiA;
  const b1 = typeof mulaiB === "string" ? dariISO(mulaiB) : mulaiB;
  const b2 = typeof selesaiB === "string" ? dariISO(selesaiB) : selesaiB;
  return a1.getTime() <= b2.getTime() && b1.getTime() <= a2.getTime();
}

/** "11 Agu, 09.14", stempel waktu notifikasi dalam WIB. */
export function fmtWaktu(d: Date, t: NamaWaktu = BAWAAN): string {
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const tgl = wib.getUTCDate();
  const bln = t.bulanPendek[wib.getUTCMonth()];
  const jam = String(wib.getUTCHours()).padStart(2, "0");
  const menit = String(wib.getUTCMinutes()).padStart(2, "0");
  return `${tgl} ${bln}, ${jam}.${menit}`;
}

/** Selisih hari dari hari ini ke tanggal target (negatif = sudah lewat). */
export function sisaHari(target: Date | string): number {
  return hitungHari(hariIniISO(), target) - 1;
}
