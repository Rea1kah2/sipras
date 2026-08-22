import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { wajibAdmin } from "@/lib/auth";

import { teks } from "@/lib/preferensi-server";
import { fmtRentang, fmtTanggal } from "@/lib/waktu";
import { teksItem } from "@/lib/pengajuan";
import { BadgeStatus } from "@/components/badge";
import { IkonNav } from "@/components/ikon-nav";
import { ambilLaporan, ambilRiwayat, bacaFilter, kriteria, opsiPeriode } from "./data";
import { GrafikBatang, GrafikPeringkat } from "@/components/grafik";

export async function generateMetadata(): Promise<Metadata> {
  const t = await teks();
  return { title: t.judul.adminRiwayat[0] };
}

export default async function Riwayat(props: PageProps<"/admin/riwayat">) {
  await wajibAdmin();
  const t = await teks();
  const sp = (await props.searchParams) as { q?: string; periode?: string; v?: string };
  const filter = bacaFilter(sp);
  // Tab dipilih lewat parameter URL supaya cukup tautan biasa, tanpa
  // komponen klien. Polanya sama dengan penyaring di halaman review.
  const lihatGrafik = sp.v === "grafik";
  const laporan = lihatGrafik ? await ambilLaporan(filter) : null;

  const tautanTab = (v: string) => {
    const par = new URLSearchParams();
    if (filter.q) par.set("q", filter.q);
    if (filter.periode !== "SEMUA") par.set("periode", filter.periode);
    if (v) par.set("v", v);
    const q = par.toString();
    return q ? `/admin/riwayat?${q}` : "/admin/riwayat";
  };

  const [baris, selesai, ditolak] = await Promise.all([
    ambilRiwayat(filter),
    prisma.pengajuan.count({ where: { ...kriteria(filter), status: "SELESAI" } }),
    prisma.pengajuan.count({ where: { ...kriteria(filter), status: "DITOLAK" } }),
  ]);

  const peminjamUnik = new Set(baris.map((r) => r.pemohon.nama)).size;
  const barisItem = baris.reduce((n, r) => n + r.items.length, 0);

  const statistik = [
    { nilai: selesai, label: t.riwayat.statSelesai, ikon: "verifikasi" as const, latar: "var(--color-accent-2-200)", tinta: "var(--color-accent-2-800)" },
    { nilai: peminjamUnik, label: t.riwayat.statPeminjam, ikon: "pengguna" as const, latar: "var(--color-neutral-200)", tinta: "var(--color-neutral-800)" },
    { nilai: barisItem, label: t.riwayat.statBaris, ikon: "aset" as const, latar: "var(--color-neutral-200)", tinta: "var(--color-neutral-800)" },
    { nilai: ditolak, label: t.riwayat.statDitolak, ikon: "riwayat" as const, latar: "var(--color-danger-200)", tinta: "var(--color-danger-800)" },
  ];

  const paramCsv = new URLSearchParams();
  if (filter.q) paramCsv.set("q", filter.q);
  if (filter.periode !== "SEMUA") paramCsv.set("periode", filter.periode);

  return (
    <div className="anim-rise flex flex-col" style={{ gap: "var(--space-3)" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(158px,1fr))",
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

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Link
          href={tautanTab("")}
          className={`btn ${lihatGrafik ? "btn-secondary" : "btn-primary"}`}
          style={{ fontSize: 12.5 }}
        >
          {t.laporan.tabTabel}
        </Link>
        <Link
          href={tautanTab("grafik")}
          className={`btn ${lihatGrafik ? "btn-primary" : "btn-secondary"}`}
          style={{ fontSize: 12.5 }}
        >
          {t.laporan.tabGrafik}
        </Link>
      </div>

      <form
        method="GET"
        action="/admin/riwayat"
        style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "flex-end" }}
      >
        <div className="field" style={{ flex: "1 1 220px", minWidth: 0 }}>
          <label htmlFor="q">{t.riwayat.cari}</label>
          <input
            id="q"
            name="q"
            className="input"
            defaultValue={filter.q}
            placeholder={t.riwayat.cariContoh}
          />
        </div>
        <div className="field" style={{ flex: "0 1 200px" }}>
          <label htmlFor="periode">{t.riwayat.periode}</label>
          <select
            id="periode"
            name="periode"
            className="input"
            defaultValue={filter.periode}
          >
            {opsiPeriode(t).map((o) => (
              <option key={o.nilai} value={o.nilai}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {lihatGrafik && <input type="hidden" name="v" value="grafik" />}
        <button type="submit" className="btn btn-secondary">
          {t.umum.terapkan}
        </button>
        {/* Unduhan lewat tautan biasa, bukan aksi, supaya browser yang
            menangani penyimpanan berkasnya. */}
        <a
          className="btn btn-secondary"
          href={`/admin/riwayat/csv${paramCsv.toString() ? `?${paramCsv}` : ""}`}
          download
        >
          {t.riwayat.unduh}
        </a>
      </form>

      {lihatGrafik && laporan ? (
        laporan.total === 0 ? (
          <div
            className="card"
            style={{
              alignItems: "center", textAlign: "center",
              padding: "var(--space-8)", background: "var(--color-neutral-100)",
            }}
          >
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>
              {t.laporan.kosong}
            </div>
            <p style={{ fontSize: 12.5, color: "var(--color-neutral-700)", margin: "4px 0 0", maxWidth: "38ch" }}>
              {t.laporan.kosongIsi}
            </p>
          </div>
        ) : (
          <div className="grafik-susun">
            <div className="card elev-sm" style={{ background: "var(--color-neutral-100)" }}>
              <GrafikBatang
                judul={t.laporan.trenBulan}
                satuan={t.laporan.satuanPengajuan}
                data={laporan.perBulan.map((b) => {
                  const [thn, bln] = b.kunciBulan.split("-").map(Number);
                  return {
                    label: t.bulanPendek[bln - 1],
                    panjang: `${t.bulanPanjang[bln - 1]} ${thn}`,
                    nilai: b.jumlah,
                  };
                })}
              />
            </div>

            <div className="card elev-sm" style={{ background: "var(--color-neutral-100)" }}>
              <GrafikPeringkat
                judul={t.laporan.asetTeratas}
                satuan={t.laporan.satuanDipinjam}
                kosong={t.laporan.kosong}
                data={laporan.asetTeratas.map((a) => ({ label: a.nama, nilai: a.jumlah }))}
              />
            </div>

            <div className="card elev-sm" style={{ background: "var(--color-neutral-100)" }}>
              <GrafikPeringkat
                judul={t.laporan.unitTeratas}
                satuan={t.laporan.satuanPengajuan}
                kosong={t.laporan.kosong}
                data={laporan.unitTeratas.map((u) => ({ label: u.nama, nilai: u.jumlah }))}
              />
            </div>

            <div className="card elev-sm" style={{ background: "var(--color-neutral-100)" }}>
              <div className="grafik-angka">
                <span className="grafik-angka-nilai">{laporan.rataHari}</span>
                <span className="grafik-angka-label">
                  {t.laporan.rataDurasi} ({t.laporan.satuanHari})
                </span>
              </div>
              <GrafikBatang
                judul={t.laporan.durasi}
                satuan={t.laporan.satuanPengajuan}
                data={laporan.sebaranDurasi.map((d) => ({
                  label: d.hari,
                  panjang:
                    d.hari === "4+"
                      ? t.laporan.empatPlus
                      : d.hari === "1"
                        ? t.laporan.hariLabelSatu
                        : t.laporan.hariLabel.replace("{n}", d.hari),
                  nilai: d.jumlah,
                }))}
              />
            </div>
          </div>
        )
      ) : (

      <div
        className="card elev-sm table-wrap"
        style={{ padding: "var(--space-2) var(--space-3)", background: "var(--color-neutral-100)" }}
      >
        <table className="table">
          <thead>
            <tr>
              <th>{t.riwayat.kolomKode}</th>
              <th>{t.riwayat.kolomPeminjam}</th>
              <th>{t.riwayat.kolomItem}</th>
              <th>{t.riwayat.kolomTanggal}</th>
              <th>{t.riwayat.kolomDikembalikan}</th>
              <th>{t.riwayat.kolomKondisi}</th>
              <th>{t.riwayat.kolomStatus}</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((r) => (
              <tr key={r.id}>
                <td className="mono" style={{ fontSize: 11.5, whiteSpace: "nowrap" }}>
                  <Link href={`/pengajuan/${r.id}`} className="tautan">
                    {r.kode}
                  </Link>
                </td>
                <td style={{ minWidth: 130 }}>
                  <div style={{ fontWeight: 600 }}>{r.pemohon.nama}</div>
                  <div style={{ fontSize: 11, color: "var(--color-neutral-600)" }}>
                    {r.pemohon.unit ?? "-"}
                  </div>
                </td>
                <td style={{ minWidth: 190 }}>{teksItem(r.items)}</td>
                <td style={{ whiteSpace: "nowrap" }}>{fmtRentang(r.mulai, r.selesai, t)}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {r.pengembalian ? fmtTanggal(r.pengembalian.tanggalKembali, t) : "-"}
                </td>
                <td style={{ minWidth: 130 }}>
                  {r.pengembalian ? t.kondisi[r.pengembalian.kondisiRingkas] : "-"}
                </td>
                <td>
                  <BadgeStatus status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}


      {!lihatGrafik && baris.length === 0 && (
        <div
          className="card"
          style={{
            alignItems: "center", textAlign: "center",
            padding: "var(--space-8)", background: "var(--color-neutral-100)",
          }}
        >
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>
            {t.riwayat.kosong}
          </div>
          <p style={{ fontSize: 12.5, color: "var(--color-neutral-700)", margin: "4px 0 0", maxWidth: "34ch" }}>
            {t.riwayat.kosongIsi}
          </p>
        </div>
      )}

      <div style={{ fontSize: 11.5, color: "var(--color-neutral-600)" }}>
        {lihatGrafik
          ? t.laporan.catatan
          : t.riwayat.catatan.replace("{n}", String(baris.length))}
      </div>
    </div>
  );
}
