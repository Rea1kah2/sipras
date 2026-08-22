import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { teks } from "@/lib/preferensi-server";
import { wajibPeminjam } from "@/lib/auth";
import { bacaKeranjang } from "@/lib/keranjang";
import { cekBentrok } from "@/lib/ketersediaan";
import { ambilPengaturan, cekTutup, jendelaBuka, pesanTutup } from "@/lib/penutupan";
import { dariISO, fmtRentang, hariIniISO } from "@/lib/waktu";
import { IlustrasiAset } from "@/components/ilustrasi-aset";
import { hapusDariKeranjang, ubahJumlah } from "../aksi-keranjang";
import { FormAjukan } from "./form-ajukan";

export async function generateMetadata(): Promise<Metadata> {
  const t = await teks();
  return { title: t.judul.ajukan[0] };
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function Ajukan(props: PageProps<"/ajukan">) {
  const user = await wajibPeminjam();
  const t = await teks();
  const sp = (await props.searchParams) as { mulai?: string; selesai?: string };

  const hariIni = hariIniISO();
  const mulai = ISO_RE.test(sp.mulai ?? "") ? sp.mulai! : "";
  const selesai = ISO_RE.test(sp.selesai ?? "") ? sp.selesai! : "";

  const keranjang = await bacaKeranjang();
  const aset = await prisma.aset.findMany({
    where: { id: { in: keranjang.map((b) => b.asetId) } },
  });
  const petaAset = new Map(aset.map((a) => [a.id, a]));

  // Baris keranjang yang asetnya sudah dihapus admin ikut disaring di sini.
  const baris = keranjang.flatMap((b) => {
    const a = petaAset.get(b.asetId);
    return a ? [{ ...b, aset: a }] : [];
  });

  const rentangSah = Boolean(mulai && selesai && selesai >= mulai);

  // Hari tutup diperiksa begitu tanggalnya lengkap, TANPA menunggu ada item.
  // Bentrok aset memang tidak berarti apa apa kalau keranjangnya kosong, tapi
  // tanggal tutup tetap tanggal tutup, dan memberitahunya lebih awal berarti
  // orangnya tidak perlu memilih barang dulu untuk tahu tanggalnya mustahil.
  const tutup = rentangSah
    ? (await cekTutup(prisma, dariISO(mulai), dariISO(selesai))).map((x) =>
        pesanTutup(x, t)
      )
    : [];

  // Cek bentrok pertama: umpan balik cepat saat tanggal berubah. Cek kedua
  // dilakukan lagi di dalam transaksi saat submit.
  //
  // Dilewati kalau tanggalnya sudah tutup, karena hasilnya cuma menambah
  // daftar hal yang harus dibetulkan padahal semuanya gugur begitu tanggalnya
  // diganti. Satu masalah sekaligus, dan yang paling menentukan lebih dulu.
  const bentrok =
    rentangSah && baris.length > 0 && tutup.length === 0
      ? (
          await cekBentrok(
            prisma,
            baris.map((b) => ({ asetId: b.asetId, jumlah: b.jumlah })),
            dariISO(mulai),
            dariISO(selesai)
          )
        ).map((b) => b.pesan)
      : [];

  const pengaturan = await ambilPengaturan(prisma);

  // Rentang cepat dicari dari hari buka, bukan dari hitungan hari mentah.
  // Mulai dari besok, bukan hari ini, karena pengajuan untuk hari yang sama
  // tidak menyisakan waktu bagi admin untuk mereview.
  //
  // Jendela yang tidak ditemukan dibuang, bukan ditawarkan lalu ditolak. Ini
  // benar benar bisa terjadi, misalnya kalau admin hanya membuka hari Senin,
  // maka dua hari berurutan memang tidak akan pernah ada.
  const besok = geser(hariIni, 1);
  const cepat = (
    await Promise.all(
      [
        [1, t.jadwal.cepatSatu],
        [2, t.jadwal.cepatDua],
        [3, t.jadwal.cepatTiga],
      ].map(async ([panjang, label]) => {
        const j = await jendelaBuka(prisma, besok, panjang as number);
        return j ? { label: label as string, mulai: j.mulai, selesai: j.selesai } : null;
      })
    )
  ).filter((c): c is { label: string; mulai: string; selesai: string } => c !== null);

  return (
    <div className="anim-rise flex flex-col" style={{ gap: "var(--space-4)" }}>
      {/* ── 1. item ── di luar <form> utama supaya tidak jadi form bersarang */}
      <div className="card elev-sm" style={{ background: "var(--color-neutral-100)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
          <h4 style={{ margin: 0 }}>{t.ajukan.langkah1}</h4>
          <Link href="/katalog" className="btn btn-ghost" style={{ fontSize: 12.5 }}>
            + {t.ajukan.tambahItem}
          </Link>
        </div>

        {baris.map((b) => (
          <div
            key={b.asetId}
            style={{
              display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap",
              padding: 11, borderRadius: "var(--radius-md)",
              background: "var(--color-bg)",
            }}
          >
            <div style={{ width: 44, height: 44, flex: "none" }}>
              {b.aset.foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.aset.foto}
                  alt=""
                  style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 12 }}
                />
              ) : (
                <IlustrasiAset
                  kategori={b.aset.kategori}
                  tipe={b.aset.tipe}
                  tinggi={44}
                  radius="12px"
                />
              )}
            </div>
            <div style={{ flex: "1 1 130px", minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{b.aset.nama}</div>
              <div style={{ fontSize: 11.5, color: "var(--color-neutral-600)" }}>
                {b.aset.tipe === "RUANG"
                  ? `${t.ajukan.barisRuang} · ${b.aset.lokasi}`
                  : `${t.ajukan.barisBarang} · ${t.ajukan.barisStok.replace("{n}", String(b.aset.stok))}`}
              </div>
            </div>

            {b.aset.tipe === "BARANG" && (
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <form action={async () => { "use server"; await ubahJumlah(b.asetId, -1); }}>
                  <button type="submit" className="btn btn-secondary btn-icon" aria-label={t.ajukan.kurangi.replace("{nama}", b.aset.nama)}>
                    −
                  </button>
                </form>
                <span style={{ minWidth: 24, textAlign: "center", fontWeight: 700, fontSize: 13 }}>
                  {b.jumlah}
                </span>
                <form action={async () => { "use server"; await ubahJumlah(b.asetId, 1); }}>
                  <button type="submit" className="btn btn-secondary btn-icon" aria-label={t.ajukan.tambah.replace("{nama}", b.aset.nama)}>
                    +
                  </button>
                </form>
              </div>
            )}

            <form action={async () => { "use server"; await hapusDariKeranjang(b.asetId); }}>
              <button
                type="submit"
                className="btn btn-ghost btn-icon"
                style={{ color: "var(--color-danger-700)" }}
                aria-label={t.ajukan.hapusItem.replace("{nama}", b.aset.nama)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </form>
          </div>
        ))}

        {baris.length === 0 && (
          <div
            style={{
              padding: "var(--space-6)", textAlign: "center",
              border: "1.5px dashed var(--color-neutral-300)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 3 }}>
              {t.ajukan.belumAdaItemJudul}
            </div>
            <p style={{ fontSize: 12, color: "var(--color-neutral-700)", margin: "0 0 10px" }}>
              {t.ajukan.belumAdaItemIsi}
            </p>
            <Link href="/katalog" className="btn btn-primary" style={{ fontSize: 13 }}>
              {t.ajukan.pilihItem}
            </Link>
          </div>
        )}
      </div>

      <FormAjukan
        mulai={mulai}
        selesai={selesai}
        hariIni={hariIni}
        waDefault={user.whatsapp ?? ""}
        jumlahItem={baris.length}
        bentrok={bentrok}
        tutup={tutup}
        jamLayanan={t.jadwal.bukaJam
          .replace("{buka}", pengaturan.jamBuka)
          .replace("{tutup}", pengaturan.jamTutup)}
        cepat={cepat}
        ringkas={[
          { label: t.ajukan.jumlahItem, nilai: String(baris.length) },
          {
            label: t.ajukan.tanggal,
            nilai: mulai && selesai ? fmtRentang(mulai, selesai, t) : t.ajukan.belumDiisi,
          },
          { label: t.ajukan.pemohon, nilai: user.nama },
        ]}
      />
    </div>
  );
}

function geser(iso: string, hari: number): string {
  const d = dariISO(iso);
  d.setUTCDate(d.getUTCDate() + hari);
  return d.toISOString().slice(0, 10);
}
