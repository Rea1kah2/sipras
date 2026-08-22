import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { teks } from "@/lib/preferensi-server";
import { wajibAdmin } from "@/lib/auth";
import { ringkasKetersediaan } from "@/lib/ketersediaan";
import { fmtRentang, fmtTanggal, fmtTanggalPanjang, dariISO, hariIniISO, hitungHari, sisaHari } from "@/lib/waktu";
import { PILIH_PENGAJUAN, teksItem } from "@/lib/pengajuan";
import { BadgeStatus } from "@/components/badge";
import { IkonNav } from "@/components/ikon-nav";

export async function generateMetadata(): Promise<Metadata> {
  const t = await teks();
  return { title: t.judul.admin[0] };
}

export default async function DasborAdmin() {
  const user = await wajibAdmin();
  const t = await teks();

  const hariIni = dariISO(hariIniISO());

  const [menunggu, dikembalikan, dipinjam, jumlahAset, antrean, jatuhTempo, terlambat, barang] =
    await Promise.all([
      prisma.pengajuan.count({ where: { status: "MENUNGGU" } }),
      prisma.pengajuan.count({ where: { status: "DIKEMBALIKAN" } }),
      prisma.pengajuan.count({ where: { status: "DIPINJAM" } }),
      prisma.aset.count({ where: { aktif: true } }),
      prisma.pengajuan.findMany({
        where: { status: { in: ["MENUNGGU", "DIKEMBALIKAN"] } },
        orderBy: [{ status: "asc" }, { diajukanPada: "asc" }],
        take: 5,
        select: PILIH_PENGAJUAN,
      }),
      prisma.pengajuan.findMany({
        where: { status: "DIPINJAM", selesai: { gte: hariIni } },
        orderBy: { selesai: "asc" },
        take: 3,
        select: PILIH_PENGAJUAN,
      }),
      // Yang sudah lewat tenggat sebelumnya tidak muncul di mana pun, karena
      // kartu jatuh tempo hanya mengambil yang selesainya belum lewat. Jadi
      // barang yang paling perlu ditagih justru yang paling tidak terlihat.
      prisma.pengajuan.findMany({
        where: { status: "DIPINJAM", selesai: { lt: hariIni } },
        orderBy: { selesai: "asc" },
        take: 5,
        select: PILIH_PENGAJUAN,
      }),
      prisma.aset.findMany({
        where: { aktif: true, tipe: "BARANG" },
        select: { id: true, nama: true, tipe: true, stok: true },
      }),
    ]);

  // Stok menipis dihitung dari stok dikurangi yang sedang dipinjam hari ini,
  // bukan dari kolom tersimpan.
  const tersedia = await ringkasKetersediaan(prisma, barang, hariIni, hariIni, t.katalog);
  const menipis = barang
    .map((a) => {
      const av = tersedia.get(a.id)!;
      return { nama: a.nama, sisa: av.tersedia, total: av.total, rasio: av.tersedia / av.total };
    })
    .sort((x, y) => x.rasio - y.rasio)
    .slice(0, 3);

  // Warna pindah ke lingkaran ikon, bukan ke seluruh permukaan kartu, jadi
  // tetap menandai arti tanpa membuat halaman terasa blok blok.
  const statistik = [
    { nilai: menunggu, label: t.admin.statMenunggu, ikon: "review" as const, latar: "var(--color-warn-200)", tinta: "var(--color-warn-800)" },
    { nilai: dikembalikan, label: t.admin.statVerifikasi, ikon: "verifikasi" as const, latar: "var(--color-accent-2-200)", tinta: "var(--color-accent-2-800)" },
    { nilai: dipinjam, label: t.admin.statDipinjam, ikon: "pengajuan" as const, latar: "var(--color-accent-200)", tinta: "var(--color-accent-800)" },
    { nilai: jumlahAset, label: t.admin.statAset, ikon: "aset" as const, latar: "var(--color-neutral-200)", tinta: "var(--color-neutral-800)" },
  ];

  return (
    <div className="anim-rise flex flex-col" style={{ gap: "var(--space-4)" }}>
      <div>
        <h2 style={{ margin: "0 0 4px" }}>Halo, {user.nama.split(" ")[0]}.</h2>
        <p style={{ fontSize: 13.5, color: "var(--color-neutral-700)", margin: 0 }}>
          {fmtTanggalPanjang(hariIniISO(), t)} ·{" "}
          {t.admin.ringkas.replace("{a}", String(menunggu)).replace("{b}", String(dikembalikan))}
        </p>
      </div>

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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))",
          gap: "var(--space-4)",
          alignItems: "start",
        }}
      >
        {/* antrean kerja */}
        <div className="flex flex-col" style={{ minWidth: 0, gap: "var(--space-3)" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
            <h4 style={{ margin: 0 }}>{t.admin.perluTindakan}</h4>
            <Link href="/admin/review" className="tautan" style={{ fontSize: 12.5 }}>
              {t.admin.bukaReview}
            </Link>
          </div>

          {antrean.map((p) => (
            <div key={p.id} className="card elev-sm" style={{ background: "var(--color-neutral-100)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--color-neutral-600)" }}>
                  {p.kode}
                </span>
                <BadgeStatus status={p.status} />
                <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--color-neutral-600)" }}>
                  {fmtTanggal(p.diajukanPada, t)}
                </span>
              </div>
              <div className="card-title">{teksItem(p.items)}</div>
              <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)" }}>
                {p.pemohon.nama} · {p.pemohon.unit ?? "-"}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)" }}>
                {fmtRentang(p.mulai, p.selesai, t)} · {hitungHari(p.mulai, p.selesai)} {t.umum.hari}
              </div>
              <Link
                href={p.status === "DIKEMBALIKAN" ? "/admin/verifikasi" : `/admin/review?p=${p.id}`}
                className="btn btn-primary"
                style={{ alignSelf: "flex-start", fontSize: 12.5, marginTop: 4 }}
              >
                {p.status === "DIKEMBALIKAN" ? t.admin.verifikasiItem : t.admin.bukaReviewItem}
              </Link>
            </div>
          ))}

          {antrean.length === 0 && (
            <div
              className="card"
              style={{
                alignItems: "center", textAlign: "center",
                padding: "var(--space-8)", background: "var(--color-neutral-100)",
              }}
            >
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>{t.admin.antreanKosong}</div>
              <p style={{ fontSize: 12.5, color: "var(--color-neutral-700)", margin: "4px 0 0", maxWidth: "32ch" }}>
                {t.admin.antreanKosongIsi}
              </p>
            </div>
          )}
        </div>

        {/* sisi kanan */}
        <div className="flex flex-col" style={{ minWidth: 0, gap: "var(--space-3)" }}>
          {/* Ditaruh paling atas karena paling mendesak: barangnya sudah
              menahan ketersediaan orang lain. */}
          {terlambat.length > 0 && (
            <div className="card elev-sm" style={{ background: "var(--color-danger-200)" }}>
              <span className="card-kicker" style={{ color: "var(--color-danger-800)" }}>
                {t.admin.terlambat}
              </span>
              {terlambat.map((p) => {
                const lewat = Math.abs(sisaHari(p.selesai));
                return (
                  <div
                    key={p.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 0",
                      borderBottom: "1px solid var(--color-danger-300)",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-danger-900)" }}>
                        {teksItem(p.items)}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--color-danger-800)" }}>
                        {p.pemohon.nama} · {t.admin.kembaliPada.replace("{tgl}", fmtTanggal(p.selesai, t))}
                      </div>
                    </div>
                    <span
                      className="tag"
                      style={{
                        background: "var(--color-danger-700)",
                        color: "var(--color-di-atas-solid)",
                        fontWeight: 600, flex: "none",
                      }}
                    >
                      {lewat === 1
                        ? t.admin.terlambatSehari
                        : t.admin.terlambatHari.replace("{n}", String(lewat))}
                    </span>
                  </div>
                );
              })}
              <div style={{ fontSize: 11, color: "var(--color-danger-800)" }}>
                {t.admin.tagih}
              </div>
            </div>
          )}

          <div className="card elev-sm" style={{ background: "var(--color-warn-200)" }}>
            <span className="card-kicker" style={{ color: "var(--color-warn-800)" }}>
              {t.admin.jatuhTempo}
            </span>
            {jatuhTempo.map((p) => {
              const sisa = sisaHari(p.selesai);
              return (
                <div
                  key={p.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 0", borderBottom: "1px solid var(--color-warn-300)",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-warn-900)" }}>
                      {teksItem(p.items)}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--color-warn-800)" }}>
                      {p.pemohon.nama} · {t.admin.kembaliPada.replace("{tgl}", fmtTanggal(p.selesai, t))}
                    </div>
                  </div>
                  <span
                    className="tag"
                    style={{
                      background: "var(--color-bg)",
                      color: "var(--color-warn-800)",
                      fontWeight: 600,
                    }}
                  >
                    {sisa <= 0 ? t.admin.hariIni : sisa === 1
                          ? t.admin.hariLagiSatu
                          : t.admin.hariLagi.replace("{n}", String(sisa))}
                  </span>
                </div>
              );
            })}
            {jatuhTempo.length === 0 && (
              <div style={{ fontSize: 12.5, color: "var(--color-warn-900)" }}>
              {t.admin.jatuhTempoKosong}
              </div>
            )}
          </div>

          <div className="card elev-sm" style={{ background: "var(--color-neutral-100)" }}>
            <span className="card-kicker">{t.admin.stokMenipis}</span>
            {menipis.map((m) => (
              <div key={m.nama} style={{ padding: "7px 0", borderBottom: "1px solid var(--color-divider)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13 }}>
                  <span>{m.nama}</span>
                  <b>
                    {m.sisa}/{m.total}
                  </b>
                </div>
                <div
                  style={{
                    height: 7, borderRadius: 999, marginTop: 5,
                    background: "var(--color-neutral-200)", overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.round(m.rasio * 100)}%`,
                      borderRadius: 999,
                      background:
                        m.rasio < 0.4
                          ? "var(--color-warn-600)"
                          : "var(--color-accent-2-600)",
                    }}
                  />
                </div>
              </div>
            ))}
            <div style={{ fontSize: 11, color: "var(--color-neutral-600)" }}>
              {t.admin.stokCatatan}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
