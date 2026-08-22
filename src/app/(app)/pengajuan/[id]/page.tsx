import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { wajibLogin } from "@/lib/auth";

import { teks } from "@/lib/preferensi-server";
import { fmtRentang, fmtTanggal, fmtWaktu, hitungHari } from "@/lib/waktu";
import { PILIH_PENGAJUAN, teksItem } from "@/lib/pengajuan";
import { ambilPengaturan } from "@/lib/penutupan";
import { BadgeStatus, GarisLangkah } from "@/components/badge";
import { IlustrasiAset } from "@/components/ilustrasi-aset";

export async function generateMetadata(): Promise<Metadata> {
  const t = await teks();
  return { title: t.judul.pengajuanDetail[0] };
}

export default async function DetailPengajuan(
  props: PageProps<"/pengajuan/[id]">
) {
  const user = await wajibLogin();
  const t = await teks();
  const { id } = await props.params;

  const pengajuan = await prisma.pengajuan.findUnique({
    where: { id },
    select: {
      ...PILIH_PENGAJUAN,
      kontakWhatsapp: true,
      dilihatPada: true,
      riwayatStatus: {
        orderBy: { waktu: "asc" },
        select: {
          id: true,
          dari: true,
          ke: true,
          catatan: true,
          waktu: true,
          oleh: { select: { nama: true } },
        },
      },
      pengembalian: {
        select: {
          tanggalKembali: true,
          kondisiRingkas: true,
          catatan: true,
          diverifikasi: true,
          catatanVerifikasi: true,
          verifikator: { select: { nama: true } },
          items: {
            select: {
              kondisi: true,
              catatan: true,
              pengajuanItem: { select: { namaAset: true } },
            },
          },
        },
      },
    },
  });

  const admin = user.peran === "ADMIN";
  const pengaturan = await ambilPengaturan(prisma);

  // Peminjam hanya boleh melihat miliknya sendiri. Milik orang lain
  // diperlakukan seolah tidak ada, supaya URL tidak bisa dipakai menebak
  // keberadaan data orang lain.
  if (!pengajuan || (!admin && pengajuan.pemohon.id !== user.id)) notFound();

  // Membuka rincian berarti peminjam sudah melihat kabarnya, jadi lencana di
  // menu Pengajuan saya berkurang satu. Hanya berlaku untuk pemiliknya, dan
  // hanya kalau memang ada yang belum dilihat, supaya tidak menulis ke
  // database di setiap kali halaman dimuat.
  if (!admin && pengajuan.pemohon.id === user.id) {
    const terakhir = pengajuan.riwayatStatus.at(-1)?.waktu;
    const perlu =
      terakhir && (!pengajuan.dilihatPada || terakhir > pengajuan.dilihatPada);
    if (perlu) {
      await prisma.pengajuan.update({
        where: { id },
        data: { dilihatPada: new Date() },
      });
    }
  }

  const retur = pengajuan.pengembalian;

  return (
    <div className="anim-rise flex flex-col" style={{ gap: "var(--space-4)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Link
          href={admin ? "/admin/riwayat" : "/pengajuan"}
          className="tautan"
          style={{ fontSize: 13 }}
        >
          ← {admin ? t.nav.riwayat : t.nav.pengajuan}
        </Link>
        <Link
          href={`/pengajuan/${id}/cetak`}
          className="btn btn-secondary"
          style={{ fontSize: 12.5, marginLeft: "auto" }}
        >
          {t.cetak.tombol}
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))",
          gap: "var(--space-4)",
          alignItems: "start",
        }}
      >
        {/* kiri: isi pengajuan */}
        <div className="flex flex-col" style={{ minWidth: 0, gap: "var(--space-3)" }}>
          <div className="card elev-sm" style={{ background: "var(--color-neutral-100)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
              <span className="mono" style={{ fontSize: 11.5, color: "var(--color-neutral-600)" }}>
                {pengajuan.kode}
              </span>
              <BadgeStatus status={pengajuan.status} />
            </div>

            <div className="card-title">{teksItem(pengajuan.items)}</div>
            <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)" }}>
              {fmtRentang(pengajuan.mulai, pengajuan.selesai, t)} ·{" "}
              {hitungHari(pengajuan.mulai, pengajuan.selesai)} {t.umum.hari}
            </div>

            <GarisLangkah status={pengajuan.status} />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
                gap: 9,
                marginTop: 4,
              }}
            >
              {[
                [t.rincian.pemohon, pengajuan.pemohon.nama],
                [t.rincian.unit, pengajuan.pemohon.unit ?? "-"],
                [t.rincian.diajukan, fmtTanggal(pengajuan.diajukanPada, t)],
                [t.rincian.kontak, pengajuan.kontakWhatsapp ?? "-"],
              ].map(([label, nilai]) => (
                <div
                  key={label}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "var(--radius-md)",
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
          </div>

          {/* item */}
          <div className="card elev-sm" style={{ background: "var(--color-neutral-100)" }}>
            <span className="card-kicker">{t.rincian.itemDipinjam}</span>
            {pengajuan.items.map((it) => (
              <div
                key={it.id}
                style={{
                  display: "flex", alignItems: "center", gap: 11,
                  padding: 10, borderRadius: "var(--radius-md)",
                  background: "var(--color-bg)",
                }}
              >
                <div style={{ width: 44, height: 44, flex: "none" }}>
                  {it.aset?.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.aset.foto}
                      alt=""
                      style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 12 }}
                    />
                  ) : (
                    <IlustrasiAset
                      kategori={it.aset?.kategori ?? ""}
                      tipe={it.aset?.tipe ?? "BARANG"}
                      tinggi={44}
                      radius="12px"
                    />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{it.namaAset}</div>
                  <div style={{ fontSize: 11.5, color: "var(--color-neutral-600)" }}>
                    {it.aset?.tipe === "RUANG"
                      ? `Ruang di ${it.aset.lokasi}`
                      : `Barang, ${it.jumlah} unit`}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* keperluan */}
          <div className="card elev-sm" style={{ background: "var(--color-neutral-100)" }}>
            <span className="card-kicker">{t.rincian.keperluan}</span>
            {pengajuan.namaKegiatan && (
              <div style={{ fontSize: 14, fontWeight: 600 }}>{pengajuan.namaKegiatan}</div>
            )}
            <p style={{ fontSize: 13, margin: 0, color: "var(--color-neutral-800)" }}>
              {pengajuan.keperluan}
            </p>
          </div>

          {pengajuan.catatanAdmin && (
            <div
              className="card elev-sm"
              style={{
                background:
                  pengajuan.status === "DITOLAK"
                    ? "var(--color-danger-200)"
                    : "var(--color-accent-2-200)",
                color:
                  pengajuan.status === "DITOLAK"
                    ? "var(--color-danger-900)"
                    : "var(--color-accent-2-900)",
              }}
            >
              <span className="card-kicker" style={{ color: "inherit", opacity: 0.75 }}>
                {t.umum.catatanAdmin}
              </span>
              <p style={{ fontSize: 13, margin: 0 }}>{pengajuan.catatanAdmin}</p>
            </div>
          )}
        </div>

        {/* kanan: jejak status dan pengembalian */}
        <div className="flex flex-col" style={{ minWidth: 0, gap: "var(--space-3)" }}>
          <div className="card elev-sm" style={{ background: "var(--color-neutral-100)" }}>
            <span className="card-kicker">{t.rincian.jejakStatus}</span>
            <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {pengajuan.riwayatStatus.map((r, i) => {
                const terakhir = i === pengajuan.riwayatStatus.length - 1;
                return (
                  <li key={r.id} style={{ display: "flex", gap: 11 }}>
                    {/* garis vertikal penyambung, bukan sekadar daftar datar */}
                    <div
                      aria-hidden
                      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
                    >
                      <span
                        style={{
                          width: 11, height: 11, borderRadius: "50%", flex: "none",
                          background: terakhir
                            ? "var(--color-accent-2-600)"
                            : "var(--color-neutral-300)",
                        }}
                      />
                      {!terakhir && (
                        <span
                          style={{
                            width: 2, flex: 1, minHeight: 22,
                            background: "var(--color-neutral-300)",
                          }}
                        />
                      )}
                    </div>
                    <div style={{ minWidth: 0, paddingBottom: terakhir ? 0 : 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {t.status[r.ke]}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-neutral-600)" }}>
                        {fmtWaktu(r.waktu, t)}
                        {r.oleh ? ` oleh ${r.oleh.nama}` : " oleh sistem"}
                      </div>
                      {r.catatan && (
                        <div
                          style={{
                            fontSize: 12, marginTop: 3,
                            color: "var(--color-neutral-700)",
                          }}
                        >
                          {r.catatan}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {retur && (
            <div className="card elev-sm" style={{ background: "var(--color-neutral-100)" }}>
              <span className="card-kicker">{t.rincian.pengembalian}</span>
              <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)" }}>
                {t.umum.dikembalikanPada.replace(
                  "{tanggal}",
                  fmtTanggal(retur.tanggalKembali, t)
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {t.kondisi[retur.kondisiRingkas]}
              </div>
              {retur.catatan && (
                <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)" }}>
                  {retur.catatan}
                </div>
              )}

              <div className="flex flex-col" style={{ gap: 5, marginTop: 4 }}>
                {retur.items.map((i) => (
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

              {retur.diverifikasi && (
                <div
                  style={{
                    marginTop: 4, padding: "10px 12px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-accent-2-200)",
                    color: "var(--color-accent-2-900)",
                    fontSize: 12.5,
                  }}
                >
                  {t.rincian.diverifikasiOleh.replace(
                    "{nama}",
                    retur.verifikator?.nama ?? t.peran.admin
                  )}{" "}
                  {retur.catatanVerifikasi}
                </div>
              )}
            </div>
          )}

          {/* Disetujui BUKAN akhir alur bagi peminjam: masih ada satu langkah
              yang harus ia lakukan sendiri, yaitu datang mengambil. Sejak
              perpindahan otomatis berdasarkan tanggal dihapus, langkah itu
              wajib dikatakan terang terangan, kalau tidak orang akan menunggu
              status berubah sendiri padahal tidak akan pernah. Jam layanannya
              ikut disebut supaya ia tahu kapan loketnya buka. */}
          {pengajuan.status === "DISETUJUI" && !admin && (
            <div
              className="card"
              style={{ background: "var(--color-accent-200)", gap: 3 }}
            >
              <div
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: 15,
                  color: "var(--color-accent-900)",
                }}
              >
                {t.pengajuanHal.menungguDiambil}
              </div>
              <p style={{ fontSize: 12.5, margin: 0, color: "var(--color-accent-900)" }}>
                {t.pengajuanHal.menungguDiambilIsi.replace(
                  "{tanggal}",
                  fmtTanggal(pengajuan.mulai, t)
                )}{" "}
                {t.jadwal.bukaJam
                  .replace("{buka}", pengaturan.jamBuka)
                  .replace("{tutup}", pengaturan.jamTutup)}
              </p>
            </div>
          )}

          {pengajuan.status === "DIPINJAM" && !admin && (
            <Link href={`/pengajuan/${pengajuan.id}/kembali`} className="btn btn-primary">
              {t.umum.ajukanKembali}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
