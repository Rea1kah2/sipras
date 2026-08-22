import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { wajibLogin } from "@/lib/auth";
import { teks } from "@/lib/preferensi-server";
import { fmtRentang, fmtTanggalPanjang, hariIniISO, hitungHari } from "@/lib/waktu";
import { LogoSipras } from "@/components/logo";
import { TombolCetak } from "./tombol-cetak";

export async function generateMetadata(): Promise<Metadata> {
  const t = await teks();
  return { title: t.cetak.judulDokumen };
}

/**
 * Bukti peminjaman siap cetak.
 *
 * Menjembatani sistem dengan proses fisik di loket, yang tetap butuh lembar
 * bertanda tangan saat barang diserahkan dan dikembalikan.
 *
 * Tanpa pustaka PDF: cukup `@media print` di globals.css yang menyembunyikan
 * kerangka aplikasi. Alasannya bukan sekadar hemat, tapi karena pustaka PDF
 * berarti satu salinan tata letak lagi yang harus ikut diperbarui setiap
 * kali halamannya berubah, dan salinan itu yang biasanya lupa disamakan.
 */
export default async function CetakBukti(
  props: PageProps<"/pengajuan/[id]/cetak">
) {
  const user = await wajibLogin();
  const t = await teks();
  const { id } = await props.params;

  const p = await prisma.pengajuan.findUnique({
    where: { id },
    select: {
      kode: true,
      mulai: true,
      selesai: true,
      namaKegiatan: true,
      keperluan: true,
      kontakWhatsapp: true,
      pemohon: { select: { id: true, nama: true, unit: true, identitas: true } },
      items: {
        select: {
          id: true,
          namaAset: true,
          jumlah: true,
          aset: { select: { tipe: true, lokasi: true } },
        },
      },
    },
  });

  const admin = user.peran === "ADMIN";
  // Sama seperti halaman rincian: milik orang lain diperlakukan seolah tidak
  // ada, supaya URL tidak bisa dipakai menebak keberadaan data orang lain.
  if (!p || (!admin && p.pemohon.id !== user.id)) notFound();

  const baris: [string, string][] = [
    [t.cetak.pemohon, `${p.pemohon.nama}${p.pemohon.identitas ? ` (${p.pemohon.identitas})` : ""}`],
    [t.cetak.unit, p.pemohon.unit ?? "-"],
    [t.cetak.kontak, p.kontakWhatsapp ?? "-"],
    [t.cetak.tanggalPakai, fmtRentang(p.mulai, p.selesai, t)],
    [t.cetak.durasi, `${hitungHari(p.mulai, p.selesai)} ${t.umum.hari}`],
    [t.cetak.keperluan, p.namaKegiatan ? `${p.namaKegiatan}. ${p.keperluan}` : p.keperluan],
  ];

  return (
    <div className="lembar-cetak">
      {/* Baris ini hilang saat dicetak, hanya alat bantu di layar. */}
      <div className="tanpa-cetak" style={{ display: "flex", gap: 8, marginBottom: "var(--space-4)" }}>
        <TombolCetak label={t.cetak.tombol} />
        <Link href={`/pengajuan/${id}`} className="btn btn-secondary" style={{ fontSize: 13 }}>
          {t.cetak.kembaliKeRincian}
        </Link>
      </div>

      <article className="lembar">
        <header className="lembar-kepala">
          <span className="lembar-lambang" aria-hidden>
            <LogoSipras ukuran={30} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="lembar-merek">{t.merek.nama}</div>
            <h1 className="lembar-judul">{t.cetak.judulDokumen}</h1>
          </div>
          <div className="lembar-nomor">
            <span>{t.cetak.nomor}</span>
            <b className="mono">{p.kode}</b>
          </div>
        </header>

        <table className="lembar-data">
          <tbody>
            {baris.map(([label, nilai]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{nilai}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="lembar-sub">{t.cetak.daftarItem}</h2>
        <table className="lembar-item">
          <thead>
            <tr>
              <th style={{ width: "8%" }}>{t.cetak.kolomNo}</th>
              <th>{t.cetak.kolomNama}</th>
              <th style={{ width: "18%" }}>{t.cetak.kolomTipe}</th>
              <th style={{ width: "14%" }}>{t.cetak.kolomJumlah}</th>
            </tr>
          </thead>
          <tbody>
            {p.items.map((it, i) => (
              <tr key={it.id}>
                <td>{i + 1}</td>
                <td>
                  {it.namaAset}
                  {it.aset?.lokasi ? <span className="lembar-lokasi">{it.aset.lokasi}</span> : null}
                </td>
                <td>{it.aset?.tipe === "RUANG" ? t.umum.ruang : t.umum.barang}</td>
                <td>
                  {it.aset?.tipe === "RUANG" ? "1" : `${it.jumlah} ${t.umum.unit}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="lembar-ttd-grup">
          <TandaTangan
            judul={t.cetak.serahTerima}
            kiri={t.cetak.diserahkan}
            kanan={t.cetak.diterima}
            namaTerang={t.cetak.namaTerang}
            tanggal={t.cetak.tanggalTanda}
          />
          <TandaTangan
            judul={t.cetak.pengembalian}
            kiri={t.cetak.dikembalikan}
            kanan={t.cetak.diperiksa}
            namaTerang={t.cetak.namaTerang}
            tanggal={t.cetak.tanggalTanda}
          />
        </div>

        <footer className="lembar-kaki">
          <span>{t.cetak.dicetak.replace("{tgl}", fmtTanggalPanjang(hariIniISO(), t))}</span>
          <p>{t.cetak.catatanKaki}</p>
        </footer>
      </article>
    </div>
  );
}

function TandaTangan({
  judul,
  kiri,
  kanan,
  namaTerang,
  tanggal,
}: {
  judul: string;
  kiri: string;
  kanan: string;
  namaTerang: string;
  tanggal: string;
}) {
  return (
    <section className="lembar-ttd">
      <h3 className="lembar-sub">{judul}</h3>
      <div className="lembar-ttd-baris">
        {[kiri, kanan].map((peran) => (
          <div key={peran} className="lembar-kotak-ttd">
            <div className="lembar-peran">{peran}</div>
            <div className="lembar-ruang-ttd" />
            <div className="lembar-garis">{namaTerang}</div>
            <div className="lembar-garis">{tanggal}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
