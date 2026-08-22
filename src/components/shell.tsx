"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ItemNav } from "@/lib/navigasi";
import { judulUntuk, sedangAktif } from "@/lib/navigasi";
import type { Bahasa, Tema } from "@/lib/preferensi";
import type { Kamus } from "@/lib/kamus";
import { TogelBahasa, TogelTema } from "@/components/togel-tampilan";
import { PenyediaKamus } from "@/components/kamus-provider";
import { JudulHalaman } from "@/components/judul-halaman";
import { ModalKonfirmasi } from "@/components/modal";
import { TombolKirim } from "@/components/form";
import { IkonNav } from "@/components/ikon-nav";
import { LambangSipras } from "@/components/logo";

export type RingkasNotif = {
  id: string;
  judul: string;
  isi: string;
  tautan: string | null;
  dibaca: boolean;
  waktu: string;
};

type Props = {
  nama: string;
  inisial: string;
  peranLabel: string;
  brand: string;
  items: ItemNav[];
  lencana: Record<string, number>;
  notif: RingkasNotif[];
  belumDibaca: number;
  /** Dibaca dari cookie di server supaya sidebar tidak berkedip salah posisi. */
  sidebarAwal: boolean;
  keluar: () => Promise<void>;
  tandaiDibaca: () => Promise<void>;
  tandaiSatu: (id: string) => Promise<void>;
  simpanBahasa: (nilai: string) => Promise<void>;
  t: Kamus;
  tema: Tema;
  bahasa: Bahasa;
  /** Dikirim dari server karena Footer bukan komponen klien. */
  footer?: React.ReactNode;
  children: React.ReactNode;
};

const SETAHUN = 60 * 60 * 24 * 365;

/**
 * Kerangka aplikasi.
 *
 * Aturan responsifnya tegas dan tidak pernah tumpang tindih:
 *   layar >= 768px  : sidebar yang bisa buka tutup, tanpa navigasi bawah
 *   layar <  768px  : navigasi bawah saja, tanpa sidebar dan tanpa burger
 *
 * Pengaturan tampil sembunyi memakai kelas sendiri (.hanya-desktop dan
 * .hanya-hp) di globals.css, BUKAN utility Tailwind. Alasannya konkret:
 * `.btn { display: inline-flex }` mengalahkan `.hidden`, dan `display` di
 * inline style mengalahkan kelas apa pun. Dua bug pernah lahir dari sana.
 */
export function Shell({
  nama,
  inisial,
  peranLabel,
  brand,
  items,
  lencana,
  notif,
  belumDibaca,
  sidebarAwal,
  keluar,
  tandaiDibaca,
  tandaiSatu,
  simpanBahasa,
  t,
  tema,
  bahasa,
  footer,
  children,
}: Props) {
  const pathname = usePathname();
  const [judul, sub] = judulUntuk(pathname, t);

  const [sidebarBuka, setSidebarBuka] = useState(sidebarAwal);
  const [tanyaKeluar, setTanyaKeluar] = useState(false);

  function togelSidebar() {
    const berikutnya = !sidebarBuka;
    setSidebarBuka(berikutnya);
    // Preferensi tampilan saja, jadi cukup cookie biasa yang bisa ditulis
    // klien. Server membacanya untuk render pertama tanpa kedipan.
    document.cookie = `sipras_sidebar=${berikutnya ? "buka" : "tutup"}; path=/; max-age=${SETAHUN}; samesite=lax`;
  }

  return (
    <PenyediaKamus nilai={t}>
    <div className="flex items-stretch" style={{ minHeight: "100vh" }}>
      {/* Sidebar tidak pernah dilepas dari DOM. Saat ditutup ia menyusut jadi
          rel ikon, karena burger ada DI DALAMNYA dan harus tetap terjangkau. */}
      <aside
        id="menu-samping"
        className={`sidebar hanya-desktop${sidebarBuka ? "" : " rel"}`}
      >
        <IsiSidebar
          brand={brand}
          peranLabel={peranLabel}
          items={items}
          lencana={lencana}
          pathname={pathname}
          terbuka={sidebarBuka}
          onTogel={togelSidebar}
          t={t}
        />
      </aside>

      <main className="flex flex-col" style={{ flex: 1, minWidth: 0 }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "var(--space-3) var(--space-4)",
            borderBottom: "1px solid var(--color-divider)",
            background: "var(--color-bg)",
            position: "sticky",
            top: 0,
            zIndex: 60,
          }}
        >
          <JudulHalaman
            judul={judul}
            sub={sub}
            labelMuatUlang={t.shell.muatUlang}
            sedangMemuat={t.shell.sedangMemuat}
            baruSaja={t.shell.baruSaja}
            menitLalu={t.shell.menitLalu}
            jamLalu={t.shell.jamLalu}
          />

          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
              position: "relative",
            }}
          >
            <TogelBahasa
              awal={bahasa}
              label={t.shell.gantiBahasa}
              simpanKeAkun={simpanBahasa}
            />
            <TogelTema
              awal={tema}
              labelKeGelap={t.shell.keGelap}
              labelKeTerang={t.shell.keTerang}
            />

            <Lonceng
              notif={notif}
              belumDibaca={belumDibaca}
              tandaiDibaca={tandaiDibaca}
              tandaiSatu={tandaiSatu}
              t={t}
            />

            <MenuAkun nama={nama} inisial={inisial} t={t} />

            {/* Tombol keluar berdiri sendiri sebagai ikon. Modal konfirmasi
                baru muncul setelah tombol ini ditekan, tidak sebelumnya. */}
            <button
              type="button"
              className="btn btn-secondary btn-icon"
              aria-label={t.shell.keluar}
              title={t.shell.keluar}
              onClick={() => setTanyaKeluar(true)}
            >
              <IkonKeluar />
            </button>
          </div>
        </header>

        <div
          style={{
            flex: 1,
            padding: "var(--space-6) clamp(18px,3vw,40px) var(--space-8)",
          }}
        >
          {children}
        </div>

        {footer}

        <TabBawah items={items} lencana={lencana} pathname={pathname} />
      </main>

      <ModalKonfirmasi
        terbuka={tanyaKeluar}
        judul={t.shell.keluarJudul}
        labelBatal={t.shell.keluarBatal}
        onBatal={() => setTanyaKeluar(false)}
        lanjut={
          <form action={keluar}>
            <TombolKirim className="btn btn-primary" sedang={t.shell.keluarSedang}>
              {t.shell.keluarLanjut}
            </TombolKirim>
          </form>
        }
      >
        {t.shell.keluarIsi}
      </ModalKonfirmasi>
    </div>
    </PenyediaKamus>
  );
}

