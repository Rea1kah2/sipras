import type { Peran } from "@/generated/prisma/enums";
import type { Kamus } from "@/lib/kamus";

/**
 * Nama ikon, bukan JSX. Berkas ini sengaja tetap data murni supaya aman
 * diimpor dari server maupun klien. Pemetaan nama ke gambar SVG ada di
 * src/components/ikon-nav.tsx.
 */
export type NamaIkon =
  | "dasbor"
  | "katalog"
  | "pengajuan"
  | "ajukan"
  | "review"
  | "aset"
  | "verifikasi"
  | "riwayat"
  | "pengguna"
  | "kalender"
  | "jadwal"
  | "serah";

export type ItemNav = {
  href: string;
  label: string;
  /** Label pendek untuk tab bawah di HP. */
  pendek: string;
  ikon: NamaIkon;
  /** Rute lain yang membuat item ini tetap terlihat aktif. */
  cocokJuga?: string[];
};

/**
 * Bentuk menu tanpa teks. Labelnya diambil dari kamus saat dirakit, jadi
 * satu satunya sumber teks tetap kamus dan tidak ada kalimat yang tercecer
 * di dua tempat.
 */
type RangkaNav = {
  href: string;
  ikon: NamaIkon;
  label: keyof Kamus["nav"];
  pendek: keyof Kamus["nav"];
  cocokJuga?: string[];
};

const RANGKA_PEMINJAM: RangkaNav[] = [
  { href: "/dasbor", ikon: "dasbor", label: "dasbor", pendek: "dasbor" },
  {
    href: "/katalog",
    ikon: "katalog",
    label: "katalog",
    pendek: "katalogPendek",
    cocokJuga: ["/katalog/"],
  },
  {
    href: "/pengajuan",
    ikon: "pengajuan",
    label: "pengajuan",
    pendek: "pengajuanPendek",
    cocokJuga: ["/pengajuan/"],
  },
  { href: "/ajukan", ikon: "ajukan", label: "ajukan", pendek: "ajukanPendek" },
  { href: "/kalender", ikon: "kalender", label: "kalender", pendek: "kalenderPendek" },
];

const RANGKA_ADMIN: RangkaNav[] = [
  { href: "/admin", ikon: "dasbor", label: "dasborAdmin", pendek: "dasbor" },
  { href: "/admin/review", ikon: "review", label: "review", pendek: "reviewPendek" },
  { href: "/admin/serah", ikon: "serah", label: "serah", pendek: "serahPendek" },
  { href: "/admin/aset", ikon: "aset", label: "aset", pendek: "asetPendek" },
  { href: "/admin/verifikasi", ikon: "verifikasi", label: "verifikasi", pendek: "verifikasiPendek" },
  { href: "/admin/riwayat", ikon: "riwayat", label: "riwayat", pendek: "riwayatPendek" },
  { href: "/admin/pengguna", ikon: "pengguna", label: "pengguna", pendek: "penggunaPendek" },
  { href: "/admin/jadwal", ikon: "jadwal", label: "jadwal", pendek: "jadwalPendek" },
  { href: "/kalender", ikon: "kalender", label: "kalender", pendek: "kalenderPendek" },
];

export function navUntuk(peran: Peran, t: Kamus): ItemNav[] {
  const rangka = peran === "ADMIN" ? RANGKA_ADMIN : RANGKA_PEMINJAM;
  return rangka.map((r) => ({
    href: r.href,
    ikon: r.ikon,
    cocokJuga: r.cocokJuga,
    label: t.nav[r.label],
    pendek: t.nav[r.pendek],
  }));
}

/** Rute yang tidak persis sama dengan kunci judul, dicek lebih dulu. */
const KUNCI_JUDUL: Record<string, string> = {
  "/dasbor": "dasbor",
  "/katalog": "katalog",
  "/ajukan": "ajukan",
  "/pengajuan": "pengajuan",
  "/terkirim": "terkirim",
  "/admin": "admin",
  "/admin/review": "adminReview",
  "/admin/aset": "adminAset",
  "/admin/verifikasi": "adminVerifikasi",
  "/admin/riwayat": "adminRiwayat",
  "/admin/pengguna": "adminPengguna",
  "/admin/serah": "adminSerah",
  "/admin/jadwal": "adminJadwal",
  "/profil": "profil",
  "/notifikasi": "notifikasi",
  "/kalender": "kalender",
};

export function judulUntuk(pathname: string, t: Kamus): [string, string] {
  if (pathname.startsWith("/katalog/")) return t.judul.katalogDetail;
  if (pathname.endsWith("/kembali")) return t.judul.pengembalian;
  if (pathname.startsWith("/pengajuan/")) return t.judul.pengajuanDetail;

  const kunci = KUNCI_JUDUL[pathname];
  return (kunci ? t.judul[kunci] : undefined) ?? t.judul.umum;
}

export function sedangAktif(item: ItemNav, pathname: string): boolean {
  if (pathname === item.href) return true;
  return (item.cocokJuga ?? []).some((p) => pathname.startsWith(p));
}
