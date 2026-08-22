"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  aksiAktifkanAset,
  aksiHapusAset,
  aksiSimpanAset,
  type StatusAset,
} from "./aksi";
import { Field, FieldArea, PesanGagal, PesanSukses, TombolKirim } from "@/components/form";
import { useKamus } from "@/components/kamus-provider";
import { BadgeKetersediaan, BadgeTipe } from "@/components/badge";

export type BarisAset = {
  id: string;
  nama: string;
  tipe: "BARANG" | "RUANG";
  kategori: string;
  deskripsi: string;
  lokasi: string;
  stok: number;
  kapasitas: number | null;
  foto: string | null;
  aktif: boolean;
  kapText: string;
  availTeks: string;
  availNuansa: "sage" | "warm" | "deep";
};

export function TabelAset({ rows }: { rows: BarisAset[] }) {
  const t = useKamus();
  const [edit, setEdit] = useState<BarisAset | "baru" | null>(null);
  const [hapus, setHapus] = useState<BarisAset | null>(null);
  const [kabar, setKabar] = useState<string | null>(null);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-primary" onClick={() => setEdit("baru")}>
          {t.aset.tambah}
        </button>
      </div>

      <PesanSukses pesan={kabar ?? undefined} />

      <div
        className="card elev-sm table-wrap"
        style={{ padding: "var(--space-2) var(--space-3)", background: "var(--color-neutral-100)" }}
      >
        <table className="table">
          <thead>
            <tr>
              <th>{t.aset.kolomNama}</th>
              <th>{t.aset.kolomTipe}</th>
              <th>{t.aset.kolomKategori}</th>
              <th>{t.aset.kolomStok}</th>
              <th>{t.aset.kolomLokasi}</th>
              <th>{t.aset.kolomTersedia}</th>
              <th style={{ textAlign: "right" }}>{t.aset.kolomAksi}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} style={{ opacity: a.aktif ? 1 : 0.55 }}>
                <td style={{ fontWeight: 600, minWidth: 170 }}>
                  {a.nama}
                  {!a.aktif && (
                    <span
                      className="tag tag-neutral"
                      style={{ marginLeft: 8, fontWeight: 600 }}
                    >
                      Nonaktif
                    </span>
                  )}
                </td>
                <td>
                  <BadgeTipe tipe={a.tipe} />
                </td>
                <td style={{ whiteSpace: "nowrap" }}>{a.kategori}</td>
                <td style={{ whiteSpace: "nowrap" }}>{a.kapText}</td>
                <td style={{ whiteSpace: "nowrap" }}>{a.lokasi || "-"}</td>
                <td>
                  <BadgeKetersediaan teks={a.availTeks} nuansa={a.availNuansa} />
                </td>
                <td>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: 12, padding: "5px 12px" }}
                      onClick={() => setEdit(a)}
                    >
                      Edit
                    </button>
                    {a.aktif ? (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ fontSize: 12, padding: "5px 10px" }}
                        onClick={() => setHapus(a)}
                      >
                        {t.aset.nonaktifkan}
                      </button>
                    ) : (
                      <FormAktifkan aset={a} onSelesai={setKabar} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <DialogAset
          aset={edit === "baru" ? null : edit}
          onTutup={() => setEdit(null)}
          onSelesai={(pesan) => {
            setKabar(pesan);
            setEdit(null);
          }}
        />
      )}

      {hapus && (
        <DialogNonaktif
          aset={hapus}
          onTutup={() => setHapus(null)}
          onSelesai={(pesan) => {
            setKabar(pesan);
            setHapus(null);
          }}
        />
      )}
    </>
  );
}

/** Bungkus <dialog> native supaya dapat jebakan fokus dan latar inert. */
function Kotak({
  onTutup,
  lebar = 540,
  children,
}: {
  onTutup: () => void;
  lebar?: number;
  children: React.ReactNode;
}) {
  const t = useKamus();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="dialog"
      style={{ width: `min(${lebar}px, 100%)` }}
      onCancel={(e) => {
        e.preventDefault();
        onTutup();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onTutup();
      }}
    >
      <button
        type="button"
        className="dialog-tutup"
        aria-label={t.umum.tutup}
        onClick={onTutup}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
      {children}
    </dialog>
  );
}

