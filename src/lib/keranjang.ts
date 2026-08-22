import "server-only";
import { cookies } from "next/headers";

/**
 * Keranjang pengajuan disimpan di cookie, bukan localStorage, supaya bisa
 * dibaca langsung oleh server component. Form /ajukan dan lencana menu
 * jadi tidak perlu menunggu hidrasi klien.
 */

const NAMA = "sipras_keranjang";
const MAKS_ITEM = 25;

export type BarisKeranjang = { asetId: string; jumlah: number };

export async function bacaKeranjang(): Promise<BarisKeranjang[]> {
  const jar = await cookies();
  const mentah = jar.get(NAMA)?.value;
  if (!mentah) return [];

  try {
    const isi: unknown = JSON.parse(mentah);
    if (!Array.isArray(isi)) return [];
    return isi
      .filter(
        (b): b is BarisKeranjang =>
          !!b &&
          typeof b === "object" &&
          typeof (b as BarisKeranjang).asetId === "string" &&
          Number.isInteger((b as BarisKeranjang).jumlah)
      )
      .slice(0, MAKS_ITEM);
  } catch {
    // Cookie rusak atau diutak-atik, perlakukan sebagai keranjang kosong.
    return [];
  }
}

export async function tulisKeranjang(isi: BarisKeranjang[]): Promise<void> {
  const jar = await cookies();
  if (isi.length === 0) {
    jar.delete(NAMA);
    return;
  }
  jar.set(NAMA, JSON.stringify(isi.slice(0, MAKS_ITEM)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}
