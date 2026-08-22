import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { teks } from "@/lib/preferensi-server";
import type { Kamus } from "@/lib/kamus";
import { wajibPeminjam } from "@/lib/auth";
import { hariTerisi, ringkasKetersediaan } from "@/lib/ketersediaan";
import { BULAN_PANJANG, dariISO, hariIniISO } from "@/lib/waktu";
import { BadgeKetersediaan } from "@/components/badge";
import { IlustrasiAset } from "@/components/ilustrasi-aset";
import { tambahKeKeranjang } from "../../aksi-keranjang";

export async function generateMetadata(
  props: PageProps<"/katalog/[id]">
): Promise<Metadata> {
  const t = await teks();
  const { id } = await props.params;
  const aset = await prisma.aset.findUnique({
    where: { id },
    select: { nama: true },
  });
  return { title: aset?.nama ?? t.judul.katalogDetail[0] };
}

export default async function DetailAset(props: PageProps<"/katalog/[id]">) {
  await wajibPeminjam();
  const t = await teks();
  const { id } = await props.params;

  const aset = await prisma.aset.findUnique({ where: { id } });
  if (!aset || !aset.aktif) notFound();

  const hariIni = dariISO(hariIniISO());
  const [tersedia, terisi] = await Promise.all([
    ringkasKetersediaan(prisma, [aset], hariIni, hariIni, t.katalog),
    aset.tipe === "RUANG"
      ? hariTerisi(prisma, aset.id, hariIni.getUTCFullYear(), hariIni.getUTCMonth() + 1)
      : Promise.resolve(new Set<string>()),
  ]);
  const av = tersedia.get(aset.id)!;

  const spesifikasi =
    aset.tipe === "RUANG"
      ? [
          { label: t.katalog.tipe, nilai: t.umum.ruang },
          { label: t.katalog.kapasitas, nilai: aset.kapasitas ? `${aset.kapasitas} ${t.umum.orang}` : t.katalog.terbuka },
          { label: t.katalog.penyimpanan, nilai: aset.lokasi || "-" },
          { label: t.katalog.kategori, nilai: aset.kategori },
        ]
      : [
          { label: t.katalog.tipe, nilai: t.umum.barang },
          { label: t.katalog.totalStok, nilai: `${aset.stok} ${t.umum.unit}` },
          { label: t.katalog.penyimpanan, nilai: aset.lokasi || "-" },
          { label: t.katalog.kategori, nilai: aset.kategori },
        ];

  return (
    <div className="anim-rise">
      <Link href="/katalog" className="tautan" style={{ fontSize: 13 }}>
        ← {t.katalog.semuaSarana}
      </Link>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
          gap: "var(--space-6)",
          marginTop: "var(--space-3)",
          alignItems: "start",
        }}
      >
        {/* kiri: foto */}
        <div style={{ minWidth: 0 }}>
          {aset.foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={aset.foto}
              alt={aset.nama}
              style={{
                aspectRatio: "4/3", width: "100%", objectFit: "cover",
                borderRadius: "var(--radius-lg)",
              }}
            />
          ) : (
            <IlustrasiAset
              kategori={aset.kategori}
              tipe={aset.tipe}
              rasio="4/3"
              radius="var(--radius-lg)"
            />
          )}
        </div>

        {/* kanan: informasi */}
        <div className="flex flex-col" style={{ minWidth: 0, gap: "var(--space-3)" }}>
          <div>
            <span className="card-kicker">{aset.kategori}</span>
            <h2 style={{ margin: "6px 0 8px" }}>{aset.nama}</h2>
            <BadgeKetersediaan teks={av.teks} nuansa={av.nuansa} />
          </div>

          <p style={{ fontSize: 14, color: "var(--color-neutral-800)", margin: 0 }}>
            {aset.deskripsi || t.katalog.tanpaDeskripsi}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
              gap: 10,
            }}
          >
            {spesifikasi.map((s) => (
              <div
                key={s.label}
                style={{
                  padding: "11px 13px", borderRadius: "var(--radius-md)",
                  background: "var(--color-neutral-100)",
                }}
              >
                <div
                  style={{
                    fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase",
                    color: "var(--color-neutral-600)",
                  }}
                >
                  {s.label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{s.nilai}</div>
              </div>
            ))}
          </div>

          {aset.tipe === "BARANG" && (
            <div className="card" style={{ background: "var(--color-neutral-100)" }}>
              <span className="card-kicker">{t.katalog.ketersediaanHariIni}</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 26 }}>
                  {av.tersedia}
                </span>
                <span style={{ fontSize: 12.5, color: "var(--color-neutral-700)" }}>
                  {t.katalog.dariUnit.replace("{total}", String(av.total))}
                </span>
              </div>
              <div
                style={{
                  height: 10, borderRadius: 999,
                  background: "var(--color-neutral-200)", overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.round((av.tersedia / Math.max(1, av.total)) * 100)}%`,
                    background: "var(--color-accent-2-600)", borderRadius: 999,
                  }}
                />
              </div>
              <div style={{ fontSize: 11.5, color: "var(--color-neutral-600)" }}>
                {av.terpakai > 0
                  ? t.katalog.sedangDipinjam.replace("{n}", String(av.terpakai))
                  : t.katalog.tidakDipinjam}
              </div>
            </div>
          )}

          {aset.tipe === "RUANG" && (
            <KalenderRuang terisi={terisi} hariIni={hariIniISO()} t={t} />
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <form
              action={async () => {
                "use server";
                await tambahKeKeranjang(aset.id, 1);
              }}
            >
              <button type="submit" className="btn btn-primary">
                {t.katalog.tambahKePengajuan}
              </button>
            </form>
            <Link href="/katalog" className="btn btn-secondary">
              {t.katalog.pilihLain}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Kalender bulan berjalan: menampilkan slot yang sudah terisi. Pemilihan
 *  tanggal tetap lewat dua input tanggal di form, jadi validasinya tetap
 *  satu jalur. */
function KalenderRuang({
  terisi,
  hariIni,
  t,
}: {
  terisi: Set<string>;
  hariIni: string;
  t: Kamus;
}) {
  const [tahun, bulan] = hariIni.split("-").map(Number);
  const pertama = new Date(Date.UTC(tahun, bulan - 1, 1));
  const awalKolom = (pertama.getUTCDay() + 6) % 7; // Senin = 0
  const jumlahHari = new Date(Date.UTC(tahun, bulan, 0)).getUTCDate();

  const sel: (number | null)[] = [
    ...Array<null>(awalKolom).fill(null),
    ...Array.from({ length: jumlahHari }, (_, i) => i + 1),
  ];
  while (sel.length % 7 !== 0) sel.push(null);

  const iso = (d: number) =>
    `${tahun}-${String(bulan).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return (
    <div className="card" style={{ background: "var(--color-neutral-100)" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span className="card-kicker">{t.katalog.kalender}</span>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>
          {BULAN_PANJANG[bulan - 1]} {tahun}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
        {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((h) => (
          <div
            key={h}
            style={{
              textAlign: "center", fontSize: 10, letterSpacing: ".04em",
              color: "var(--color-neutral-600)", paddingBottom: 2,
            }}
          >
            {h}
          </div>
        ))}
        {sel.map((d, i) => {
          if (d === null) return <div key={`k${i}`} style={{ height: 34 }} />;
          const tanggal = iso(d);
          const lewat = tanggal < hariIni;
          const dipesan = terisi.has(tanggal);
          const iniHari = tanggal === hariIni;

          let bg = "var(--color-accent-2-200)";
          let warna = "var(--color-accent-2-900)";
          if (lewat) {
            bg = "var(--color-neutral-200)";
            warna = "var(--color-neutral-600)";
          }
          if (dipesan) {
            bg = "var(--color-warn-600)";
            warna = "var(--color-warn-100)";
          }

          return (
            <div
              key={tanggal}
              title={dipesan ? t.katalog.sudahDipesan : lewat ? t.katalog.sudahLewat : t.katalog.kosongHari}
              style={{
                height: 34, display: "grid", placeItems: "center",
                borderRadius: 10, fontSize: 12, fontWeight: iniHari ? 700 : 500,
                background: bg, color: warna,
                boxShadow: iniHari ? "inset 0 0 0 2px var(--color-accent-700)" : undefined,
              }}
            >
              {d}
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6,
          fontSize: 11, color: "var(--color-neutral-700)",
        }}
      >
        {[
          ["var(--color-accent-2-200)", t.katalog.kosongHari],
          ["var(--color-warn-600)", t.katalog.sudahDipesan],
          ["var(--color-neutral-200)", t.katalog.sudahLewat],
        ].map(([warna, label]) => (
          <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 11, height: 11, borderRadius: 4, background: warna }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
