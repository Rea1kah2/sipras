import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { wajibAdmin } from "@/lib/auth";

import { teks } from "@/lib/preferensi-server";
import { fmtRentang, fmtTanggal } from "@/lib/waktu";
import { teksItem } from "@/lib/pengajuan";
import { BadgeStatus } from "@/components/badge";
import { PanelVerifikasi } from "./panel-verifikasi";

export async function generateMetadata(): Promise<Metadata> {
  const t = await teks();
  return { title: t.judul.adminVerifikasi[0] };
}

export default async function Verifikasi() {
  await wajibAdmin();
  const t = await teks();

  const antrean = await prisma.pengajuan.findMany({
    where: { status: "DIKEMBALIKAN" },
    orderBy: { diubahPada: "asc" },
    select: {
      id: true,
      kode: true,
      status: true,
      mulai: true,
      selesai: true,
      pemohon: { select: { nama: true, unit: true } },
      items: {
        select: { namaAset: true, jumlah: true, aset: { select: { tipe: true } } },
      },
      pengembalian: {
        select: {
          tanggalKembali: true,
          kondisiRingkas: true,
          catatan: true,
          items: {
            select: {
              kondisi: true,
              pengajuanItem: { select: { namaAset: true } },
            },
          },
        },
      },
    },
  });

  return (
    <div className="anim-rise flex flex-col" style={{ gap: "var(--space-3)" }}>
      <p
        style={{
          fontSize: 13.5,
          color: "var(--color-neutral-700)",
          margin: 0,
          maxWidth: "60ch",
        }}
      >
        {t.verifikasi.intro}
      </p>

      {antrean.map((p) => {
        const retur = p.pengembalian;
        const rusak = retur ? retur.kondisiRingkas !== "BAIK" : false;
        return (
          <div key={p.id} className="card elev-sm" style={{ background: "var(--color-neutral-100)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--color-neutral-600)" }}>
                {p.kode}
              </span>
              <BadgeStatus status={p.status} />
              <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--color-neutral-600)" }}>
                {t.umum.dikembalikanPada.replace(
                  "{tanggal}",
                  retur ? fmtTanggal(retur.tanggalKembali, t) : t.umum.tidakAda
                )}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
                gap: "var(--space-3)",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div className="card-title">{teksItem(p.items)}</div>
                <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)" }}>
                  {p.pemohon.nama} · {p.pemohon.unit ?? "-"}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)" }}>
                  {t.umum.dipakai.replace("{rentang}", fmtRentang(p.mulai, p.selesai, t))}
                </div>

                {/* Kondisi per item, bukan hanya ringkasannya, supaya admin
                    tahu persis unit mana yang perlu diperiksa lebih teliti. */}
                <div className="flex flex-col" style={{ gap: 5, marginTop: 9 }}>
                  {retur?.items.map((i) => (
                    <div
                      key={i.pengajuanItem.namaAset}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        justifyContent: "space-between", fontSize: 12.5,
                      }}
                    >
                      <span style={{ minWidth: 0 }}>{i.pengajuanItem.namaAset}</span>
                      <span
                        className="tag"
                        style={{
                          flex: "none", fontWeight: 600,
                          background:
                            i.kondisi === "BAIK"
                              ? "var(--color-accent-2-200)"
                              : "var(--color-danger-200)",
                          color:
                            i.kondisi === "BAIK"
                              ? "var(--color-accent-2-800)"
                              : "var(--color-danger-800)",
                        }}
                      >
                        {t.kondisi[i.kondisi]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col" style={{ minWidth: 0, gap: 8 }}>
                <div
                  style={{
                    padding: "11px 13px",
                    borderRadius: "var(--radius-md)",
                    background: rusak ? "var(--color-danger-200)" : "var(--color-accent-2-200)",
                    color: rusak ? "var(--color-danger-900)" : "var(--color-accent-2-900)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase",
                      opacity: 0.75, marginBottom: 3,
                    }}
                  >
                    {t.verifikasi.laporanKondisi}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {retur ? t.kondisi[retur.kondisiRingkas] : "-"}
                  </div>
                  <div style={{ fontSize: 12.5, marginTop: 3 }}>
                    {retur?.catatan || t.verifikasi.tanpaCatatan}
                  </div>
                </div>

                <PanelVerifikasi pengajuanId={p.id} kode={p.kode} />
              </div>
            </div>
          </div>
        );
      })}

      {antrean.length === 0 && (
        <div
          className="card"
          style={{
            alignItems: "center", textAlign: "center",
            padding: "var(--space-8)", background: "var(--color-neutral-100)",
          }}
        >
          <div
            aria-hidden
            style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "var(--color-accent-2-200)",
              display: "grid", placeItems: "center", marginBottom: 6,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-2-700)" strokeWidth="2.75" strokeLinecap="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>
            {t.verifikasi.kosong}
          </div>
          <p style={{ fontSize: 12.5, color: "var(--color-neutral-700)", margin: "4px 0 0", maxWidth: "34ch" }}>
            {t.verifikasi.kosongIsi}
          </p>
        </div>
      )}
    </div>
  );
}
