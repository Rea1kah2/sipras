"use client";

import { useActionState, useState } from "react";
import { aksiUbahAktif, aksiUbahPeran, type StatusPengguna } from "./aksi";
import { PesanGagal, PesanSukses, TombolKirim } from "@/components/form";
import { ModalKonfirmasi } from "@/components/modal";
import { useKamus } from "@/components/kamus-provider";

export type Pengguna = {
  id: string;
  nama: string;
  email: string;
  identitas: string | null;
  unit: string | null;
  whatsapp: string | null;
  peran: "ADMIN" | "PEMINJAM";
  aktif: boolean;
  jumlahPengajuan: number;
  diriSendiri: boolean;
};

/**
 * Aksi peran dan status akun.
 *
 * Keduanya mengubah hak akses orang lain dan tombolnya berdempetan di
 * kolom sempit, jadi masing masing lewat modal konfirmasi lebih dulu.
 *
 * `useActionState` sengaja TETAP tinggal di komponen ini, bukan ikut
 * pindah ke dalam modal. Modal hanya menyumbang tombol kirimnya. Kalau
 * state ikut pindah, ia akan dilepas bersama modal saat modal tertutup,
 * dan pesan sukses atau gagalnya hilang sebelum sempat terbaca.
 */
export function AksiPengguna({ u }: { u: Pengguna }) {
  const t = useKamus();
  const [peran, kirimPeran] = useActionState<StatusPengguna, FormData>(
    aksiUbahPeran,
    null
  );
  const [aktif, kirimAktif] = useActionState<StatusPengguna, FormData>(
    aksiUbahAktif,
    null
  );

  const [tanyaPeran, setTanyaPeran] = useState(false);
  const [tanyaAktif, setTanyaAktif] = useState(false);

  const kabarGagal =
    (peran && !peran.ok ? peran.pesan : undefined) ??
    (aktif && !aktif.ok ? aktif.pesan : undefined);
  const kabarSukses =
    (peran && peran.ok ? peran.pesan : undefined) ??
    (aktif && aktif.ok ? aktif.pesan : undefined);

  const jadiAdmin = u.peran !== "ADMIN";
  const akanNonaktif = u.aktif;

  const p = t.pengguna;

  /** Judul cukup teks biasa. React yang meng-escape, jadi nama aman. */
  const isiJudul = (kalimat: string) =>
    kalimat.replace("{nama}", u.nama).replace("{n}", String(u.jumlahPengajuan));

  /**
   * Badan modal butuh penekanan pada nama dan angka. Kalimatnya dipecah
   * di penanda, lalu potongannya dirangkai jadi elemen React.
   *
   * Sengaja TIDAK memakai dangerouslySetInnerHTML: nama pengguna itu data
   * yang bisa diisi orang lain saat mendaftar, jadi menyuntikkannya sebagai
   * HTML mentah membuka celah skrip lintas situs. Cara ini tetap memberi
   * huruf tebal tanpa membuka celah itu, karena React meng-escape teks.
   */
  const isiBadan = (kalimat: string) =>
    kalimat.split(/(\{nama\}|\{n\})/).map((bagian, i) => {
      if (bagian === "{nama}") return <b key={i}>{u.nama}</b>;
      if (bagian === "{n}") return <b key={i}>{u.jumlahPengajuan}</b>;
      return bagian;
    });

  // Alasan tombol mati ditulis apa adanya, bukan tombolnya disembunyikan,
  // supaya admin tahu kenapa dan tidak mengira sistemnya rusak.
  const peranMati = u.diriSendiri && u.peran === "ADMIN";
  const aktifMati = u.diriSendiri && u.aktif;

  return (
    <div className="flex flex-col" style={{ gap: 6, alignItems: "flex-end" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: 12, padding: "5px 12px" }}
          disabled={peranMati}
          title={peranMati ? p.tidakBisaTurunkanDiri : undefined}
          onClick={() => setTanyaPeran(true)}
        >
          {jadiAdmin ? p.jadikanAdmin : p.jadikanPeminjam}
        </button>

        <button
          type="button"
          className={u.aktif ? "btn btn-ghost" : "btn btn-secondary"}
          style={{ fontSize: 12, padding: "5px 12px" }}
          disabled={aktifMati}
          title={aktifMati ? p.tidakBisaNonaktifDiri : undefined}
          onClick={() => setTanyaAktif(true)}
        >
          {u.aktif ? p.nonaktifkan : p.aktifkan}
        </button>
      </div>

      {kabarGagal && (
        <div style={{ maxWidth: 340 }}>
          <PesanGagal pesan={kabarGagal} />
        </div>
      )}
      {kabarSukses && (
        <div style={{ maxWidth: 340 }}>
          <PesanSukses pesan={kabarSukses} />
        </div>
      )}

      {/* ── konfirmasi ubah peran ───────────────────────────────────── */}
      <ModalKonfirmasi
        terbuka={tanyaPeran}
        rupa={jadiAdmin ? "naik" : "tanya"}
        judul={isiJudul(jadiAdmin ? p.tanyaAdminJudul : p.tanyaPeminjamJudul)}
        labelBatal={t.umum.batal}
        onBatal={() => setTanyaPeran(false)}
        lanjut={
          <form action={kirimPeran} onSubmit={() => setTanyaPeran(false)}>
            <input type="hidden" name="userId" value={u.id} />
            <input type="hidden" name="peran" value={jadiAdmin ? "ADMIN" : "PEMINJAM"} />
            <TombolKirim className="btn btn-primary" sedang={t.umum.memuat}>
              {jadiAdmin ? p.tanyaAdminLanjut : p.tanyaPeminjamLanjut}
            </TombolKirim>
          </form>
        }
      >
{isiBadan(jadiAdmin ? p.tanyaAdminIsi : p.tanyaPeminjamIsi)}
      </ModalKonfirmasi>

      {/* ── konfirmasi aktif atau nonaktif ──────────────────────────── */}
      <ModalKonfirmasi
        terbuka={tanyaAktif}
        rupa={akanNonaktif ? "bahaya" : "tanya"}
        judul={isiJudul(akanNonaktif ? p.tanyaNonaktifJudul : p.tanyaAktifJudul)}
        labelBatal={t.umum.batal}
        onBatal={() => setTanyaAktif(false)}
        lanjut={
          <form action={kirimAktif} onSubmit={() => setTanyaAktif(false)}>
            <input type="hidden" name="userId" value={u.id} />
            <input type="hidden" name="aktif" value={akanNonaktif ? "tidak" : "ya"} />
            <TombolKirim
              className={akanNonaktif ? "btn btn-danger" : "btn btn-primary"}
              sedang={t.umum.memuat}
            >
              {akanNonaktif ? p.tanyaNonaktifLanjut : p.tanyaAktifLanjut}
            </TombolKirim>
          </form>
        }
      >
{isiBadan(akanNonaktif ? p.tanyaNonaktifIsi : p.tanyaAktifIsi)}
      </ModalKonfirmasi>
    </div>
  );
}
