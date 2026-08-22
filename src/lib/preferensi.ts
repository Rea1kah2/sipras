/**
 * Preferensi tampilan: tema dan bahasa.
 *
 * Berkas ini sengaja MURNI, tanpa `next/headers`, karena ikut diimpor
 * komponen klien (togel tema dan bahasa) yang butuh nama cookie dan tipe.
 * Pembacaan cookie di server ada di preferensi-server.ts. Menggabung
 * keduanya di satu berkas bikin build gagal, karena `next/headers` tidak
 * boleh masuk ke bundel klien.
 *
 * Keduanya disimpan di cookie biasa, bukan di database, karena ini
 * preferensi perangkat dan bukan data akun. Cookie juga bisa dibaca server
 * saat render pertama, jadi halaman langsung keluar dengan tema dan bahasa
 * yang benar tanpa berkedip dari terang ke gelap.
 */

export type Tema = "terang" | "gelap";
export type Bahasa = "id" | "en";

export const COOKIE_TEMA = "sipras_tema";
export const COOKIE_BAHASA = "sipras_bahasa";
export const SETAHUN = 60 * 60 * 24 * 365;

export function normalTema(nilai: string | undefined): Tema {
  return nilai === "gelap" ? "gelap" : "terang";
}

export function normalBahasa(nilai: string | undefined): Bahasa {
  return nilai === "en" ? "en" : "id";
}
