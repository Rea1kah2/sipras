import type { Kamus } from "@/lib/kamus";
import { fmtTanggal } from "@/lib/waktu";

/**
 * Merender isi notifikasi dari kunci dan datanya.
 *
 * Notifikasi disimpan sebagai kunci plus data mentah, bukan kalimat jadi,
 * supaya bisa dirender ulang dalam bahasa pembacanya. Berkas ini yang
 * merakitnya kembali.
 *
 * Berkas ini MURNI, tanpa akses basis data atau cookie, karena dipakai baik
 * di server component maupun di komponen klien lewat useKamus.
 */

export type DataPesan = Record<string, string | number | null | undefined>;

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Bentuk jamak sederhana untuk bahasa Inggris.
 *
 * Ditulis sebagai varian kunci, bukan aturan tata bahasa umum. Bahasa
 * Indonesia tidak mengubah bentuk kata untuk jumlah, jadi aturan penuh
 * cuma menambah rumit tanpa dipakai. Kalau nanti ada bahasa ketiga yang
 * butuh lebih dari dua bentuk, di sinilah tempat menggantinya.
 *
 * Kunci "x.isi" akan memakai "x.isi.satu" kalau nilai {n} tepat 1.
 */
function polaUntuk(t: Kamus, kunci: string, data: DataPesan): string | undefined {
  if (Number(data.n) === 1) {
    const tunggal = t.pesan[`${kunci}.satu`];
    if (tunggal) return tunggal;
  }
  return t.pesan[kunci];
}

/**
 * Ganti penanda {…} dengan nilainya.
 *
 * Nilai yang berpola tanggal ISO otomatis diformat jadi tanggal sesuai
 * bahasa pembacanya. Ini yang membuat aturan "simpan mentah, format saat
 * dibaca" benar benar berlaku: kalau tanggal disimpan sudah terformat,
 * nama bulannya ikut beku di bahasa saat kejadian dan masalahnya cuma
 * pindah satu lapis ke dalam.
 */
export function isiPenanda(kalimat: string, data: DataPesan, t: Kamus): string {
  return kalimat.replace(/\{(\w+)\}/g, (utuh, nama: string) => {
    const nilai = data[nama];
    if (nilai === null || nilai === undefined) return utuh;
    const teks = String(nilai);
    return POLA_TANGGAL.test(teks) ? fmtTanggal(teks, t) : teks;
  });
}

export type NotifTersimpan = {
  judul: string;
  isi: string;
  kunci: string | null;
  data: unknown;
};

/**
 * Judul dan isi yang siap ditampilkan.
 *
 * Kalau kuncinya ada dan dikenali kamus, dirender dari kamus. Kalau tidak,
 * dipakai kalimat yang tersimpan. Cadangan itu bukan kemewahan: baris lama
 * memang tidak punya kunci, dan tanpa cadangan riwayat notifikasi yang
 * sudah ada akan tampil kosong.
 */
export function tampilkanNotif(n: NotifTersimpan, t: Kamus): { judul: string; isi: string } {
  if (!n.kunci) return { judul: n.judul, isi: n.isi };

  const data = (n.data ?? {}) as DataPesan;
  const polaJudul = polaUntuk(t, `${n.kunci}.judul`, data);
  const polaIsi = polaUntuk(t, `${n.kunci}.isi`, data);

  return {
    judul: polaJudul ? isiPenanda(polaJudul, data, t) : n.judul,
    isi: polaIsi ? isiPenanda(polaIsi, data, t) : n.isi,
  };
}
