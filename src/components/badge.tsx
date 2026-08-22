"use client";

import type { StatusPengajuan } from "@/generated/prisma/enums";
import { GAYA_STATUS, LANGKAH_ALUR, indeksLangkah } from "@/lib/status";
import { useKamus } from "@/components/kamus-provider";

/**
 * Badge status. Dibedakan tiga cara sekaligus (warna, isian, dan titik)
 * supaya tetap terbaca oleh pengguna buta warna dan saat dicetak hitam putih.
 */
export function BadgeStatus({ status }: { status: StatusPengajuan }) {
  const t = useKamus();
  const g = GAYA_STATUS[status];
  return (
    <span
      className="tag"
      style={{
        background: g.latar,
        color: g.teks,
        fontWeight: 600,
        boxShadow: g.garis ? `inset 0 0 0 1.5px ${g.garis}` : undefined,
      }}
    >
      <span className="tag-dot" style={{ background: g.titik }} aria-hidden />
      {t.status[status]}
    </span>
  );
}

// Nuansa yang dikembalikan lib/ketersediaan.ts dipetakan ke ramp semantik:
// sage berarti aman, warm berarti sedang terpakai, deep berarti habis.
const NUANSA = {
  sage: { latar: "var(--color-accent-2-300)", teks: "var(--color-accent-2-900)", titik: "var(--color-accent-2-700)" },
  warm: { latar: "var(--color-warn-300)", teks: "var(--color-warn-900)", titik: "var(--color-warn-700)" },
  deep: { latar: "var(--color-danger-300)", teks: "var(--color-danger-900)", titik: "var(--color-danger-700)" },
} as const;

export function BadgeKetersediaan({
  teks,
  nuansa,
}: {
  teks: string;
  nuansa: "sage" | "warm" | "deep";
}) {
  const g = NUANSA[nuansa];
  return (
    <span
      className="tag"
      style={{ background: g.latar, color: g.teks, fontWeight: 600, alignSelf: "flex-start" }}
    >
      <span className="tag-dot" style={{ background: g.titik }} aria-hidden />
      {teks}
    </span>
  );
}

/**
 * Barang dan ruang dibedakan lewat isian penuh versus garis, bukan lewat
 * warna. Hijau disimpan khusus untuk arti "aman", jadi memakainya di sini
 * hanya akan membuat orang salah membaca.
 */
export function BadgeTipe({ tipe }: { tipe: "BARANG" | "RUANG" }) {
  const t = useKamus();
  const barang = tipe === "BARANG";
  return (
    <span
      className="tag"
      style={{
        background: barang ? "var(--color-neutral-200)" : "transparent",
        color: "var(--color-neutral-800)",
        boxShadow: barang ? "none" : "inset 0 0 0 1px var(--color-neutral-400)",
        fontWeight: 600,
      }}
    >
      {barang ? t.umum.barang : t.umum.ruang}
    </span>
  );
}

/** Garis waktu empat langkah di kartu pengajuan. */
export function GarisLangkah({ status }: { status: StatusPengajuan }) {
  const t = useKamus();
  const label: Record<string, string> = {
    MENUNGGU: t.langkah.diajukan,
    DISETUJUI: t.langkah.disetujui,
    DIPINJAM: t.langkah.dipinjam,
    SELESAI: t.langkah.selesai,
  };
  const sampai = indeksLangkah(status);
  const ditolak = status === "DITOLAK";

  return (
    <ol
      style={{
        display: "flex", alignItems: "center", gap: 6,
        margin: "6px 0 0", padding: 0, listStyle: "none",
      }}
    >
      {LANGKAH_ALUR.map((l, i) => {
        const tercapai = i <= sampai;
        return (
          <li key={l.status} style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                height: 5, borderRadius: 999,
                background: tercapai
                  ? ditolak && i === 0
                    ? "var(--color-danger-600)"
                    : "var(--color-accent-2-600)"
                  : "var(--color-neutral-300)",
              }}
            />
            <div
              style={{
                fontSize: 10, marginTop: 4,
                color: tercapai ? "var(--color-neutral-800)" : "var(--color-neutral-600)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}
            >
              {ditolak && i === 0 ? t.status.DITOLAK : label[l.status]}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
