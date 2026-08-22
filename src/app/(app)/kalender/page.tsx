import type { Metadata } from "next";
import Link from "next/link";
import { wajibLogin } from "@/lib/auth";
import { teks } from "@/lib/preferensi-server";
import { geserPekan, jadwalRuang, pekanDari, tanggalSah } from "@/lib/kalender";
import { pesanTutup, tanggalTutup } from "@/lib/penutupan";
import { prisma } from "@/lib/prisma";
import { dariISO, fmtTanggal, hariIniISO } from "@/lib/waktu";

export async function generateMetadata(): Promise<Metadata> {
  const t = await teks();
  return { title: t.kalender.judul };
}

export default async function Kalender(props: PageProps<"/kalender">) {
  const user = await wajibLogin();
  const t = await teks();

  const sp = (await props.searchParams) as { p?: string };
  const isoHariIni = hariIniISO();

  // Acuan pekan diambil dari URL supaya tombol maju mundur bisa berupa
  // tautan biasa. Nilai yang tidak masuk akal jatuh kembali ke hari ini,
  // jadi URL yang diutak atik tidak bisa membuat halaman ini gagal.
  const acuan = tanggalSah(sp.p ?? "") ? sp.p! : isoHariIni;
  const hari = pekanDari(acuan);
  const awal = dariISO(hari[0]);
  const akhir = dariISO(hari[6]);

  // Tutup diambil dari sumber yang SAMA dengan yang menolak pengajuan, yaitu
  // lib/penutupan.ts. Kalau kalender menghitung tutup dengan caranya sendiri,
  // ia bisa memperlihatkan slot kosong yang ternyata ditolak saat dikirim, dan
  // itu jenis bug yang paling merusak kepercayaan. Alasannya sama dengan
  // mengapa jadwalRuang meminjam definisi bentrok dari lib/ketersediaan.ts.
  const [baris, tutup] = await Promise.all([
    jadwalRuang(awal, akhir),
    tanggalTutup(prisma, awal, akhir),
  ]);
  const admin = user.peran === "ADMIN";

  const tautan = (p: string) => `/kalender?p=${p}`;
  const namaHari = t.hariPanjang;

  return (
    <div className="anim-rise flex flex-col" style={{ gap: "var(--space-3)" }}>
      {/* penggeser pekan */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 8,
          flexWrap: "wrap", justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link
            href={tautan(geserPekan(hari[0], -1))}
            className="btn btn-secondary"
            style={{ fontSize: 12.5 }}
            aria-label={t.kalender.sebelumnya}
          >
            ←
          </Link>
          <Link href={tautan(isoHariIni)} className="btn btn-secondary" style={{ fontSize: 12.5 }}>
            {t.kalender.pekanIni}
          </Link>
          <Link
            href={tautan(geserPekan(hari[0], 1))}
            className="btn btn-secondary"
            style={{ fontSize: 12.5 }}
            aria-label={t.kalender.berikutnya}
          >
            →
          </Link>
        </div>

        <div style={{ fontSize: 13, fontWeight: 600 }}>
          {fmtTanggal(hari[0], t)} &ndash;&nbsp;{fmtTanggal(hari[6], t)}
        </div>
      </div>

      {baris.length === 0 ? (
        <div
          className="card"
          style={{
            alignItems: "center", textAlign: "center",
            padding: "var(--space-8)", background: "var(--color-neutral-100)",
          }}
        >
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>
            {t.kalender.tidakAdaRuang}
          </div>
          <p style={{ fontSize: 12.5, color: "var(--color-neutral-700)", margin: "4px 0 0", maxWidth: "34ch" }}>
            {t.kalender.tidakAdaRuangIsi}
          </p>
        </div>
      ) : (
        <div className="card elev-sm kisi-bungkus" style={{ background: "var(--color-neutral-100)" }}>
          <table className="kisi-kalender">
            <thead>
              <tr>
                <th scope="col" className="kisi-ruang">
                  {t.umum.ruang}
                </th>
                {hari.map((h) => {
                  const iniHariIni = h === isoHariIni;
                  const tgl = Number(h.slice(8));
                  const t2 = tutup.get(h);
                  return (
                    <th
                      key={h}
                      scope="col"
                      className={`kisi-hari${iniHariIni ? " ini" : ""}${t2 ? " tutup" : ""}`}
                      title={t2 ? pesanTutup(t2, t) : undefined}
                    >
                      <span className="kisi-nama-hari">
                        {namaHari[dariISO(h).getUTCDay()].slice(0, 3)}
                      </span>
                      <span className="kisi-tanggal">{tgl}</span>
                      {/* Ditulis juga sebagai teks, bukan hanya lewat warna
                          kolom, supaya pembaca layar ikut tahu hari itu tutup. */}
                      {t2 && <span className="sr-only">{t.jadwal.tutup}</span>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {baris.map((r) => (
                <tr key={r.id}>
                  <th scope="row" className="kisi-ruang">
                    <Link href={`/katalog/${r.id}`} className="tautan" style={{ fontSize: 13 }}>
                      {r.nama}
                    </Link>
                    <span className="kisi-lokasi">
                      {r.lokasi}
                      {r.kapasitas ? ` · ${r.kapasitas} ${t.umum.orang}` : ""}
                    </span>
                  </th>

                  {hari.map((h) => {
                    const slot = r.terisi.get(h);
                    const ditutup = tutup.get(h);
                    const lewat = h < isoHariIni;
                    // Terpakai didahulukan di atas tutup, dan itu disengaja.
                    // Pengajuan yang sudah disetujui TIDAK dibatalkan oleh
                    // penutupan yang ditandai belakangan, jadi menyembunyikan
                    // pemakaian yang nyata di balik corak tutup akan membuat
                    // kalender berbohong soal ruang yang sebenarnya terisi.
                    const kelas = slot
                      ? "kisi-sel terpakai"
                      : ditutup
                        ? "kisi-sel tutup"
                        : lewat
                          ? "kisi-sel lewat"
                          : "kisi-sel kosong";
                    return (
                      <td
                        key={h}
                        className={kelas}
                        // Judul HTML dipakai supaya kode pengajuan dan nama
                        // pemesannya bisa dilihat tanpa menambah panel baru.
                        title={
                          slot
                            ? t.kalender.olehSiapa
                                .replace("{kode}", slot.kode)
                                .replace("{nama}", slot.pemohon)
                            : ditutup
                              ? pesanTutup(ditutup, t)
                              : `${r.nama}, ${fmtTanggal(h, t)}: ${t.kalender.kosong}`
                        }
                      >
                        <span className="sr-only">
                          {slot
                            ? t.kalender.terpakai
                            : ditutup
                              ? t.jadwal.tutup
                              : t.kalender.kosong}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* legenda */}
      <div
        style={{
          display: "flex", gap: 16, flexWrap: "wrap",
          fontSize: 11.5, color: "var(--color-neutral-700)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span className="kisi-contoh kosong" /> {t.kalender.kosong}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span className="kisi-contoh terpakai" /> {t.kalender.terpakai}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span className="kisi-contoh tutup" /> {t.jadwal.tutup}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span className="kisi-contoh lewat" /> {t.katalog.sudahLewat}
        </span>
      </div>

      <p style={{ fontSize: 11.5, color: "var(--color-neutral-600)", margin: 0, maxWidth: "76ch" }}>
        {t.kalender.keterangan} {t.jadwal.keteranganTutup}
      </p>

      {!admin && (
        <div>
          <Link href="/katalog?tipe=RUANG" className="btn btn-primary" style={{ fontSize: 13 }}>
            {t.kalender.ajukanRuang}
          </Link>
        </div>
      )}
    </div>
  );
}
