import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { wajibAdmin } from "@/lib/auth";
import { teks } from "@/lib/preferensi-server";
import { cekTutup, pesanTutup } from "@/lib/penutupan";
import { teksItem } from "@/lib/pengajuan";
import { dariISO, fmtRentang, fmtTanggal, hariIniISO, keISO } from "@/lib/waktu";
import { BadgeStatus } from "@/components/badge";
import { IkonNav } from "@/components/ikon-nav";
import { TombolSerah } from "./tombol-serah";

export async function generateMetadata(): Promise<Metadata> {
  const t = await teks();
  return { title: t.judul.adminSerah[0] };
}

/**
 * Antrean serah terima: pengajuan yang sudah disetujui tapi barangnya belum
 * diambil peminjam.
 *
 * Halaman ini sengaja dibuat setangkup dengan /admin/verifikasi. Verifikasi
 * mengurus sisi pengembalian, halaman ini mengurus sisi pengambilan. Dengan
 * begitu tiap perpindahan status punya layarnya sendiri, dan alurnya bisa
 * ditelusuri tanpa perlu menebak di mana tombolnya.
 */
export default async function Serah() {
  await wajibAdmin();
  const t = await teks();
  const isoHariIni = hariIniISO();

  const antrean = await prisma.pengajuan.findMany({
    where: { status: "DISETUJUI" },
    // Yang tanggal mulainya paling awal didahulukan, karena itulah yang paling
    // mendesak. Urutan ini juga membuat yang sudah lewat tanggal muncul di
    // paling atas, tepat di tempat mata admin jatuh pertama kali.
    orderBy: { mulai: "asc" },
    select: {
      id: true,
      kode: true,
      status: true,
      mulai: true,
      selesai: true,
      namaKegiatan: true,
      pemohon: { select: { nama: true, unit: true } },
      items: {
        select: { namaAset: true, jumlah: true, aset: { select: { tipe: true } } },
      },
    },
  });

  // Hari tutup diperiksa sekali untuk hari ini saja, bukan per baris, karena
  // pertanyaannya memang cuma satu: apakah hari ini loketnya buka. Sumbernya
  // sama dengan yang menolak pengajuan, jadi tidak mungkin berbeda pendapat.
  const tutupHariIni = await cekTutup(prisma, dariISO(isoHariIni), dariISO(isoHariIni));

  return (
    <div className="anim-rise flex flex-col" style={{ gap: "var(--space-3)" }}>
      <p
        style={{
          fontSize: 12.5,
          color: "var(--color-neutral-700)",
          margin: 0,
          maxWidth: "60ch",
        }}
      >
        {t.serah.intro}
      </p>

      {/* Tutup itu PERINGATAN, bukan penghalang. Admin mungkin sedang merapikan
          catatan yang tertinggal dari hari sebelumnya, dan melarangnya hanya
          akan membuat catatan jadi makin tidak akurat. Alasannya sama dengan
          peringatan hari tutup di panel review. */}
      {tutupHariIni.length > 0 && (
        <div
          className="card"
          role="status"
          style={{ background: "var(--color-warn-200)", gap: 3 }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-warn-900)" }}>
            {t.serah.tutupHariIni}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-warn-900)" }}>
            {pesanTutup(tutupHariIni[0], t)}
          </div>
        </div>
      )}

      {antrean.map((p) => {
        const mulaiISO = keISO(p.mulai);
        const lewat = mulaiISO < isoHariIni;
        const belumWaktunya = mulaiISO > isoHariIni;

        return (
          <div
            key={p.id}
            className="card elev-sm"
            style={{ background: "var(--color-neutral-100)", gap: "var(--space-3)" }}
          >
            <div
              style={{
                display: "flex", alignItems: "center", gap: 9,
                flexWrap: "wrap", justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                <span className="mono" style={{ fontSize: 11.5 }}>{p.kode}</span>
                <BadgeStatus status={p.status} />
                {/* Jaring pengaman kalau admin lupa. Yang sudah lewat tanggal
                    ditandai merah supaya tidak tenggelam di antara yang lain,
                    sebab inilah satu satunya tanda bahwa ada yang tertinggal. */}
                {lewat && (
                  <span
                    className="tag tag-danger"
                    style={{ fontWeight: 600 }}
                  >
                    {t.serah.lewatTanggal}
                  </span>
                )}
                {belumWaktunya && (
                  <span className="tag tag-neutral">
                    {t.serah.belumWaktunya.replace("{tanggal}", fmtTanggal(p.mulai, t))}
                  </span>
                )}
              </div>
            </div>

            <div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>
                {teksItem(p.items)}
              </div>
              <div style={{ fontSize: 12, color: "var(--color-neutral-700)", marginTop: 2 }}>
                {p.pemohon.nama}
                {p.pemohon.unit ? ` · ${p.pemohon.unit}` : ""}
              </div>
              <div style={{ fontSize: 12, color: "var(--color-neutral-700)" }}>
                {t.serah.dipakai.replace("{rentang}", fmtRentang(p.mulai, p.selesai, t))}
              </div>
              {p.namaKegiatan && (
                <div style={{ fontSize: 12, color: "var(--color-neutral-600)", marginTop: 2 }}>
                  {p.namaKegiatan}
                </div>
              )}
            </div>

            <TombolSerah
              pengajuanId={p.id}
              kode={p.kode}
              namaPemohon={p.pemohon.nama}
            />
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
          <span
            aria-hidden
            style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "var(--color-accent-2-200)",
              display: "grid", placeItems: "center", marginBottom: 8,
              color: "var(--color-accent-2-800)",
            }}
          >
            <IkonNav nama="serah" ukuran={22} />
          </span>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>
            {t.serah.kosong}
          </div>
          <p
            style={{
              fontSize: 12.5, color: "var(--color-neutral-700)",
              margin: "4px 0 0", maxWidth: "34ch",
            }}
          >
            {t.serah.kosongIsi}
          </p>
        </div>
      )}
    </div>
  );
}
