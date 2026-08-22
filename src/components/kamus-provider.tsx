"use client";

import { createContext, useContext } from "react";
import { kamus, type Kamus } from "@/lib/kamus";

/**
 * Kamus lewat context.
 *
 * Komponen kecil yang dipakai di banyak tempat, misalnya BadgeStatus,
 * cuma menerima satu prop status. Mengoper kamus ke setiap pemanggilnya
 * akan menyentuh puluhan berkas tanpa menambah kejelasan apa apa, jadi
 * kamusnya disediakan sekali dari Shell dan diambil di tempat pemakaian.
 *
 * Cadangannya bahasa Indonesia, sehingga komponen yang kebetulan dirender
 * di luar Shell tetap menampilkan teks yang benar, bukan kosong.
 */
const KonteksKamus = createContext<Kamus | null>(null);

export function PenyediaKamus({
  nilai,
  children,
}: {
  nilai: Kamus;
  children: React.ReactNode;
}) {
  return <KonteksKamus.Provider value={nilai}>{children}</KonteksKamus.Provider>;
}

export function useKamus(): Kamus {
  return useContext(KonteksKamus) ?? kamus("id");
}
