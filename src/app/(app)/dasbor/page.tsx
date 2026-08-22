import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { teks } from "@/lib/preferensi-server";
import { wajibPeminjam } from "@/lib/auth";
import { STATUS_BERJALAN } from "@/lib/status";
import { fmtRentang, fmtTanggalPanjang, hariIniISO, hitungHari } from "@/lib/waktu";
import { PILIH_PENGAJUAN, teksItem } from "@/lib/pengajuan";
import { BadgeStatus, GarisLangkah } from "@/components/badge";
import { IkonNav } from "@/components/ikon-nav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await teks();
  return { title: t.judul.dasbor[0] };
}

export default async function Dasbor() {
  const user = await wajibPeminjam();
  const t = await teks();

  // Pengajuan yang tanggal mulainya sudah tiba otomatis jadi "sedang dipinjam".

  const [berjalan, hitung] = await Promise.all([
    prisma.pengajuan.findMany({
      where: { pemohonId: user.id, status: { in: STATUS_BERJALAN } },
      orderBy: { diajukanPada: "desc" },
      select: PILIH_PENGAJUAN,
    }),
    prisma.pengajuan.groupBy({
      by: ["status"],
      where: { pemohonId: user.id },
      _count: { _all: true },
    }),
  ]);

  const n = (s: string) =>
    hitung.find((h) => h.status === s)?._count._all ?? 0;

  const statistik = [
    { nilai: berjalan.length, label: t.dasbor.statBerjalan, ikon: "pengajuan" as const, latar: "var(--color-accent-200)", tinta: "var(--color-accent-800)" },
    { nilai: n("MENUNGGU"), label: t.dasbor.statMenunggu, ikon: "review" as const, latar: "var(--color-neutral-200)", tinta: "var(--color-neutral-800)" },
    { nilai: n("DIPINJAM"), label: t.dasbor.statDipinjam, ikon: "katalog" as const, latar: "var(--color-warn-200)", tinta: "var(--color-warn-800)" },
    { nilai: n("SELESAI"), label: t.dasbor.statSelesai, ikon: "verifikasi" as const, latar: "var(--color-accent-2-200)", tinta: "var(--color-accent-2-800)" },
  ];

  const namaDepan = user.nama.split(" ")[0];

  return (
    <div className="anim-rise flex flex-col" style={{ gap: "var(--space-4)" }}>
      <div>
        <h2 style={{ margin: "0 0 4px" }}>{t.dasbor.halo.replace("{nama}", namaDepan)}</h2>
        <p style={{ fontSize: 13.5, color: "var(--color-neutral-700)", margin: 0 }}>
          {fmtTanggalPanjang(hariIniISO(), t)} ·{" "}
          {t.dasbor.ringkas.replace("{n}", String(berjalan.length))}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: "var(--space-3)",
        }}
      >
        {statistik.map((s) => (
          <div key={s.label} className="kartu-statistik">
            <span
              className="statistik-ikon"
              style={{ background: s.latar, color: s.tinta }}
              aria-hidden
            >
              <IkonNav nama={s.ikon} ukuran={20} />
            </span>
            <span style={{ minWidth: 0 }}>
              <span className="statistik-angka" style={{ display: "block" }}>
                {s.nilai}
              </span>
              <span className="statistik-label" style={{ display: "block" }}>
                {s.label}
              </span>
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))",
          gap: "var(--space-4)",
          alignItems: "start",
        }}
      >
        {/* kolom kiri: pengajuan berjalan */}
        <div className="flex flex-col" style={{ gap: "var(--space-3)", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
            <h4 style={{ margin: 0 }}>{t.dasbor.berjalan}</h4>
            <Link href="/pengajuan" className="tautan" style={{ fontSize: 12.5 }}>
              {t.umum.lihatSemua}
            </Link>
          </div>

          {berjalan.map((p) => (
            <div key={p.id} className="card elev-sm" style={{ background: "var(--color-neutral-100)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--color-neutral-600)" }}>
                  {p.kode}
                </span>
                <BadgeStatus status={p.status} />
              </div>
              <div className="card-title">{teksItem(p.items)}</div>
              <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)" }}>
                {fmtRentang(p.mulai, p.selesai, t)} · {hitungHari(p.mulai, p.selesai)} {t.umum.hari}
              </div>
              <GarisLangkah status={p.status} />

              {p.status === "DIPINJAM" && (
                <Link
                  href={`/pengajuan/${p.id}/kembali`}
                  className="btn btn-primary"
                  style={{ alignSelf: "flex-start", fontSize: 13, marginTop: 6 }}
                >
                  {t.umum.ajukanKembali}
                </Link>
              )}
            </div>
          ))}

          {berjalan.length === 0 && (
            <div
              className="card"
              style={{
                alignItems: "center", textAlign: "center",
                padding: "var(--space-8) var(--space-4)",
                background: "var(--color-neutral-100)",
              }}
            >
              <div
                aria-hidden
                style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: "var(--color-neutral-200)",
                  display: "grid", placeItems: "center", marginBottom: 6,
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-neutral-700)" strokeWidth="2.75" strokeLinecap="round">
                  <path d="M8 2v4" /><path d="M16 2v4" />
                  <rect width="18" height="18" x="3" y="4" rx="4" /><path d="M3 10h18" />
                </svg>
              </div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>
                {t.dasbor.kosong}
              </div>
              <p style={{ fontSize: 12.5, color: "var(--color-neutral-700)", margin: 0, maxWidth: "32ch" }}>
                {t.dasbor.kosongIsi}
              </p>
              <Link href="/katalog" className="btn btn-primary" style={{ marginTop: 8 }}>
                {t.umum.bukaKatalog}
              </Link>
            </div>
          )}
        </div>

        {/* kolom kanan: akses cepat */}
        <div className="flex flex-col" style={{ gap: "var(--space-3)", minWidth: 0 }}>
          <div className="card elev-sm" style={{ background: "var(--color-accent-200)" }}>
            <span className="card-kicker" style={{ color: "var(--color-accent-800)" }}>
              {t.dasbor.aksesCepat}
            </span>
            <div className="card-title" style={{ color: "var(--color-accent-900)" }}>
              {t.dasbor.ajukanBaru}
            </div>
            <p style={{ fontSize: 12.5, margin: 0, color: "var(--color-accent-900)" }}>
              {t.dasbor.ajukanBaruIsi}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              <Link href="/katalog" className="btn btn-primary" style={{ fontSize: 13 }}>
                {t.dasbor.pilihKatalog}
              </Link>
              <Link
                href="/ajukan"
                className="btn btn-secondary"
                style={{ fontSize: 13, borderColor: "var(--color-accent-800)" }}
              >
                {t.dasbor.langsungForm}
              </Link>
            </div>
          </div>

          <div className="card elev-sm" style={{ background: "var(--color-neutral-100)" }}>
            <span className="card-kicker">{t.dasbor.caraKerja}</span>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "var(--color-neutral-800)", lineHeight: 1.9 }}>
              <li>{t.dasbor.cara1}</li>
              <li>{t.dasbor.cara2}</li>
              <li>{t.dasbor.cara3}</li>
              <li>{t.dasbor.cara4}</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
