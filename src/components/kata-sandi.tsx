"use client";

import { useId, useState } from "react";
import { nilaiKekuatan, type Tingkat } from "@/lib/sandi";
import { useKamus } from "@/components/kamus-provider";

/**
 * Field kata sandi dengan tombol mata, dan bar kekuatan opsional.
 *
 * Nilainya selalu terkendali dari luar. Selain dibutuhkan bar kekuatan,
 * ini juga yang membuat isian tidak hilang saat server menolak form:
 * React 19 mengosongkan input tak terkendali setelah form action selesai.
 */

const WARNA: Record<Tingkat, string> = {
  lemah: "var(--color-danger-600)",
  sedang: "var(--color-warn-600)",
  kuat: "var(--color-accent-2-600)",
};

type Props = {
  label: string;
  nama: string;
  nilai: string;
  onUbah: (nilai: string) => void;
  error?: string[];
  petunjuk?: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  /** Tampilkan bar kekuatan. Tidak relevan di halaman masuk. */
  meter?: boolean;
};

export function FieldSandi({
  label,
  nama,
  nilai,
  onUbah,
  error,
  petunjuk,
  autoComplete,
  placeholder,
  required,
  meter = false,
}: Props) {
  const t = useKamus();
  const [terlihat, setTerlihat] = useState(false);
  const idBantuan = useId();

  const punyaError = !!error?.length;
  const kuat = meter ? nilaiKekuatan(nilai, t.sandi) : null;

  return (
    <div className="field">
      <label htmlFor={nama}>{label}</label>

      <div style={{ position: "relative" }}>
        <input
          id={nama}
          name={nama}
          type={terlihat ? "text" : "password"}
          className="input"
          value={nilai}
          onChange={(e) => onUbah(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          aria-invalid={punyaError || undefined}
          aria-describedby={idBantuan}
          style={{ paddingRight: 44 }}
        />
        <button
          type="button"
          onClick={() => setTerlihat((v) => !v)}
          aria-pressed={terlihat}
          aria-label={terlihat ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          title={terlihat ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          style={{
            position: "absolute",
            top: "50%",
            right: 6,
            transform: "translateY(-50%)",
            width: 32,
            height: 32,
            display: "grid",
            placeItems: "center",
            border: 0,
            borderRadius: "50%",
            background: "transparent",
            color: "var(--color-neutral-600)",
            cursor: "pointer",
          }}
        >
          {terlihat ? <IkonMataTutup /> : <IkonMata />}
        </button>
      </div>

      {meter && (
        <div aria-live="polite" style={{ marginTop: 7 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 999,
                  background:
                    kuat && kuat.skor >= n
                      ? WARNA[kuat.tingkat]
                      : "var(--color-neutral-300)",
                }}
              />
            ))}
          </div>
          {nilai.length > 0 && kuat && (
            <div
              style={{
                fontSize: 11.5,
                marginTop: 4,
                color: "var(--color-neutral-700)",
              }}
            >
              <b style={{ color: WARNA[kuat.tingkat] }}>{kuat.label}</b>
              {kuat.saran ? `. ${kuat.saran}` : `. ${t.sandi.sudahAman}`}
            </div>
          )}
        </div>
      )}

      <div id={idBantuan}>
        {petunjuk && !punyaError && (
          <div style={{ fontSize: 11.5, color: "var(--color-neutral-600)", marginTop: 4 }}>
            {petunjuk}
          </div>
        )}
        {punyaError && <div className="field-error">{error![0]}</div>}
      </div>
    </div>
  );
}

function IkonMata() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IkonMataTutup() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.7 6.2A9.8 9.8 0 0 1 12 6c6.4 0 10 7 10 7a17 17 0 0 1-2.4 3.2" />
      <path d="M6.3 6.9A16.7 16.7 0 0 0 2 13s3.6 7 10 7a9.7 9.7 0 0 0 4.3-1" />
      <path d="M9.9 10.1a3 3 0 0 0 4.2 4.2" />
      <path d="m3 3 18 18" />
    </svg>
  );
}
