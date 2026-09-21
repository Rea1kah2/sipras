import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { wajibAdmin } from "@/lib/auth";
import { puncakPemakaian } from "@/lib/ketersediaan";
import { cekTutup, pesanTutup } from "@/lib/penutupan";

import { teks } from "@/lib/preferensi-server";
import { fmtRentang, fmtTanggal, hitungHari } from "@/lib/waktu";
import { PILIH_PENGAJUAN, teksItem } from "@/lib/pengajuan";
import { BadgeStatus } from "@/components/badge";
import { PanelKeputusan } from "./panel-review";
import type { StatusPengajuan } from "@/generated/prisma/enums";

export async function generateMetadata(): Promise<Metadata> {
  const t = await teks();
  return { title: t.judul.adminReview[0] };
}

// Kunci stabil untuk URL, label terjemahan hanya untuk yang terlihat.
const FILTER: { kunci: string; status?: StatusPengajuan }[] = [
  { kunci: "SEMUA" },
  { kunci: "MENUNGGU", status: "MENUNGGU" },
  { kunci: "DISETUJUI", status: "DISETUJUI" },
  { kunci: "DIPINJAM", status: "DIPINJAM" },
  { kunci: "DITOLAK", status: "DITOLAK" },
];

export default async function Review(props: PageProps<"/admin/review">) {
  await wajibAdmin();
  const t = await teks();

  const sp = (await props.searchParams) as { q?: string; f?: string; p?: string };
  const q = (sp.q ?? "").trim();
  const aktifFilter = FILTER.find((f) => f.kunci === sp.f) ?? FILTER[0];
  const labelFilter = (k: string) => (k === "SEMUA" ? t.umum.semua : t.status[k]);

  const cocok = q
    ? {
        OR: [
          { kode: { contains: q, mode: "insensitive" as const } },
          { namaKegiatan: { contains: q, mode: "insensitive" as const } },
          { keperluan: { contains: q, mode: "insensitive" as const } },
          { pemohon: { nama: { contains: q, mode: "insensitive" as const } } },
          { pemohon: { unit: { contains: q, mode: "insensitive" as const } } },
          { items: { some: { namaAset: { contains: q, mode: "insensitive" as const } } } },
        ],
      }
    : {};

  const daftar = await prisma.pengajuan.findMany({
    where: {
      ...cocok,
      status: aktifFilter.status
        ? aktifFilter.status
        : { in: ["MENUNGGU", "DISETUJUI", "DIPINJAM", "DITOLAK"] },
    },
    orderBy: [{ status: "asc" }, { diajukanPada: "asc" }],
    select: PILIH_PENGAJUAN,
  });

  const terpilih =
    daftar.find((p) => p.id === sp.p) ?? daftar[0] ?? null;

  // Cek ketersediaan tiap item milik pengajuan terpilih, mengecualikan
  // pengajuan itu sendiri supaya pemakaiannya tidak dihitung melawan dirinya.
  // Hari tutup yang tersentuh pengajuan terpilih.
  //
  // Ini PERINGATAN, bukan penghalang, dan itu keputusan sadar. Admin bisa
  // menandai satu tanggal jadi tutup setelah pengajuan masuk, dan memblokir
  // persetujuannya berarti pengajuan itu tersangkut tanpa jalan keluar.
  // Admin adalah pemegang keputusan di sini, jadi yang dibutuhkannya adalah
  // tahu, bukan dilarang. Penolakan keras tetap ada di tempat yang benar,
  // yaitu saat peminjam mengajukan.
  const tutupTerpilih = terpilih
    ? (await cekTutup(prisma, terpilih.mulai, terpilih.selesai)).map((x) =>
        pesanTutup(x, t)
      )
    : [];

  let cekItem: { nama: string; meta: string; aman: boolean; teks: string }[] = [];
  if (terpilih) {
    const puncak = await puncakPemakaian(
      prisma,
      terpilih.items.map((i) => i.asetId),
      terpilih.mulai,
      terpilih.selesai,
      terpilih.id
    );
    cekItem = terpilih.items.map((it) => {
      const terpakai = puncak.get(it.asetId) ?? 0;
      const ruang = it.aset?.tipe === "RUANG";
      const stok = it.aset?.stok ?? 0;
      const aman = ruang ? terpakai === 0 : stok - terpakai >= it.jumlah;
      return {
        nama: ruang || it.jumlah === 1 ? it.namaAset : `${it.namaAset} x${it.jumlah}`,
        meta: ruang
          ? `${t.umum.ruang}, ${it.aset?.kapasitas || "-"}, ${it.aset?.lokasi ?? ""}`
          : `${t.umum.barang}, ${it.jumlah}/${stok} ${t.umum.unit}`,
        aman,
        teks: aman ? t.review.tersedia : ruang ? t.review.bentrok : t.review.stokKurang,
      };
    });
  }

  const tautan = (ubah: { q?: string; f?: string; p?: string }) => {
    const par = new URLSearchParams();
    const g = { q, f: aktifFilter.kunci, p: terpilih?.id, ...ubah };
    if (g.q) par.set("q", g.q);
    if (g.f && g.f !== "SEMUA") par.set("f", g.f);
    if (g.p) par.set("p", g.p);
    const s = par.toString();
    return s ? `/admin/review?${s}` : "/admin/review";
  };

  return (
    <div className="anim-rise flex flex-col" style={{ gap: "var(--space-3)" }}>
      <form
        method="GET"
        action="/admin/review"
        style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "flex-end" }}
      >
        <div className="field" style={{ flex: "1 1 220px", minWidth: 0 }}>
          <label htmlFor="q">{t.review.cari}</label>
          <input
            id="q"
            name="q"
            className="input"
            defaultValue={q}
            placeholder={t.review.cariContoh}
          />
        </div>
        {aktifFilter.kunci !== "SEMUA" && (
          <input type="hidden" name="f" value={aktifFilter.kunci} />
        )}
        <button type="submit" className="btn btn-secondary">
          {t.umum.cari}
        </button>
      </form>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {FILTER.map((f) => (
          <Link
            key={f.kunci}
            href={tautan({ f: f.kunci, p: undefined })}
            className={`btn ${f.kunci === aktifFilter.kunci ? "btn-primary" : "btn-secondary"}`}
            style={{ fontSize: 12.5 }}
          >
            {labelFilter(f.kunci)}
          </Link>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
          gap: "var(--space-4)",
          alignItems: "start",
        }}
      >
        {/* daftar */}
        <div className="flex flex-col" style={{ minWidth: 0, gap: 9 }}>
          <div style={{ fontSize: 12, color: "var(--color-neutral-600)" }}>
            {t.review.jumlah.replace("{n}", String(daftar.length))}
          </div>

          {daftar.map((p) => {
            const aktif = p.id === terpilih?.id;
            return (
              <Link
                key={p.id}
                href={tautan({ p: p.id })}
                aria-current={aktif ? "true" : undefined}
                className="kartu-pilih"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", width: "100%" }}>
                  <span className="mono" style={{ fontSize: 11, color: "var(--color-neutral-600)" }}>
                    {p.kode}
                  </span>
                  <BadgeStatus status={p.status} />
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--color-neutral-600)" }}>
                    {fmtTanggal(p.diajukanPada, t)}
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{p.pemohon.nama}</div>
                <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)" }}>
                  {teksItem(p.items)}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-neutral-600)" }}>
                  {fmtRentang(p.mulai, p.selesai, t)} · {hitungHari(p.mulai, p.selesai)} {t.umum.hari}
                </div>
              </Link>
            );
          })}

          {daftar.length === 0 && (
            <div
              className="card"
              style={{
                alignItems: "center", textAlign: "center",
                padding: "var(--space-8)", background: "var(--color-neutral-100)",
              }}
            >
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>
                {t.review.kosong}
              </div>
              <p style={{ fontSize: 12.5, color: "var(--color-neutral-700)", margin: "4px 0 0", maxWidth: "30ch" }}>
                {t.review.kosongIsi}
              </p>
            </div>
          )}
        </div>

        {/* panel detail */}
        {terpilih && (
          <div style={{ minWidth: 0, position: "sticky", top: 84 }}>
            <div className="card elev-md" style={{ background: "var(--color-neutral-100)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                <span className="mono" style={{ fontSize: 11.5, color: "var(--color-neutral-600)" }}>
                  {terpilih.kode}
                </span>
                <BadgeStatus status={terpilih.status} />
              </div>

              <h4 style={{ margin: "2px 0 0" }}>{terpilih.pemohon.nama}</h4>
              <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)" }}>
                {terpilih.pemohon.unit ?? "-"} · diajukan {fmtTanggal(terpilih.diajukanPada, t)}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
                  gap: 9, marginTop: 4,
                }}
              >
                {[
                  [t.ajukan.tanggal, fmtRentang(terpilih.mulai, terpilih.selesai, t)],
                  [
                    t.ajukan.durasi,
                    hitungHari(terpilih.mulai, terpilih.selesai) === 1
                      ? t.umum.nHariSatu
                      : t.umum.nHari.replace(
                          "{n}",
                          String(hitungHari(terpilih.mulai, terpilih.selesai))
                        ),
                  ],
                ].map(([label, nilai]) => (
                  <div
                    key={label}
                    style={{
                      padding: "10px 12px", borderRadius: "var(--radius-md)",
                      background: "var(--color-bg)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10.5, letterSpacing: ".06em",
                        textTransform: "uppercase", color: "var(--color-neutral-600)",
                      }}
                    >
                      {label}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{nilai}</div>
                  </div>
                ))}
              </div>

              <div>
                <div
                  style={{
                    fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase",
                    color: "var(--color-neutral-600)", marginBottom: 6,
                  }}
                >
                  {t.review.itemDiminta}
                </div>
                {tutupTerpilih.length > 0 && (
                  <div
                    style={{
                      display: "flex", flexDirection: "column", gap: 3,
                      padding: "10px 12px", marginBottom: 7,
                      borderRadius: "var(--radius-md)",
                      background: "var(--color-warn-200)",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-warn-900)" }}>
                      {t.jadwal.peringatanReview}
                    </div>
                    {tutupTerpilih.map((pesan, i) => (
                      <div key={i} style={{ fontSize: 11.5, color: "var(--color-warn-900)" }}>
                        {pesan}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col" style={{ gap: 7 }}>
                  {cekItem.map((it) => (
                    <div
                      key={it.nama}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "9px 11px", borderRadius: "var(--radius-md)",
                        background: "var(--color-bg)",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{it.nama}</div>
                        <div style={{ fontSize: 11, color: "var(--color-neutral-600)" }}>
                          {it.meta}
                        </div>
                      </div>
                      <span
                        className="tag"
                        style={{
                          flex: "none", fontWeight: 600,
                          background: it.aman
                            ? "var(--color-accent-2-200)"
                            : "var(--color-danger-200)",
                          color: it.aman
                            ? "var(--color-accent-2-800)"
                            : "var(--color-danger-800)",
                        }}
                      >
                        {it.teks}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  padding: "10px 12px", borderRadius: "var(--radius-md)",
                  background: "var(--color-bg)",
                }}
              >
                <div
                  style={{
                    fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase",
                    color: "var(--color-neutral-600)",
                  }}
                >
                  {t.rincian.keperluan}
                </div>
                {terpilih.namaKegiatan && (
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                    {terpilih.namaKegiatan}
                  </div>
                )}
                <div style={{ fontSize: 13, marginTop: 2 }}>{terpilih.keperluan}</div>
              </div>

              <PanelKeputusan
                pengajuanId={terpilih.id}
                bisaDiputuskan={terpilih.status === "MENUNGGU"}
              />

              {terpilih.status !== "MENUNGGU" && terpilih.catatanAdmin && (
                <div
                  style={{
                    padding: "10px 13px", borderRadius: "var(--radius-md)",
                    background:
                      terpilih.status === "DITOLAK"
                        ? "var(--color-danger-200)"
                        : "var(--color-accent-2-200)",
                    color:
                      terpilih.status === "DITOLAK"
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
                    {t.review.keputusanTercatat}
                  </div>
                  <div style={{ fontSize: 12.5 }}>{terpilih.catatanAdmin}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
