import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { teks } from "@/lib/preferensi-server";
import { wajibPeminjam } from "@/lib/auth";
import { ringkasKetersediaan } from "@/lib/ketersediaan";
import { bacaKeranjang } from "@/lib/keranjang";
import { dariISO, hariIniISO } from "@/lib/waktu";
import { BadgeKetersediaan } from "@/components/badge";
import { IlustrasiAset } from "@/components/ilustrasi-aset";
import { tambahKeKeranjang } from "../aksi-keranjang";
import type { TipeAset } from "@/generated/prisma/enums";

export async function generateMetadata(): Promise<Metadata> {
  const t = await teks();
  return { title: t.judul.katalog[0] };
}

type Cari = { q?: string; tipe?: string; kat?: string };

export default async function Katalog(props: PageProps<"/katalog">) {
  await wajibPeminjam();
  const t = await teks();
  const sp = (await props.searchParams) as Cari;

  const q = (sp.q ?? "").trim();
  const tipe = sp.tipe === "BARANG" || sp.tipe === "RUANG" ? sp.tipe : "SEMUA";
  const kat = sp.kat ?? "SEMUA";

  const [aset, kategoriMentah, keranjang] = await Promise.all([
    prisma.aset.findMany({
      where: {
        aktif: true,
        ...(tipe !== "SEMUA" ? { tipe: tipe as TipeAset } : {}),
        ...(kat !== "SEMUA" ? { kategori: kat } : {}),
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
      orderBy: [{ tipe: "asc" }, { nama: "asc" }],
    }),
    prisma.aset.findMany({
      where: { aktif: true },
      select: { kategori: true },
      distinct: ["kategori"],
      orderBy: { kategori: "asc" },
    }),
    bacaKeranjang(),
  ]);

  // Ketersediaan ditampilkan untuk hari ini. Angka pastinya dihitung ulang
  // saat peminjam mengisi tanggal di form pengajuan.
  const hariIni = dariISO(hariIniISO());
  const tersedia = await ringkasKetersediaan(prisma, aset, hariIni, hariIni, t.katalog);

  const kategori = ["SEMUA", ...kategoriMentah.map((k) => k.kategori)];
  const diKeranjang = new Set(keranjang.map((b) => b.asetId));

  const tautan = (ubah: Partial<Cari>) => {
    const p = new URLSearchParams();
    const gabung = { q, tipe, kat, ...ubah };
    if (gabung.q) p.set("q", gabung.q);
    if (gabung.tipe && gabung.tipe !== "SEMUA") p.set("tipe", gabung.tipe);
    if (gabung.kat && gabung.kat !== "SEMUA") p.set("kat", gabung.kat);
    const s = p.toString();
    return s ? `/katalog?${s}` : "/katalog";
  };

  const jmlBarang = aset.filter((a) => a.tipe === "BARANG").length;
  const jmlRuang = aset.length - jmlBarang;

  return (
    <div className="anim-rise flex flex-col" style={{ gap: "var(--space-4)" }}>
      {/* pencarian, form GET supaya tetap jalan tanpa JavaScript */}
      <form
        method="GET"
        action="/katalog"
        style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "flex-end" }}
      >
        <div className="field" style={{ flex: "1 1 240px", minWidth: 0 }}>
          <label htmlFor="q">{t.katalog.cari}</label>
          <input
            id="q"
            name="q"
            className="input"
            defaultValue={q}
            placeholder={t.katalog.cariContoh}
          />
        </div>
        {kat !== "SEMUA" && <input type="hidden" name="kat" value={kat} />}
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
        <button type="submit" className="btn btn-secondary">
          {t.umum.terapkan}
        </button>
      </form>

      {/* filter kategori */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {kategori.map((k) => (
          <Link
            key={k}
            href={tautan({ kat: k })}
            className={`btn ${k === kat ? "btn-primary" : "btn-secondary"}`}
            style={{ fontSize: 12.5 }}
          >
            {k}
          </Link>
        ))}
      </div>

      <div style={{ fontSize: 12, color: "var(--color-neutral-600)" }}>
        {aset.length} item ditemukan · {jmlBarang} barang, {jmlRuang} ruang
      </div>

      {/* grid kartu */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(215px,1fr))",
          gap: "var(--space-3)",
        }}
      >
        {aset.map((a) => {
          const av = tersedia.get(a.id)!;
          const sudah = diKeranjang.has(a.id);
          return (
            <div
              key={a.id}
              className="card elev-sm"
              style={{ padding: 0, overflow: "hidden", background: "var(--color-neutral-100)" }}
            >
              <Link href={`/katalog/${a.id}`} style={{ display: "block" }}>
                {a.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.foto}
                    alt={a.nama}
                    style={{ height: 126, width: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <IlustrasiAset kategori={a.kategori} tipe={a.tipe} tinggi={126} />
                )}
              </Link>

              <div style={{ padding: "var(--space-3)", display: "flex", flexDirection: "column", gap: 7 }}>
                <span className="card-kicker">{a.kategori}</span>
                <Link href={`/katalog/${a.id}`} className="card-title" style={{ color: "inherit" }}>
                  {a.nama}
                </Link>
                <span style={{ fontSize: 12, color: "var(--color-neutral-600)" }}>
                  {/* Dirakit lewat kamus. Versi lama menulis "orang",
                      "terbuka", dan "unit" langsung di template bersarang,
                      dan template bersarang itulah yang membuat pemindai
                      bahasa melewatkannya. */}
                  {a.tipe === "RUANG"
                    ? `${t.katalog.kapasitas} ${
                        a.kapasitas
                          ? `${a.kapasitas} ${t.umum.orang}`
                          : t.katalog.terbuka
                      } · ${a.lokasi}`
                    : `${a.stok} ${t.umum.unit} · ${a.lokasi}`}
                </span>
                <BadgeKetersediaan teks={av.teks} nuansa={av.nuansa} />

                <div style={{ display: "flex", gap: 7, marginTop: 3 }}>
                  <Link
                    href={`/katalog/${a.id}`}
                    className="btn btn-secondary"
                    style={{ flex: 1, fontSize: 12.5 }}
                  >
                    Detail
                  </Link>
                  <form
                    style={{ flex: 1, display: "flex" }}
                    action={async () => {
                      "use server";
                      await tambahKeKeranjang(a.id, 1);
                    }}
                  >
                    <button
                      type="submit"
                      className={`btn ${sudah ? "btn-secondary" : "btn-primary"}`}
                      style={{ flex: 1, fontSize: 12.5 }}
                      disabled={!av.bisaDipinjam && !sudah}
                    >
                      {sudah ? t.katalog.ditambahkan : "Tambah"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {aset.length === 0 && (
        <div
          className="card"
          style={{
            alignItems: "center", textAlign: "center",
            padding: "var(--space-8)", background: "var(--color-neutral-100)",
          }}
        >
          <div
            aria-hidden
            style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "var(--color-neutral-200)",
              display: "grid", placeItems: "center", marginBottom: 6,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-neutral-700)" strokeWidth="2.75" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>
            {t.katalog.kosong}
          </div>
          <p style={{ fontSize: 12.5, color: "var(--color-neutral-700)", margin: 0, maxWidth: "34ch" }}>
            {t.katalog.kosongIsi}
          </p>
          <Link href="/katalog" className="btn btn-secondary" style={{ marginTop: 8 }}>
            {t.katalog.hapusFilter}
          </Link>
        </div>
      )}

      {/* bilah keranjang */}
      {keranjang.length > 0 && (
        <div
          style={{
            position: "sticky", bottom: 14,
            display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
            padding: "11px 11px 11px 20px", borderRadius: 999,
            background: "var(--color-neutral-900)", color: "var(--color-bg)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div style={{ minWidth: 0, flex: "1 1 160px" }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {t.katalog.itemDipilih.replace("{n}", String(keranjang.length))}
            </div>
            <div
              style={{
                fontSize: 11, opacity: 0.7, overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {keranjang
                .map((b) => aset.find((a) => a.id === b.asetId)?.nama)
                .filter(Boolean)
                .join(", ") || t.katalog.dariHalamanLain}
            </div>
          </div>
          <Link href="/ajukan" className="btn btn-primary" style={{ fontSize: 13 }}>
            {t.katalog.lanjutForm}
          </Link>
        </div>
      )}
    </div>
  );
}
