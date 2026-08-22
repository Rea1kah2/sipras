"use server";

import { refresh } from "next/cache";
import { prisma } from "@/lib/prisma";
import { penggunaSaatIni } from "@/lib/auth";
import { normalBahasa } from "@/lib/preferensi";

/**
 * Simpan pilihan bahasa ke akun.
 *
 * Cookie tetap ditulis di sisi klien supaya render pertama tidak berkedip,
 * tapi akun yang jadi sumber kebenarannya. Dengan begitu email bisa ikut
 * bahasa penerimanya, dan pilihan terbawa ke perangkat lain.
 *
 * Diam saja kalau belum login. Tamu memang belum punya akun untuk ditulisi,
 * dan cookie-nya sudah cukup sampai dia masuk.
 */
export async function simpanBahasa(nilai: string): Promise<void> {
  const user = await penggunaSaatIni();
  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: { bahasa: normalBahasa(nilai) },
  });

  refresh();
}
