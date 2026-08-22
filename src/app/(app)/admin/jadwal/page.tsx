import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { wajibAdmin } from "@/lib/auth";
import { teks } from "@/lib/preferensi-server";
import { ambilPengaturan } from "@/lib/penutupan";
import { STATUS_MEMAKAI_ASET } from "@/lib/status";
import { dariISO, fmtTanggalPanjang, hariIniISO, keISO } from "@/lib/waktu";
import { IkonNav } from "@/components/ikon-nav";
import { FormLayanan } from "./form-layanan";
import { FormTutup } from "./form-tutup";
import { aksiBukaKembali } from "./aksi";

export async function generateMetadata(): Promise<Metadata> {
  const t = await teks();
  return { title: t.judul.adminJadwal[0] };
}

export default async function Jadwal() {
  await wajibAdmin();
  const t = await teks();
  const hariIni = hariIniISO();

  const [pengaturan, penutupan] = await Promise.all([
    ambilPengaturan(prisma),
    prisma.penutupan.findMany({
      orderBy: { tanggal: "desc" },
      select: { id: true, tanggal: true, alasan: true, jenis: true },
    }),
  ]);

  /**
   * Pengajuan berjalan yang menyentuh tanggal tutup.
   *
   * Ini bukan hiasan. Menandai satu tanggal jadi tutup TIDAK membatalkan
   * pengajuan yang sudah disetujui, dan memang tidak boleh, karena
   * membatalkan janji orang secara diam diam lebih buruk daripada
   * membiarkannya. Yang benar adalah admin diberi tahu bahwa keputusannya
   * bertabrakan dengan pengajuan yang sudah jalan, lalu ia sendiri yang
   * memutuskan mau menghubungi peminjamnya atau tidak.
   */
  const tanggalTutup = penutupan.map((p) => keISO(p.tanggal));

  // Batas dihitung eksplisit, TIDAK diambil dari ujung array. Baris di atas
  // diurutkan menurun, jadi mengambil elemen pertama sebagai tanggal paling
  // awal akan salah, dan salahnya tidak kelihatan sampai ada yang mengubah
  // orderBy karena alasan tampilan.
  const paling = tanggalTutup.length
    ? {
        awal: tanggalTutup.reduce((a, b) => (b < a ? b : a)),
        akhir: tanggalTutup.reduce((a, b) => (b > a ? b : a)),
      }
    : null;

  const bertabrakan = !paling
    ? []
    : await prisma.pengajuan.findMany({
        where: {
          status: { in: STATUS_MEMAKAI_ASET },
          // Disaring dulu ke rentang terluas lewat basis data, baru
          // dicocokkan per tanggal di memori. Menuliskan satu klausa OR per
          // tanggal tutup akan jadi kueri raksasa begitu liburnya setahun.
          // Irisannya memakai definisi yang sama dengan seluruh sistem:
          // mulaiA <= selesaiB && mulaiB <= selesaiA.
          mulai: { lte: dariISO(paling.akhir) },
          selesai: { gte: dariISO(paling.awal) },
        },
        orderBy: { mulai: "asc" },
        select: { id: true, kode: true, mulai: true, selesai: true, pemohon: { select: { nama: true } } },
      });

  const setTutup = new Set(tanggalTutup);
  const kenaTutup = bertabrakan.filter((p) => {
    for (let tt = p.mulai.getTime(); tt <= p.selesai.getTime(); tt += 86_400_000) {
      if (setTutup.has(keISO(new Date(tt)))) return true;
    }
    return false;
  });

  return (
    <div className="anim-rise flex flex-col" style={{ gap: "var(--space-4)" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
          gap: "var(--space-4)",
          alignItems: "start",
        }}
      >
        <FormLayanan
          hariLayanan={pengaturan.hariLayanan}
          jamBuka={pengaturan.jamBuka}
          jamTutup={pengaturan.jamTutup}
        />
        <FormTutup hariIni={hariIni} />
      </div>

      {kenaTutup.length > 0 && (
        <div
          className="card"
          style={{ background: "var(--color-warn-200)", gap: 6 }}
          role="alert"
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-warn-900)" }}>
            {kenaTutup.length === 1
              ? t.jadwal.adaBentrokTutupSatu
              : t.jadwal.adaBentrokTutup.replace("{n}", String(kenaTutup.length))}
          </div>
          {kenaTutup.map((p) => (
            <div key={p.id} style={{ fontSize: 12, color: "var(--color-warn-900)" }}>
              {p.kode} · {p.pemohon.nama}
            </div>
          ))}
        </div>
      )}

      <div
        className="card elev-sm table-wrap"
        style={{ padding: "var(--space-2) var(--space-3)", background: "var(--color-neutral-100)" }}
      >
        <table className="table">
          <thead>
            <tr>
              <th>{t.jadwal.tanggalAwal}</th>
              <th>{t.jadwal.alasan}</th>
              <th>{t.jadwal.jenis}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {penutupan.map((p) => {
              const iso = keISO(p.tanggal);
              const lewat = iso < hariIni;
              return (
                <tr key={p.id}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {fmtTanggalPanjang(p.tanggal, t)}
                    {lewat && (
                      <span
                        className="tag tag-neutral"
                        style={{ marginLeft: 7, fontSize: 10 }}
                      >
                        {t.jadwal.sudahLewat}
                      </span>
                    )}
                  </td>
                  <td>{p.alasan}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{t.jadwal[`jenis${p.jenis}`]}</td>
                  <td style={{ textAlign: "right" }}>
                    {/* Form biasa, bukan modal konfirmasi. Membuka kembali satu
                        tanggal itu tidak merusak apa apa dan mudah dibatalkan
                        dengan menandainya lagi, jadi memaksa konfirmasi hanya
                        akan jadi gangguan. Modal disimpan untuk yang benar
                        benar sulit dibalik, seperti mengubah peran akun. */}
                    <form
                      action={async () => {
                        "use server";
                        await aksiBukaKembali(p.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="btn btn-ghost"
                        style={{ fontSize: 12 }}
                      >
                        {t.jadwal.bukaKembali}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {penutupan.length === 0 && (
          <div style={{ padding: "var(--space-6)", textAlign: "center" }}>
            <span
              aria-hidden
              style={{
                width: 52, height: 52, borderRadius: "50%",
                background: "var(--color-neutral-200)",
                display: "inline-grid", placeItems: "center", marginBottom: 8,
                color: "var(--color-neutral-700)",
              }}
            >
              <IkonNav nama="kalender" ukuran={22} />
            </span>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>
              {t.jadwal.kosong}
            </div>
            <p
              style={{
                fontSize: 12.5, color: "var(--color-neutral-700)",
                margin: "4px auto 0", maxWidth: "40ch",
              }}
            >
              {t.jadwal.kosongIsi}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