function DialogAset({
  aset,
  onTutup,
  onSelesai,
}: {
  aset: BarisAset | null;
  onTutup: () => void;
  onSelesai: (pesan: string) => void;
}) {
  const t = useKamus();
  const [status, kirim] = useActionState<StatusAset, FormData>(aksiSimpanAset, null);
  const [tipe, setTipe] = useState<"BARANG" | "RUANG">(aset?.tipe ?? "BARANG");

  // Dialog ditutup dari efek, bukan di dalam aksi, supaya pesan galat sempat
  // tampil kalau simpannya gagal.
  useEffect(() => {
    if (status?.ok) onSelesai(status.pesan ?? t.aset.tersimpan);
  }, [status, onSelesai, t.aset.tersimpan]);

  const error = status && !status.ok ? status.error : undefined;
  const ruang = tipe === "RUANG";

  return (
    <Kotak onTutup={onTutup}>
      <form action={kirim} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {aset && <input type="hidden" name="id" value={aset.id} />}

        <span className="dialog-title">
          {aset ? t.aset.dialogEdit : t.aset.dialogTambah}
        </span>

        <PesanGagal pesan={status && !status.ok ? status.pesan : undefined} />

        <Field
          label={t.aset.namaAset}
          nama="nama"
          defaultValue={aset?.nama}
          placeholder={t.aset.namaAsetContoh}
          error={error?.nama}
          required
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
            gap: "var(--space-3)",
          }}
        >
          <div className="field">
            <label htmlFor="tipe-barang">{t.aset.kolomTipe}</label>
            <div className="seg" style={{ width: "100%" }}>
              <label className="seg-opt" style={{ flex: 1, justifyContent: "center" }}>
                <input
                  id="tipe-barang"
                  type="radio"
                  name="tipe"
                  value="BARANG"
                  checked={!ruang}
                  onChange={() => setTipe("BARANG")}
                />
                {t.umum.barang}
              </label>
              <label className="seg-opt" style={{ flex: 1, justifyContent: "center" }}>
                <input
                  type="radio"
                  name="tipe"
                  value="RUANG"
                  checked={ruang}
                  onChange={() => setTipe("RUANG")}
                />
                {t.umum.ruang}
              </label>
            </div>
          </div>

          <Field
            label={t.aset.kategori}
            nama="kategori"
            defaultValue={aset?.kategori}
            placeholder={t.aset.kategoriContoh}
            error={error?.kategori}
            required
          />

          <Field
            label={ruang ? t.aset.kapasitasRuang : t.aset.stokBarang}
            nama="kapasitasAtauStok"
            type="number"
            min={ruang ? 0 : 1}
            defaultValue={ruang ? (aset?.kapasitas ?? 0) : (aset?.stok ?? 1)}
            petunjuk={ruang ? t.aset.kapasitasBantuan : undefined}
            error={error?.kapasitasAtauStok}
            required
          />

          <Field
            label={t.aset.lokasi}
            nama="lokasi"
            defaultValue={aset?.lokasi}
            placeholder={t.aset.lokasiContoh}
            error={error?.lokasi}
          />
        </div>

        <FieldArea
          label={t.aset.deskripsi}
          nama="deskripsi"
          defaultValue={aset?.deskripsi}
          placeholder={t.aset.deskripsiContoh}
          error={error?.deskripsi}
        />

        <div className="field">
          <label htmlFor="foto">{t.aset.foto}</label>
          <input
            id="foto"
            name="foto"
            type="file"
            className="input"
            accept="image/jpeg,image/png,image/webp,image/avif"
            style={{ paddingBlock: 9 }}
          />
          <div style={{ fontSize: 11.5, color: "var(--color-neutral-600)", marginTop: 4 }}>
            {t.aset.fotoBantuan}
            {aset?.foto ? t.aset.fotoBantuanGanti : ""}
          </div>
          {error?.foto && <div className="field-error">{error.foto[0]}</div>}
        </div>

        {aset?.foto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={aset.foto}
            alt={t.aset.fotoSaatIni.replace("{nama}", aset.nama)}
            style={{
              width: 120, height: 90, objectFit: "cover",
              borderRadius: "var(--radius-md)",
            }}
          />
        )}

        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onTutup}>
            {t.umum.batal}
          </button>
          <TombolKirim className="btn btn-primary" sedang={t.aset.menyimpan}>
            {t.aset.simpanAset}
          </TombolKirim>
        </div>
      </form>
    </Kotak>
  );
}

function DialogNonaktif({
  aset,
  onTutup,
  onSelesai,
}: {
  aset: BarisAset;
  onTutup: () => void;
  onSelesai: (pesan: string) => void;
}) {
  const t = useKamus();
  const [status, kirim] = useActionState<StatusAset, FormData>(aksiHapusAset, null);

  useEffect(() => {
    if (status?.ok) onSelesai(status.pesan ?? t.aset.dinonaktifkan);
  }, [status, onSelesai, t.aset.dinonaktifkan]);

  return (
    <Kotak onTutup={onTutup} lebar={440}>
      <form action={kirim} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <input type="hidden" name="id" value={aset.id} />
        <span className="dialog-title">
          {t.aset.tanyaNonaktif.replace("{nama}", aset.nama)}
        </span>

        <PesanGagal pesan={status && !status.ok ? status.pesan : undefined} />

        <div className="dialog-body">{t.aset.tanyaNonaktifIsi}</div>

        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onTutup}>
            {t.umum.batal}
          </button>
          <TombolKirim className="btn btn-danger" sedang={t.umum.memuat}>
            {t.aset.tanyaNonaktifLanjut2}
          </TombolKirim>
        </div>
      </form>
    </Kotak>
  );
}

function FormAktifkan({
  aset,
  onSelesai,
}: {
  aset: BarisAset;
  onSelesai: (pesan: string) => void;
}) {
  const t = useKamus();
  const [status, kirim] = useActionState<StatusAset, FormData>(aksiAktifkanAset, null);

  useEffect(() => {
    if (status?.ok) onSelesai(status.pesan ?? t.aset.diaktifkan);
  }, [status, onSelesai, t.aset.diaktifkan]);

  return (
    <form action={kirim}>
      <input type="hidden" name="id" value={aset.id} />
      <TombolKirim
        className="btn btn-secondary"
        style={{ fontSize: 12, padding: "5px 12px" }}
        sedang="..."
      >
        {t.aset.aktifkan}
      </TombolKirim>
    </form>
  );
}