function IkonBurger() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

function IkonKeluar() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

// ── isi sidebar ─────────────────────────────────────────────────────────
function IsiSidebar({
  brand, peranLabel, items, lencana, pathname, terbuka, onTogel, t,
}: {
  brand: string;
  peranLabel: string;
  items: ItemNav[];
  lencana: Record<string, number>;
  pathname: string;
  terbuka: boolean;
  onTogel: () => void;
  t: Kamus;
}) {
  return (
    <div className="sidebar-isi">
      {/* Burger duduk di puncak sidebar, bukan di header, karena memang
          tugasnya membuka dan menutup sidebar ini. Saat menyusut jadi rel,
          tombol ini yang tersisa sebagai jalan untuk membukanya lagi. */}
      <div className="sidebar-kepala">
        <button
          type="button"
          className="sidebar-burger"
          aria-expanded={terbuka}
          aria-controls="menu-samping"
          aria-label={terbuka ? t.shell.tutupMenu : t.shell.bukaMenu}
          title={terbuka ? t.shell.tutupMenu : t.shell.bukaMenu}
          onClick={onTogel}
        >
          <IkonBurger />
        </button>

        <span className="sidebar-merek">
          <LambangSipras ukuran={30} />
          <span className="nav-label">{brand}</span>
        </span>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <div className="nav-label sidebar-peran">{peranLabel}</div>

        {items.map((it) => {
          const aktif = sedangAktif(it, pathname);
          const n = lencana[it.href] ?? 0;
          return (
            <Link
              key={it.href}
              href={it.href}
              className="nav-item"
              aria-current={aktif ? "page" : undefined}
              // Label tetap terbaca pembaca layar walau teksnya disembunyikan
              // saat sidebar menyusut jadi rel.
              aria-label={it.label}
              title={terbuka ? undefined : it.label}
            >
              <IkonNav nama={it.ikon} />
              <span className="nav-label">{it.label}</span>
              {n > 0 && (
                <span
                  className={terbuka ? "nav-lencana" : "nav-lencana rel"}
                  style={{
                    /* Saat tidak aktif, isiannya memakai token pendamping panel,
                       bukan neutral-300. Sidebar sekarang bertona, dan di atas
                       tona itu neutral-300 cuma berjarak 2.1 L*, jadi angka
                       yang menunggu ditangani justru jadi yang paling sulit
                       terlihat. Saat aktif isiannya sudah pekat, jadi aman. */
                    background: aktif ? "var(--color-accent-700)" : "var(--color-panel-isian)",
                    color: aktif ? "var(--color-di-atas-solid)" : "var(--color-neutral-800)",
                  }}
                >
                  {n}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

// ── navigasi bawah, hanya di HP ─────────────────────────────────────────
function TabBawah({
  items, lencana, pathname,
}: {
  items: ItemNav[];
  lencana: Record<string, number>;
  pathname: string;
}) {
  return (
    // Tidak ada properti `display` di inline style. Kalau ada, ia akan
    // mengalahkan .hanya-hp dan navigasi ini ikut muncul di desktop.
    <nav className="tab-bawah hanya-hp">
      {items.map((it) => {
        const aktif = sedangAktif(it, pathname);
        const n = lencana[it.href] ?? 0;
        return (
          <Link
            key={it.href}
            href={it.href}
            className="tab-item"
            aria-current={aktif ? "page" : undefined}
          >
            <IkonNav nama={it.ikon} ukuran={19} />
            <span style={{ fontSize: 10.5, lineHeight: 1.1, textAlign: "center" }}>
              {it.pendek}
            </span>
            {n > 0 && (
              <span
                style={{
                  position: "absolute", top: 2, right: 8,
                  minWidth: 16, height: 16, padding: "0 4px", borderRadius: 999,
                  display: "grid", placeItems: "center",
                  background: "var(--color-accent-700)", color: "var(--color-di-atas-solid)",
                  fontSize: 9.5, fontWeight: 700,
                }}
              >
                {n}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

// ── menu akun ───────────────────────────────────────────────────────────
function MenuAkun({ nama, inisial, t }: { nama: string; inisial: string; t: Kamus }) {
  const [buka, setBuka] = useState(false);
  const wadah = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!buka) return;
    const klik = (e: MouseEvent) => {
      if (!wadah.current?.contains(e.target as Node)) setBuka(false);
    };
    const tombol = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBuka(false);
    };
    document.addEventListener("mousedown", klik);
    document.addEventListener("keydown", tombol);
    return () => {
      document.removeEventListener("mousedown", klik);
      document.removeEventListener("keydown", tombol);
    };
  }, [buka]);

  const gayaItem: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 9, width: "100%",
    padding: "9px 11px", borderRadius: "var(--radius-md)",
    fontSize: 13, textAlign: "left", color: "var(--color-text)",
    background: "transparent", border: "none", font: "inherit", cursor: "pointer",
  };

  return (
    <div ref={wadah} style={{ position: "relative" }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={buka}
        aria-label={`${t.shell.menuAkun} ${nama}`}
        onClick={() => setBuka((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "4px 12px 4px 4px", borderRadius: 999,
          background: "var(--color-neutral-100)",
          border: "1px solid var(--color-divider)", font: "inherit", cursor: "pointer",
          color: "var(--color-text)",
        }}
      >
        <span
          aria-hidden
          style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "var(--color-accent-200)",
            display: "grid", placeItems: "center",
            fontSize: 11.5, fontWeight: 700,
            color: "var(--color-accent-900)",
          }}
        >
          {inisial}
        </span>
        <span style={{ fontSize: 12, lineHeight: 1.2 }} className="hidden sm:block">
          {nama}
        </span>
      </button>

      {buka && (
        <div
          role="menu"
          className="card elev-lg anim-pop"
          style={{
            position: "absolute", top: 44, right: 0,
            width: "min(220px,80vw)", zIndex: 90, gap: 2,
            // Lapisan melayang, bukan warna kartu. Menu turun mengambang di
            // atas isi halaman, jadi ia memakai permukaan paling terang
            // supaya jelas terpisah dari kartu di belakangnya.
            background: "var(--color-elevated)",
          }}
        >
          <Link href="/profil" role="menuitem" style={gayaItem} onClick={() => setBuka(false)}>
            {t.shell.profilSaya}
          </Link>
          <Link href="/notifikasi" role="menuitem" style={gayaItem} onClick={() => setBuka(false)}>
            {t.shell.semuaNotifikasi}
          </Link>
        </div>
      )}
    </div>
  );
}

// ── lonceng notifikasi ──────────────────────────────────────────────────
function Lonceng({
  notif, belumDibaca, tandaiDibaca, tandaiSatu, t,
}: {
  notif: RingkasNotif[];
  belumDibaca: number;
  tandaiDibaca: () => Promise<void>;
  tandaiSatu: (id: string) => Promise<void>;
  t: Kamus;
}) {
  const [buka, setBuka] = useState(false);
  const wadah = useRef<HTMLDivElement>(null);

  // Tutup saat klik di luar atau tekan Escape. Panel melayang tanpa ini
  // gampang "nyangkut" terbuka di HP.
  useEffect(() => {
    if (!buka) return;
    const klik = (e: MouseEvent) => {
      if (!wadah.current?.contains(e.target as Node)) setBuka(false);
    };
    const tombol = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBuka(false);
    };
    document.addEventListener("mousedown", klik);
    document.addEventListener("keydown", tombol);
    return () => {
      document.removeEventListener("mousedown", klik);
      document.removeEventListener("keydown", tombol);
    };
  }, [buka]);

  return (
    <div ref={wadah} style={{ position: "relative" }}>
      <button
        type="button"
        className="btn btn-secondary btn-icon"
        aria-label={`${t.shell.notifikasi}${belumDibaca ? `, ${belumDibaca} ${t.shell.belumDibaca}` : ""}`}
        aria-expanded={buka}
        style={{ position: "relative" }}
        // Membuka lonceng TIDAK menandai apa apa. Dulu begitu, dan semua
        // penanda hilang sekaligus hanya karena pengguna mengintip.
        onClick={() => setBuka((v) => !v)}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round">
          <path d="M10.268 21a2 2 0 0 0 3.464 0" />
          <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
        </svg>
        {/* Angka, bukan titik polos, supaya berkurangnya terasa saat satu
            notifikasi ditekan. */}
        {belumDibaca > 0 && (
          <span
            aria-hidden
            style={{
              position: "absolute", top: -4, right: -4,
              minWidth: 18, height: 18, padding: "0 5px",
              borderRadius: 999, display: "grid", placeItems: "center",
              background: "var(--color-danger-600)", color: "var(--color-di-atas-solid)",
              fontSize: 10, fontWeight: 700, lineHeight: 1,
              border: "2px solid var(--color-bg)",
            }}
          >
            {belumDibaca > 9 ? "9+" : belumDibaca}
          </span>
        )}
      </button>

      {buka && (
        <div
          className="card elev-lg anim-pop"
          style={{
            position: "absolute", top: 44, right: 0,
            width: "min(320px,80vw)", zIndex: 90,
            // Sama alasannya dengan menu akun di atas: panel melayang.
            background: "var(--color-elevated)",
            maxHeight: "70vh", overflowY: "auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 15 }}>{t.shell.notifikasi}</span>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: 11.5 }}
              onClick={() => setBuka(false)}
            >
              {t.umum.tutup}
            </button>
          </div>

          {notif.length === 0 && (
            <div style={{ fontSize: 12.5, color: "var(--color-neutral-600)", padding: "8px 0" }}>
              {t.shell.notifKosong}
            </div>
          )}

          {/* Tiap notifikasi bisa ditekan. Menekannya menandai terbaca lalu
              membuka tautannya. Yang tanpa tautan tetap bisa ditekan untuk
              menandai terbaca saja. */}
          {notif.map((n) => {
            const isi = (
              <>
                <span
                  aria-hidden
                  style={{
                    width: 8, height: 8, borderRadius: "50%", flex: "none", marginTop: 5,
                    background: n.dibaca ? "var(--color-neutral-400)" : "var(--color-accent-600)",
                  }}
                />
                <span style={{ minWidth: 0, textAlign: "left" }}>
                  <span
                    style={{
                      display: "block", fontSize: 12.5, lineHeight: 1.35,
                      fontWeight: n.dibaca ? 400 : 700,
                      color: "var(--color-text)",
                    }}
                  >
                    {n.judul}
                  </span>
                  <span style={{ display: "block", fontSize: 12, lineHeight: 1.35, color: "var(--color-neutral-700)" }}>
                    {n.isi}
                  </span>
                  <span style={{ display: "block", fontSize: 10.5, color: "var(--color-neutral-600)", marginTop: 2 }}>
                    {n.waktu}
                  </span>
                </span>
              </>
            );

            const gaya: React.CSSProperties = {
              display: "flex", gap: 10, padding: "9px 6px", width: "100%",
              borderTop: "1px solid var(--color-divider)",
              background: "transparent", border: 0, borderRadius: 8,
              font: "inherit", cursor: "pointer",
              borderTopWidth: 1, borderTopStyle: "solid",
              borderTopColor: "var(--color-divider)",
            };

            const tandai = () => {
              setBuka(false);
              if (!n.dibaca) void tandaiSatu(n.id);
            };

            return n.tautan ? (
              <Link key={n.id} href={n.tautan} style={gaya} onClick={tandai}>
                {isi}
              </Link>
            ) : (
              <button key={n.id} type="button" style={gaya} onClick={tandai}>
                {isi}
              </button>
            );
          })}

          <div
            style={{
              borderTop: "1px solid var(--color-divider)", paddingTop: 8,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 8, flexWrap: "wrap",
            }}
          >
            {belumDibaca > 0 ? (
              <form action={tandaiDibaca}>
                <button type="submit" className="btn btn-ghost" style={{ fontSize: 11.5 }}>
                  {t.shell.tandaiSemua}
                </button>
              </form>
            ) : (
              <span style={{ fontSize: 10.5, color: "var(--color-neutral-600)" }}>
                {t.shell.dikirimEmail}
              </span>
            )}
            <Link
              href="/notifikasi"
              className="tautan"
              style={{ fontSize: 11.5 }}
              onClick={() => setBuka(false)}
            >
              {t.umum.lihatSemua}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
