"use client";

import { useFormStatus } from "react-dom";
import { useKamus } from "@/components/kamus-provider";

/** Pesan error di atas form, dipakai untuk kegagalan yang bukan milik satu field. */
export function PesanGagal({ pesan }: { pesan?: string }) {
  if (!pesan) return null;
  return (
    <div
      role="alert"
      className="flex gap-2 items-start"
      style={{
        padding: "11px 13px",
        borderRadius: "var(--radius-md)",
        background: "var(--color-danger-200)",
        color: "var(--color-danger-900)",
        fontSize: "12.5px",
      }}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" style={{ flex: "none", marginTop: 1 }}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
      <span>{pesan}</span>
    </div>
  );
}

export function PesanSukses({ pesan }: { pesan?: string }) {
  if (!pesan) return null;
  return (
    <div
      role="status"
      className="flex gap-2 items-start"
      style={{
        padding: "11px 13px",
        borderRadius: "var(--radius-md)",
        background: "var(--color-accent-2-200)",
        color: "var(--color-accent-2-900)",
        fontSize: "12.5px",
      }}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" style={{ flex: "none", marginTop: 1 }}>
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
      <span>{pesan}</span>
    </div>
  );
}

type FieldProps = {
  label: string;
  nama: string;
  error?: string[];
  petunjuk?: string;
  children?: React.ReactNode;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name">;

/** Field teks standar. Error ditempel di bawah dan ditautkan lewat aria. */
export function Field({
  label,
  nama,
  error,
  petunjuk,
  children,
  ...sisa
}: FieldProps) {
  const idError = `${nama}-error`;
  const punyaError = !!error?.length;
  return (
    <div className="field">
      <label htmlFor={nama}>{label}</label>
      {children ?? (
        <input
          {...sisa}
          id={nama}
          name={nama}
          className="input"
          aria-invalid={punyaError || undefined}
          aria-describedby={punyaError ? idError : undefined}
        />
      )}
      {petunjuk && !punyaError && (
        <div style={{ fontSize: "11.5px", color: "var(--color-neutral-600)", marginTop: 4 }}>
          {petunjuk}
        </div>
      )}
      {punyaError && (
        <div className="field-error" id={idError}>
          {error![0]}
        </div>
      )}
    </div>
  );
}

/** Textarea dengan gaya .input. */
export function FieldArea({
  label,
  nama,
  error,
  petunjuk,
  ...sisa
}: {
  label: string;
  nama: string;
  error?: string[];
  petunjuk?: string;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "name">) {
  const idError = `${nama}-error`;
  const punyaError = !!error?.length;
  return (
    <div className="field">
      <label htmlFor={nama}>{label}</label>
      <textarea
        {...sisa}
        id={nama}
        name={nama}
        className="input"
        aria-invalid={punyaError || undefined}
        aria-describedby={punyaError ? idError : undefined}
      />
      {petunjuk && !punyaError && (
        <div style={{ fontSize: "11.5px", color: "var(--color-neutral-600)", marginTop: 4 }}>
          {petunjuk}
        </div>
      )}
      {punyaError && (
        <div className="field-error" id={idError}>
          {error![0]}
        </div>
      )}
    </div>
  );
}

/**
 * Tombol kirim yang mengunci diri selama aksi berjalan, mencegah pengajuan
 * terkirim dua kali karena klik ganda.
 */
export function TombolKirim({
  children,
  sedang,
  className = "btn btn-primary btn-block",
  disabled,
  ...sisa
}: {
  children: React.ReactNode;
  sedang?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  // Cadangannya diambil dari kamus, bukan ditulis literal. Nilai bawaan
  // berbahasa Indonesia adalah cara kebocoran ini bersembunyi paling lama:
  // pemanggil yang lupa mengisi `sedang` tidak mendapat peringatan apa pun.
  const t = useKamus();
  return (
    <button
      {...sisa}
      type="submit"
      className={className}
      disabled={pending || disabled}
      aria-busy={pending || undefined}
    >
      {pending ? (sedang ?? t.umum.memuat) : children}
    </button>
  );
}
