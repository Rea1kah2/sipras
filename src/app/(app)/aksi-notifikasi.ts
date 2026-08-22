"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { wajibLogin } from "@/lib/auth";

/**
 * Menandai notifikasi terbaca.
 *
 * Membuka lonceng sengaja TIDAK menandai apa apa. Dulu begitu, dan akibatnya
 * semua penanda hilang sekaligus hanya karena pengguna mengintip. Sekarang
 * penanda hilang saat notifikasinya benar benar ditekan, atau saat pengguna
 * memilih sendiri tombol tandai semua.
 */

/** Tandai satu notifikasi, dipanggil saat notifikasi itu ditekan. */
export async function tandaiSatuDibaca(id: string): Promise<void> {
  const user = await wajibLogin();

  // Kepemilikan ikut jadi syarat di klausa where, jadi menandai notifikasi
  // orang lain tidak mengubah apa pun. Server action bisa dipanggil lewat
  // POST langsung, jadi ini tidak boleh cuma dijaga di UI.
  await prisma.notifikasi.updateMany({
    where: { id, userId: user.id, dibaca: false },
    data: { dibaca: true },
  });

  refresh();
}

/**
 * Versi berbasis form untuk halaman notifikasi: tandai terbaca lalu buka
 * tautannya. Dipakai lewat <form action>, jadi tetap jalan tanpa JavaScript.
 */
export async function bukaNotifikasi(data: FormData): Promise<void> {
  const user = await wajibLogin();
  const id = String(data.get("id") ?? "");

  const notif = await prisma.notifikasi.findFirst({
    where: { id, userId: user.id },
    select: { tautan: true },
  });
  if (!notif) return;

  await prisma.notifikasi.updateMany({
    where: { id, userId: user.id, dibaca: false },
    data: { dibaca: true },
  });

  // redirect melempar, jadi harus di luar blok try mana pun.
  if (notif.tautan) redirect(notif.tautan);
  refresh();
}

/** Tandai semua notifikasi milik pengguna yang sedang login sebagai dibaca. */
export async function tandaiDibaca(): Promise<void> {
  const user = await wajibLogin();

  await prisma.notifikasi.updateMany({
    where: { userId: user.id, dibaca: false },
    data: { dibaca: true },
  });

  refresh();
}
