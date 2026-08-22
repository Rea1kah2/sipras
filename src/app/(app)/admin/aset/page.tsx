import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { teks } from "@/lib/preferensi-server";
import { wajibAdmin } from "@/lib/auth";
import { ringkasKetersediaan } from "@/lib/ketersediaan";
import { dariISO, hariIniISO } from "@/lib/waktu";
import { TabelAset, type BarisAset } from "./tabel-aset";
import type { TipeAset } from "@/generated/prisma/enums";

export async function generateMetadata(): Promise<Metadata> {
  const t = await teks();
  return { title: t.judul.adminAset[0] };
}

export default async function KelolaAset(props: PageProps<"/admin/aset">) {
  await wajibAdmin();
  const t = await teks();
  const sp = (await props.searchParams) as {
    q?: string;
    tipe?: string;
    nonaktif?: string;
  };

  const q = (sp.q ?? "").trim();
  const tipe = sp.tipe === "BARANG" || sp.tipe === "RUANG" ? sp.tipe : "SEMUA";
  const tampilNonaktif = sp.nonaktif === "1";

  const aset = await prisma.aset.findMany({
    where: {
      ...(tampilNonaktif ? {} : { aktif: true }),
      ...(tipe !== "SEMUA" ? { tipe: tipe as TipeAset } : {}),
      ...(q
        ? {
            OR: [
              { nama: { contains: q, mode: "insensitive" as const } },
              { kategori: { contains: q, mode: "insensitive" as const } },
              { lokasi: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ aktif: "desc" }, { tipe: "asc" }, { nama: "asc" }],
  });

  const hariIni = dariISO(hariIniISO());
  const tersedia = await ringkasKetersediaan(prisma, aset, hariIni, hariIni, t.katalog);

  const rows: BarisAset[] = aset.map((a) => {
    const av = tersedia.get(a.id)!;
    return {
      id: a.id,
      nama: a.nama,
      tipe: a.tipe,
      kategori: a.kategori,
      deskripsi: a.deskripsi,
      lokasi: a.lokasi,
      stok: a.stok,
      kapasitas: a.kapasitas,
      foto: a.foto,
      aktif: a.aktif,
      // Dirakit lewat kamus, bukan template literal berisi kata Indonesia.
      // Versi lama menulis "unit", "orang", dan "Terbuka" langsung di sini,
      // dan karena letaknya di dalam kode (bukan teks JSX), pemindai bahasa
      // sama sekali tidak melihatnya sampai diperiksa dengan mata.
      kapText:
        a.tipe === "BARANG"
          ? `${a.stok} ${t.umum.unit}`
          : a.kapasitas
            ? `${a.kapasitas} ${t.umum.orang}`
            : t.katalog.terbuka,
      availTeks: av.teks,
      availNuansa: av.nuansa,
    };
  });

  return (
    <div className="anim-rise flex flex-col" style={{ gap: "var(--space-3)" }}>
      <form
        method="GET"
        action="/admin/aset"
        style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "flex-end" }}
      >
        <div className="field" style={{ flex: "1 1 220px", minWidth: 0 }}>
          <label htmlFor="q">{t.aset.cari}</label>
          <input
            id="q"
            name="q"
            className="input"
            defaultValue={q}
            placeholder={t.aset.cariContoh}
          />
        </div>
        <div className="seg" style={{ flex: "none" }}>
          {(["SEMUA", "BARANG", "RUANG"] as const).map((opsi) => (
            <label key={opsi} className="seg-opt">
              <input
                type="radio"
                name="tipe"
                value={opsi === "SEMUA" ? "" : opsi}
                defaultChecked={tipe === opsi}
              />
              {opsi === "SEMUA"
                ? t.umum.semua
                : opsi === "BARANG"
                  ? t.umum.barang
                  : t.umum.ruang}
            </label>
          ))}
        </div>
        <label className="radio">
          <input type="checkbox" name="nonaktif" value="1" defaultChecked={tampilNonaktif} />
          <span className="dot dot-square" />
          {t.aset.tampilkanNonaktif}
        </label>
        <button type="submit" className="btn btn-secondary">
          {t.umum.terapkan}
        </button>
      </form>

      <TabelAset rows={rows} />

      <div style={{ fontSize: 11.5, color: "var(--color-neutral-600)" }}>
        {t.aset.catatanKaki.replace("{n}", String(rows.length))}
      </div>

      {rows.length === 0 && (
        <div
          className="card"
          style={{
            alignItems: "center", textAlign: "center",
            padding: "var(--space-8)", background: "var(--color-neutral-100)",
          }}
        >
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>
            {t.aset.kosong}
          </div>
          <p style={{ fontSize: 12.5, color: "var(--color-neutral-700)", margin: "4px 0 10px", maxWidth: "34ch" }}>
            {t.aset.kosongIsi}
          </p>
          <Link href="/admin/aset" className="btn btn-secondary">
            {t.umum.hapusFilter}
          </Link>
        </div>
      )}
    </div>
  );
}
