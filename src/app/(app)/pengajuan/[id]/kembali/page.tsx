import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { wajibPeminjam } from "@/lib/auth";
import { URUT_KONDISI } from "@/lib/status";
import { teks } from "@/lib/preferensi-server";
import { fmtRentang, hariIniISO } from "@/lib/waktu";
import { PILIH_PENGAJUAN, teksItem } from "@/lib/pengajuan";
import { BadgeStatus } from "@/components/badge";
import { FormKembali } from "./form-kembali";

export async function generateMetadata(): Promise<Metadata> {
  const t = await teks();
  return { title: t.judul.pengembalian[0] };
}

export default async function Kembali(
  props: PageProps<"/pengajuan/[id]/kembali">
) {
  const user = await wajibPeminjam();
  const t = await teks();
  const { id } = await props.params;

  const pengajuan = await prisma.pengajuan.findUnique({
    where: { id },
    select: PILIH_PENGAJUAN,
  });

  // Pengajuan milik orang lain diperlakukan sebagai tidak ada, supaya URL
  // tidak bisa dipakai mengintip keberadaan data orang lain.
  if (!pengajuan || pengajuan.pemohon.id !== user.id) notFound();

  // Cuma yang sedang dipinjam yang bisa dikembalikan. Sisanya dikembalikan
  // ke daftar supaya tidak ada form yang pasti gagal saat dikirim.
  if (pengajuan.status !== "DIPINJAM") redirect("/pengajuan");

  return (
    <div className="anim-rise">
      <Link href="/pengajuan" className="tautan" style={{ fontSize: 13 }}>
        ← {t.nav.pengajuan}
      </Link>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
          gap: "var(--space-4)",
          marginTop: "var(--space-3)",
          alignItems: "start",
        }}
      >
        <FormKembali
          pengajuanId={pengajuan.id}
          hariIni={hariIniISO()}
          items={pengajuan.items.map((it) => ({
            id: it.id,
            nama:
              it.aset?.tipe !== "RUANG" && it.jumlah > 1
                ? `${it.namaAset} x${it.jumlah}`
                : it.namaAset,
            meta:
              it.aset?.tipe === "RUANG"
                ? `Ruang di ${it.aset.lokasi}`
                : `Barang, ${it.jumlah} unit`,
          }))}
          opsiKondisi={URUT_KONDISI.map((k) => ({
            nilai: k,
            label: t.kondisi[k],
          }))}
        />

        <div className="flex flex-col" style={{ minWidth: 0, gap: "var(--space-3)" }}>
          <div className="card elev-sm" style={{ background: "var(--color-neutral-100)" }}>
            <span className="card-kicker">{t.kembali.pengajuan}</span>
            <div className="mono" style={{ fontSize: 12, color: "var(--color-neutral-700)" }}>
              {pengajuan.kode}
            </div>
            <div className="card-title">{teksItem(pengajuan.items)}</div>
            <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)" }}>
              {t.umum.dipakai.replace(
                "{rentang}",
                fmtRentang(pengajuan.mulai, pengajuan.selesai, t)
              )}
            </div>
            <BadgeStatus status={pengajuan.status} />
          </div>

          <div className="card" style={{ background: "var(--color-accent-200)" }}>
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 15,
                color: "var(--color-accent-900)",
              }}
            >
              {t.kembali.setelahIniJudul}
            </div>
            {/* Nama statusnya ditebalkan, tapi kalimatnya tetap satu kunci utuh
                di kamus. Kalimat dipecah di penanda {status} lalu dirangkai
                jadi elemen React, bukan disuntikkan sebagai HTML mentah.
                Polanya sama dengan isiBadan() di admin/pengguna, dan nama
                statusnya sendiri diambil dari t.status supaya tidak jadi
                salinan kedua dari kata yang sudah ada di kamus. */}
            <p style={{ fontSize: 12.5, margin: 0, color: "var(--color-accent-900)" }}>
              {t.kembali.setelahIniIsi.split("{status}").map((bagian, i) => (
                <span key={i}>
                  {i > 0 && <b>{t.status.DIKEMBALIKAN.toLowerCase()}</b>}
                  {bagian}
                </span>
              ))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
