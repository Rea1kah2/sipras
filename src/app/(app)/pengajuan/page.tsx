import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { wajibPeminjam } from "@/lib/auth";

import { teks } from "@/lib/preferensi-server";
import { fmtRentang, fmtTanggal, hitungHari } from "@/lib/waktu";
import { PILIH_PENGAJUAN, teksItem } from "@/lib/pengajuan";
import { BadgeStatus, GarisLangkah } from "@/components/badge";
import { PesanSukses } from "@/components/form";
import type { StatusPengajuan } from "@/generated/prisma/enums";

export async function generateMetadata(): Promise<Metadata> {
  const t = await teks();
  return { title: t.judul.pengajuan[0] };
}

// Kunci filter sengaja memakai nama status, bukan label terjemahan, supaya
// tautan yang dibuat saat bahasa Indonesia tetap cocok setelah pindah ke
// Inggris. Yang diterjemahkan hanya teks yang terlihat.
const FILTER: { kunci: string; status?: StatusPengajuan }[] = [
  { kunci: "SEMUA" },
  { kunci: "MENUNGGU", status: "MENUNGGU" },
  { kunci: "DISETUJUI", status: "DISETUJUI" },
  { kunci: "DIPINJAM", status: "DIPINJAM" },
  { kunci: "DIKEMBALIKAN", status: "DIKEMBALIKAN" },
  { kunci: "SELESAI", status: "SELESAI" },
  { kunci: "DITOLAK", status: "DITOLAK" },
];

export default async function PengajuanSaya(props: PageProps<"/pengajuan">) {
  const user = await wajibPeminjam();
  const t = await teks();

  const sp = (await props.searchParams) as {
    status?: string;
    baru?: string;
    kembali?: string;
  };
  const aktif = FILTER.find((f) => f.kunci === sp.status) ?? FILTER[0];
  const labelFilter = (k: string) => (k === "SEMUA" ? t.umum.semua : t.status[k]);

  const daftar = await prisma.pengajuan.findMany({
    where: {
      pemohonId: user.id,
      ...(aktif.status ? { status: aktif.status } : {}),
    },
    orderBy: { diajukanPada: "desc" },
    select: PILIH_PENGAJUAN,
  });

  return (
    <div className="anim-rise flex flex-col" style={{ gap: "var(--space-3)" }}>
      {sp.baru && (
        <PesanSukses
          pesan={t.pengajuanHal.baruTerkirim.replace("{kode}", sp.baru)}
        />
      )}

      {sp.kembali && (
        <PesanSukses
          pesan={t.pengajuanHal.kembaliTerkirim.replace("{kode}", sp.kembali)}
        />
      )}

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {FILTER.map((f) => (
          <Link
            key={f.kunci}
            href={f.kunci === "SEMUA" ? "/pengajuan" : `/pengajuan?status=${f.kunci}`}
            className={`btn ${f.kunci === aktif.kunci ? "btn-primary" : "btn-secondary"}`}
            style={{ fontSize: 12.5 }}
          >
            {labelFilter(f.kunci)}
          </Link>
        ))}
      </div>

      {daftar.map((p) => (
        <div key={p.id} className="card elev-sm" style={{ background: "var(--color-neutral-100)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
            <span className="mono" style={{ fontSize: 11, color: "var(--color-neutral-600)" }}>
              {p.kode}
            </span>
            <BadgeStatus status={p.status} />
            <span
              style={{
                marginLeft: "auto", fontSize: 11.5,
                color: "var(--color-neutral-600)",
              }}
            >
              {t.umum.diajukanPada.replace("{tanggal}", fmtTanggal(p.diajukanPada, t))}
            </span>
          </div>

          <div className="card-title">{teksItem(p.items)}</div>

          <div
            style={{
              display: "flex", gap: 16, flexWrap: "wrap",
              fontSize: 12.5, color: "var(--color-neutral-700)",
            }}
          >
            <span>{fmtRentang(p.mulai, p.selesai, t)}</span>
            <span>
              {hitungHari(p.mulai, p.selesai) === 1
                ? t.umum.nHariSatu
                : t.umum.nHari.replace("{n}", String(hitungHari(p.mulai, p.selesai)))}
            </span>
            {p.namaKegiatan && <span>{p.namaKegiatan}</span>}
          </div>

          <GarisLangkah status={p.status} />

          {p.catatanAdmin && (
            <div
              style={{
                padding: "10px 13px", borderRadius: "var(--radius-md)",
                background:
                  p.status === "DITOLAK"
                    ? "var(--color-danger-200)"
                    : "var(--color-accent-2-200)",
                color:
                  p.status === "DITOLAK"
                    ? "var(--color-danger-900)"
                    : "var(--color-accent-2-900)",
              }}
            >
              <div
                style={{
                  fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase",
                  opacity: 0.75, marginBottom: 3,
                }}
              >
                {t.umum.catatanAdmin}
              </div>
              <div style={{ fontSize: 12.5 }}>{p.catatanAdmin}</div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
            {p.status === "DIPINJAM" && (
              <Link
                href={`/pengajuan/${p.id}/kembali`}
                className="btn btn-primary"
                style={{ fontSize: 12.5 }}
              >
                {t.umum.ajukanKembali}
              </Link>
            )}
            <Link
              href={`/pengajuan/${p.id}`}
              className="btn btn-secondary"
              style={{ fontSize: 12.5 }}
            >
              {t.umum.lihatRincian}
            </Link>
          </div>
        </div>
      ))}

      {daftar.length === 0 && (
        <div
          className="card"
          style={{
            alignItems: "center", textAlign: "center",
            padding: "var(--space-8)", background: "var(--color-neutral-100)",
          }}
        >
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>
            {t.pengajuanHal.kosong}
          </div>
          <p style={{ fontSize: 12.5, color: "var(--color-neutral-700)", margin: "4px 0 10px", maxWidth: "34ch" }}>
            {t.pengajuanHal.kosongIsi}
          </p>
          <Link href="/katalog" className="btn btn-primary">
            {t.umum.bukaKatalog}
          </Link>
        </div>
      )}
    </div>
  );
}
