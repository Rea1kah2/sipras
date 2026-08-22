import "server-only";
import { cookies } from "next/headers";
import { COOKIE_BAHASA, COOKIE_TEMA, normalBahasa, normalTema } from "@/lib/preferensi";
import type { Bahasa, Tema } from "@/lib/preferensi";
import { kamus } from "@/lib/kamus";
import type { Kamus } from "@/lib/kamus";
import { penggunaSaatIni } from "@/lib/auth";

/**
 * Pembacaan preferensi di server.
 *
 * Dipisah dari preferensi.ts karena `next/headers` hanya boleh hidup di
 * server, sedangkan nama cookie dan tipenya juga dibutuhkan komponen klien.
 * `server-only` membuat kesalahan impor ketahuan saat build, bukan saat
 * halaman dibuka pengguna.
 */

/**
 * Urutannya satu arah dan tidak berubah di mana pun: AKUN dulu kalau sudah
 * login, COOKIE kalau belum.
 *
 * Cookie tidak dibuang karena halaman masuk dan daftar memang belum punya
 * akun untuk ditanya. Tema tetap sepenuhnya di cookie, karena itu preferensi
 * perangkat: laptop terang dan HP gelap adalah kombinasi yang wajar.
 */
export async function bacaPreferensi(): Promise<{ tema: Tema; bahasa: Bahasa }> {
  const jar = await cookies();
  return {
    tema: normalTema(jar.get(COOKIE_TEMA)?.value),
    bahasa: await bacaBahasa(),
  };
}

export async function bacaBahasa(): Promise<Bahasa> {
  const user = await penggunaSaatIni();
  if (user) return normalBahasa(user.bahasa);

  const jar = await cookies();
  return normalBahasa(jar.get(COOKIE_BAHASA)?.value);
}

/** Jalan pintas yang paling sering dipakai di server component. */
export async function teks(): Promise<Kamus> {
  return kamus(await bacaBahasa());
}
