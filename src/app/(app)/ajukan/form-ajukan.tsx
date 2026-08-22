"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { aksiKirimPengajuan, type StatusAjukan } from "./aksi";
import { Field, FieldArea, PesanGagal, TombolKirim } from "@/components/form";
import { useKamus } from "@/components/kamus-provider";

type Props = {
  mulai: string;
  selesai: string;
  hariIni: string;
  waDefault: string;
  jumlahItem: number;
  bentrok: string[];
  /** Tanggal tutup di dalam rentang. Alasan sudah dirakit di server. */
  tutup: string[];
  /** Keterangan jam layanan, sudah dirakit di server. */
  jamLayanan: string;
  /** Rentang cepat yang ditawarkan di bawah input tanggal. */
  cepat: { label: string; mulai: string; selesai: string }[];
  ringkas: { label: string; nilai: string }[];
};

export function FormAjukan({
  mulai, selesai, hariIni, waDefault, jumlahItem, bentrok, tutup, jamLayanan,
  cepat, ringkas,
}: Props) {
  const t = useKamus();
  const router = useRouter();
  const [status, kirim] = useActionState<StatusAjukan, FormData>(
    aksiKirimPengajuan,
    null
  );
  const [tglMulai, setTglMulai] = useState(mulai);
  const [tglSelesai, setTglSelesai] = useState(selesai);

  const error = status && !status.ok ? status.error : undefined;
  const pesanUmum = status && !status.ok ? status.pesan : undefined;

  /** Dorong tanggal ke URL supaya server menghitung ulang bentroknya. */
  function segarkan(m: string, s: string) {
    const p = new URLSearchParams();
    if (m) p.set("mulai", m);
    if (s) p.set("selesai", s);
    router.replace(`/ajukan?${p.toString()}`, { scroll: false });
  }

  const durasi =
    tglMulai && tglSelesai && tglSelesai >= tglMulai
      ? Math.round(
          (Date.parse(`${tglSelesai}T00:00:00Z`) - Date.parse(`${tglMulai}T00:00:00Z`)) /
            86_400_000
        ) + 1
      : 0;

  const siap =
    jumlahItem > 0 && durasi > 0 && bentrok.length === 0 && tutup.length === 0;

  // Hari tutup didahulukan di atas bentrok aset, urutan yang sama dengan
  // pemeriksaan di server. Tanggal yang tutup membatalkan seluruh rentang,
  // jadi menyuruh orang membetulkan jumlah barang lebih dulu itu menyesatkan.
  const petunjukKirim =
    jumlahItem === 0
      ? t.ajukan.belumAdaItem
      : !tglMulai || !tglSelesai
        ? t.ajukan.lengkapiTanggal
        : durasi <= 0
          ? t.ajukan.tanggalTerbalik
          : tutup.length > 0
            ? t.jadwal.adaTutup
            : bentrok.length > 0
              ? t.ajukan.adaBentrok
              : t.ajukan.semuaLengkap;

  return (
    <form action={kirim} noValidate>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))",
          gap: "var(--space-4)",
          alignItems: "start",
        }}
      >
        <div className="flex flex-col" style={{ minWidth: 0, gap: "var(--space-4)" }}>
          {/* ── tanggal ── */}
          <div className="card elev-sm" style={{ background: "var(--color-neutral-100)" }}>
            <h4 style={{ margin: 0 }}>{t.ajukan.langkah2}</h4>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
                gap: "var(--space-3)",
              }}
            >
              <Field
                label={t.ajukan.tanggalPinjam}
                nama="mulai"
                type="date"
                min={hariIni}
                value={tglMulai}
                error={error?.mulai}
                onChange={(e) => {
                  const v = e.target.value;
                  setTglMulai(v);
                  // Rencana kembali ikut maju kalau jadi lebih awal dari mulai.
                  const s = tglSelesai && tglSelesai < v ? v : tglSelesai;
                  setTglSelesai(s);
                  segarkan(v, s);
                }}
                required
              />
              <Field
                label={t.ajukan.rencanaKembali}
                nama="selesai"
                type="date"
                min={tglMulai || hariIni}
                value={tglSelesai}
                error={error?.selesai}
                onChange={(e) => {
                  setTglSelesai(e.target.value);
                  segarkan(tglMulai, e.target.value);
                }}
                required
              />
            </div>

            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {cepat.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: 12 }}
                  onClick={() => {
                    setTglMulai(c.mulai);
                    setTglSelesai(c.selesai);
                    segarkan(c.mulai, c.selesai);
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)" }}>
              {durasi > 0
                ? `${t.ajukan.durasi} ${durasi} ${durasi === 1 ? t.umum.hariSatu : t.umum.hari}.`
                : t.ajukan.pilihTanggal}
            </div>

            {/* Jam layanan sengaja ditaruh di dekat input tanggal, bukan di
                kartu ringkasan. Ini satu satunya tempat orang memikirkan
                waktu, dan di situlah keterangan kapan bisa datang berguna. */}
            <div style={{ fontSize: 11.5, color: "var(--color-neutral-600)" }}>
              {jamLayanan}
            </div>

            {/* Hari tutup memakai kuningan, bukan merah, dan itu bukan sekadar
                selera. Merah dipakai untuk bentrok aset, yang bisa diakali
                dengan mengurangi jumlah atau mengganti aset. Tutup artinya
                tanggalnya yang mustahil, dan membedakan warnanya membuat kedua
                hal itu tidak tertukar saat keduanya muncul bersamaan. */}
            {tutup.map((pesan, i) => (
              <div
                key={i}
                role="alert"
                style={{
                  display: "flex", gap: 9, padding: "11px 13px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-warn-200)",
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--color-warn-800)" strokeWidth="2.75" strokeLinecap="round" style={{ flex: "none", marginTop: 1 }}>
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M8 3v4" /><path d="M16 3v4" /><path d="m9 14 6 5" /><path d="m15 14-6 5" />
                </svg>
                <div style={{ fontSize: 12.5, color: "var(--color-warn-900)" }}>{pesan}</div>
              </div>
            ))}

            {/* Bentrok dihitung ulang di server tiap tanggal berubah. */}
            {bentrok.map((b, i) => (
              <div
                key={i}
                role="alert"
                style={{
                  display: "flex", gap: 9, padding: "11px 13px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-danger-200)",
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger-800)" strokeWidth="2.75" strokeLinecap="round" style={{ flex: "none", marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" />
                </svg>
                <div style={{ fontSize: 12.5, color: "var(--color-danger-900)" }}>{b}</div>
              </div>
            ))}

            {siap && (
              <div
                style={{
                  display: "flex", gap: 9, padding: "11px 13px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-accent-2-200)",
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-2-800)" strokeWidth="2.75" strokeLinecap="round" style={{ flex: "none", marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
                </svg>
                <div style={{ fontSize: 12.5, color: "var(--color-accent-2-900)" }}>
                  {t.ajukan.semuaTersedia}
                </div>
              </div>
            )}
          </div>

          {/* ── keperluan ── */}
          <div className="card elev-sm" style={{ background: "var(--color-neutral-100)" }}>
            <h4 style={{ margin: 0 }}>{t.ajukan.langkah3}</h4>
            <Field
              label={t.ajukan.namaKegiatan}
              nama="namaKegiatan"
              placeholder={t.ajukan.namaKegiatanContoh}
              error={error?.namaKegiatan}
            />
            <FieldArea
              label={t.ajukan.keperluan}
              nama="keperluan"
              placeholder={t.ajukan.keperluanContoh}
              error={error?.keperluan}
              required
            />
            <div style={{ maxWidth: 280 }}>
              <Field
                label={t.ajukan.kontak}
                nama="kontakWhatsapp"
                defaultValue={waDefault}
                placeholder={t.ajukan.kontakContoh}
                error={error?.kontakWhatsapp}
                required
              />
            </div>

            <label className="radio" style={{ alignItems: "flex-start", gap: 10, marginTop: 4 }}>
              <input type="checkbox" name="setuju" />
              <span className="dot dot-square" />
              <span style={{ fontSize: 12.5, color: "var(--color-neutral-700)" }}>
                {t.ajukan.pernyataan}
              </span>
            </label>
            {error?.setuju && <div className="field-error">{error.setuju[0]}</div>}
          </div>
        </div>

        {/* ── ringkasan ── */}
        <div style={{ minWidth: 0, position: "sticky", top: 84 }}>
          {/* Kartu ini cuma merangkum, tidak menandai keadaan apa apa, jadi
              latarnya netral. Hijau disimpan untuk banner "semua tersedia"
              di atas, yang memang membawa arti. */}
          <div className="card elev-md" style={{ background: "var(--color-neutral-100)" }}>
            <span className="card-kicker">{t.ajukan.ringkasan}</span>
            <div
              className="flex flex-col"
              style={{ gap: 7, fontSize: 13, color: "var(--color-text)" }}
            >
              {ringkas.map((r) => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span>{r.label}</span>
                  <b style={{ textAlign: "right" }}>{r.nilai}</b>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span>{t.ajukan.durasi}</span>
                <b>
                  {durasi > 0
                    ? `${durasi} ${durasi === 1 ? t.umum.hariSatu : t.umum.hari}`
                    : t.umum.tidakAda}
                </b>
              </div>
            </div>

            <div style={{ height: 1, background: "var(--color-divider)", margin: "4px 0" }} />

            <PesanGagal pesan={pesanUmum} />

            <div style={{ fontSize: 12, color: "var(--color-neutral-600)" }}>
              {petunjukKirim}
            </div>

            <TombolKirim sedang={t.ajukan.mengirim} disabled={!siap}>
              {t.ajukan.kirim}
            </TombolKirim>
          </div>
        </div>
      </div>
    </form>
  );
}
