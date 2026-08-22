"use client";

import { useKamus } from "@/components/kamus-provider";

import { useEffect, useRef } from "react";

/**
 * Modal berbasis elemen <dialog> native, bukan div biasa.
 *
 * Alasannya: showModal() memberi jebakan fokus, latar yang otomatis inert,
 * dan penanganan Escape secara gratis dari browser. Menyusun sendiri jebakan
 * fokus itu mudah salah dan hasilnya jarang sebaik bawaan browser.
 */

type ModalProps = {
  terbuka: boolean;
  judul: string;
  onTutup: () => void;
  /**
   * Klik di area gelap menutup modal. Dimatikan untuk modal ucapan yang
   * memang harus diakui dulu oleh pengguna sebelum lanjut.
   */
  tutupDiLatar?: boolean;
  rupa?: Rupa;
  children: React.ReactNode;
  aksi: React.ReactNode;
};

/**
 * Rupa menentukan warna ikon, dan lewat itu memberi tahu bobot aksinya
 * sebelum kalimatnya sempat dibaca. "bahaya" untuk yang mencabut akses,
 * "naik" untuk yang menambah hak akses.
 */
type Rupa = "sukses" | "pamit" | "tanya" | "bahaya" | "naik";

const IKON: Record<Rupa, { latar: string; warna: string; jalur: React.ReactNode }> = {
  sukses: {
    latar: "var(--color-accent-2-200)",
    warna: "var(--color-accent-2-800)",
    jalur: <path d="M20 6 9 17l-5-5" />,
  },
  pamit: {
    latar: "var(--color-neutral-200)",
    warna: "var(--color-neutral-800)",
    jalur: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="m16 17 5-5-5-5" />
        <path d="M21 12H9" />
      </>
    ),
  },
  bahaya: {
    latar: "var(--color-danger-200)",
    warna: "var(--color-danger-800)",
    jalur: (
      <>
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </>
    ),
  },
  naik: {
    latar: "var(--color-accent-200)",
    warna: "var(--color-accent-800)",
    jalur: (
      <>
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </>
    ),
  },
  tanya: {
    latar: "var(--color-warn-200)",
    warna: "var(--color-warn-800)",
    jalur: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16h.01" />
        <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
      </>
    ),
  },
};

export function Modal({
  terbuka,
  judul,
  onTutup,
  tutupDiLatar = false,
  rupa = "sukses",
  children,
  aksi,
}: ModalProps) {
  const tKamus = useKamus();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (terbuka && !d.open) d.showModal();
    if (!terbuka && d.open) d.close();
  }, [terbuka]);

  const ikon = IKON[rupa];

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="modal-judul"
      // Escape memicu 'cancel'. Dibiarkan menutup: memblokirnya melanggar
      // ekspektasi dasar aksesibilitas, dan menekan Escape tetap tindakan
      // sadar dari pengguna, bukan kecelakaan.
      onCancel={(e) => {
        e.preventDefault();
        onTutup();
      }}
      onClick={(e) => {
        // Klik yang mengenai elemen <dialog> itu sendiri berarti kena area
        // gelap, sebab isinya dibungkus div di bawah ini.
        if (tutupDiLatar && e.target === ref.current) onTutup();
      }}
    >
      {/* Tombol silang. Modal ucapan tidak bisa ditutup dengan klik di area
          gelap, jadi harus selalu ada jalan keluar yang terlihat. */}
      <button
        type="button"
        className="dialog-tutup"
        aria-label={tKamus.umum.tutup}
        onClick={onTutup}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <div
          aria-hidden
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: ikon.latar,
            display: "grid",
            placeItems: "center",
            alignSelf: "center",
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke={ikon.warna}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {ikon.jalur}
          </svg>
        </div>

        <h2 id="modal-judul" className="dialog-title" style={{ textAlign: "center", margin: 0 }}>
          {judul}
        </h2>

        {/* Lebar baris dibatasi sekitar 42 karakter. Di atas itu mata
            kehilangan awal baris berikutnya, dan modal justru jadi lebih
            sulit dibaca walau kalimatnya pendek. */}
        <div className="dialog-body dialog-teks">{children}</div>

        <div className="dialog-actions" style={{ justifyContent: "center" }}>
          {aksi}
        </div>
      </div>
    </dialog>
  );
}

/**
 * Modal ucapan satu tombol. Wajib diakui dulu, klik latar tidak menutup.
 *
 * labelTombol SENGAJA tanpa nilai bawaan. Sebelumnya bawaannya "Mengerti",
 * dan bawaan itulah yang membuat tombolnya tetap berbahasa Indonesia di mode
 * Inggris tanpa ada yang menyadarinya: pemanggil yang lupa mengisinya tidak
 * mendapat peringatan apa pun. Dengan dijadikan wajib, TypeScript yang
 * menolak lebih dulu, jadi kesalahan yang sama tidak bisa terulang diam diam.
 */
export function ModalInfo({
  terbuka,
  judul,
  labelTombol,
  rupa = "sukses",
  onTutup,
  children,
}: {
  terbuka: boolean;
  judul: string;
  labelTombol: string;
  rupa?: Rupa;
  onTutup: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      terbuka={terbuka}
      judul={judul}
      rupa={rupa}
      onTutup={onTutup}
      tutupDiLatar={false}
      aksi={
        <button type="button" className="btn btn-primary" onClick={onTutup} autoFocus>
          {labelTombol}
        </button>
      }
    >
      {children}
    </Modal>
  );
}

/**
 * Modal pertanyaan dua tombol. Tombol lanjutnya dikirim dari pemanggil supaya
 * bisa berupa submit sebuah <form> yang memanggil server action.
 */
export function ModalKonfirmasi({
  terbuka,
  judul,
  labelBatal,
  rupa = "tanya",
  onBatal,
  lanjut,
  children,
}: {
  terbuka: boolean;
  judul: string;
  /** Wajib diisi. Alasannya sama dengan labelTombol di ModalInfo di atas. */
  labelBatal: string;
  rupa?: Rupa;
  onBatal: () => void;
  lanjut: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Modal
      terbuka={terbuka}
      judul={judul}
      rupa={rupa}
      onTutup={onBatal}
      tutupDiLatar
      aksi={
        <>
          <button type="button" className="btn btn-secondary" onClick={onBatal} autoFocus>
            {labelBatal}
          </button>
          {lanjut}
        </>
      }
    >
      {children}
    </Modal>
  );
}
