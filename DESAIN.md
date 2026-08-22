# SIPRAS — Ringkasan Desain untuk Brainstorming Ulang

Dokumen ini merangkum sistem desain SIPRAS sekarang: apa yang sudah ada,
kenapa dibuat begitu, dan yang mana yang boleh diubah bebas. Tujuannya
supaya diskusi dengan Claude Design tidak mulai dari nol dan tidak
mengulang jalan buntu yang sudah pernah dicoba.

**Keluhan yang memicu dokumen ini:** mode terang terasa *boring*. Mode
gelap sudah disukai dan **tidak** ingin diubah.

---

## 1. Apa aplikasi ini

SIPRAS = Sistem Peminjaman Sarana dan Prasarana. Aplikasi kampus untuk
meminjam ruang dan barang (proyektor, kursi lipat, kamera, dll). Dua
peran: **peminjam** (mahasiswa/staf) dan **admin** (petugas sarpras).
Alurnya: ajukan → direview admin → disetujui → diserahkan → dipakai →
dikembalikan → diverifikasi → selesai.

Nuansanya harus terasa **institusional tapi manusiawi** — bukan aplikasi
korporat yang dingin, tapi juga bukan aplikasi konsumen yang playful.
Penggunanya beragam: mahasiswa baru yang belum pernah pakai sistem
formal, sampai admin yang membukanya puluhan kali sehari.

---

## 2. Riwayat palet: apa yang sudah ditolak, dan kenapa

Palet warna sudah berganti **empat kali**. Setiap percobaan gagal dengan
alasan yang berbeda, dan pola penolakannya penting dipahami supaya tidak
terulang:

| Ronde | Arah | Kenapa ditolak |
|---|---|---|
| 1 | Hangat organik (krem, terracotta, sage) | Terlalu berwarna — warna jadi dekorasi, berhenti bermakna |
| 2 | Grafit minimal (nyaris hitam-putih) | Terlalu suram, tidak mengundang |
| 3 | Indigo cerah di atas putih dingin | Terlalu pucat, kesannya pastel |
| 4 (**sekarang**) | Biru Laut di atas pasir hangat | Mode gelap disukai; **mode terang dinilai boring** |

**Pelajaran dari pola di atas:** solusinya kemungkinan besar bukan
"tambah lebih banyak warna" (sudah gagal di ronde 1) dan bukan "kurangi
warna jadi minimal" (sudah gagal di ronde 2). Yang mungkin belum dicoba:
menambah **kontras struktural** antar lapisan permukaan, atau
mengeksplorasi **tona/value** dari warna yang sudah ada tanpa menambah
hue baru, atau mempertimbangkan apakah masalahnya bukan di palet warna
sama sekali tapi di tekstur/tipografi/whitespace.

Saat mode terang terakhir diperbaiki (lihat §5), diagnosisnya adalah:
tiga lapisan permukaan (latar, panel, kartu) nilainya nyaris sama —
semua di kisaran L\* 94–100 — jadi halaman kehilangan struktur dan
terasa "putih di atas putih". Itu sudah dibetulkan dengan menambah jarak
lightness antar lapisan, tapi hasilnya *masih* dinilai boring. Itu
sinyal bahwa masalahnya mungkin bukan cuma soal kontras value, tapi soal
karakter/kepribadian visual keseluruhan.

---

## 3. Token warna sekarang (`src/app/globals.css`)

Semua warna didefinisikan sebagai CSS custom properties di satu berkas,
`src/app/globals.css`. Tidak ada hex literal di komponen — semuanya
lewat token. Mode gelap adalah **penimpaan token murni**, jadi
komponennya sendiri tidak tahu-menahu soal mode gelap.

### Mode terang (`:root`)

```css
--color-bg:      #f1ece2   /* latar halaman, pasir hangat, L* 93.5 */
--color-surface: #ffffff   /* kartu, L* 100 */
--color-text:    #14212b
--color-accent:    #0369a1   /* biru laut, aksi utama */
--color-accent-2:  #047857   /* hijau, sukses/tersedia */
--color-panel:     #cddeec   /* sidebar, nav bawah, panel hero — biru sejuk, L* 87.6 */
--color-panel-samar: #57514a /* teks redup DI ATAS panel biru */
--color-panel-isian: #ffffff /* lencana/badge kecil di atas panel */

--color-neutral-100…900   /* netral HANGAT (krem→cokelat), bukan abu dingin */
--color-accent-100…900    /* ramp biru laut penuh */
--color-accent-2-100…900  /* ramp hijau (sukses) */
--color-warn-100…900      /* ramp kuning (peringatan) */
--color-danger-100…900    /* ramp merah (bahaya/ditolak) */
```

### Mode gelap (`[data-tema="gelap"]`) — **jangan diubah**

```css
--color-bg:      #101820
--color-surface: #19232c
--color-text:    #e7eef3
--color-accent:  #7dd3fc   /* biru muda cerah, kebalikan arah dari mode terang */
--color-panel:   #19232c   /* SAMA dengan surface — sengaja tidak dibirukan lagi */
```

Prinsip mode gelap: **tiap ramp dibalik utuh**, bukan sekadar
digelapkan. Level 100–300 jadi latar gelap, level 600–700 jadi warna
terang untuk isian solid, level 800–900 jadi warna paling terang untuk
teks. Ini supaya badge solid (latar level-700 + teks level-100 di mode
terang) tidak kehilangan kontras saat mode gelap membalik semuanya.

### Prinsip yang mengunci desain sekarang

1. **Tiga lapisan permukaan harus benar-benar terbedakan**: latar
   halaman, panel struktural (sidebar/nav), dan kartu. Bukan cuma beda
   hue — beda *value* (lightness) juga, minimal ~3.5 L\* supaya mata
   bisa membedakan tanpa mikir.
2. **Warna hijau/kuning/merah HANYA untuk status** (badge, pesan). Kalau
   dipakai di permukaan besar sebagai dekorasi, ia "berhenti berarti
   apa-apa" — begitu bunyi komentar di kode sumbernya sendiri.
3. **Satu warna aksen pekat** (biru laut `#0369a1`) untuk semua aksi
   utama. Tidak ada warna aksen kedua untuk aksi.
4. **Netral hangat, bukan abu dingin** — ini disebut eksplisit di kode
   sebagai "sisi humanis" tanpa perlu menambah warna baru.

---

## 4. Tipografi

```css
--font-heading: Caprasimo   /* Google Font, display, bulat & tebal, weight 400 saja */
--font-body:    Figtree     /* Google Font, sans-serif, 400/600/700 */
--font-mono:    ui-monospace, Menlo   /* untuk kode pengajuan, mis. PJ-2026-0143 */
```

- Caprasimo dipakai untuk semua heading (`h1`–`h6`) dan judul kartu.
  Bentuknya bulat, gemuk, sedikit playful — kontras sengaja dengan
  Figtree yang netral untuk badan teks.
- Karena Caprasimo bulat, teks kapital penuh (mis. logo di sidebar)
  wajib diberi `letter-spacing: 0.1em` supaya tidak terasa penuh sesak.
- Ukuran heading: h1 42px, h2 32px, h3 25px, h4 20px, h5 16px, h6 13px
  (kapital, letter-spacing lebar, dipakai sebagai label kategori kecil).
- Body text 15px, line-height 1.55.

**Kemungkinan area eksplorasi**: pasangan font ini (display bulat +
sans netral) belum tentu penyebab kesan boring — kemungkinan besar
justru value/kontras warnanya. Tapi kalau desainer ingin menambah
karakter, weight Caprasimo cuma ada satu (400), jadi tidak ada variasi
bobot untuk hierarki di dalam keluarga font display itu sendiri.

---

## 5. Spacing, radius, shadow

```css
--space-1: 4.4px   --space-2: 8.8px   --space-3: 13.2px
--space-4: 17.6px  --space-6: 26.4px  --space-8: 35.2px

--radius-sm: 8px   --radius-md: 16px   --radius-lg: 28px
/* Kartu memakai radius-lg × 1.15 ≈ 32px — cukup besar, kesan lembut/ramah */

--shadow-sm/md/lg: bayangan TIPIS, hitam transparan 9–18%
/* Komentar di kode: "di palet hampir tanpa warna, bayangan tebal
   langsung terasa murah" — jadi shadow sengaja ditahan minimal */
```

Border-radius yang besar (28–32px pada kartu) memberi kesan lembut/
ramah, cocok dengan nuansa "institusional tapi manusiawi" yang
diinginkan. Ini kemungkinan elemen yang ingin dipertahankan.

---

## 6. Komponen kunci dan pola interaksinya

- **`.card`** — permukaan dasar hampir semua konten, latar
  `--color-surface` (putih di mode terang), radius besar, shadow tipis
  atau tanpa shadow tergantung konteks.
- **`.kartu-pilih`** — kartu yang bisa diklik (baris daftar review, dsb):
  terangkat 2px + shadow membesar saat hover, dan batang warna 4px di
  sisi kiri saat terpilih — bukan border penuh, supaya tidak terasa
  "terkurung".
- **`.kartu-statistik`** — kartu angka ringkas di dasbor. Warnanya
  **dipindah ke lingkaran ikon saja**, bukan seluruh kartu, supaya tetap
  bermakna tanpa membuat halaman terasa "blok-blok warna".
- **Navigasi (sidebar desktop / tab bawah mobile)** — keadaan aktif
  ditandai DUA cara sekaligus (latar pil biru muda + batang di kiri),
  hover menggeser item 2px ke kanan. Prinsip: tidak pernah mengandalkan
  warna saja untuk menandai keadaan (aksesibilitas — buta warna, cetak
  hitam-putih).
- **Tautan** — TIDAK PERNAH digarisbawahi di mana pun. Efek hover
  (warna + latar pil) hanya muncul lewat kelas `.tautan`, sifatnya
  opt-in secara sengaja (riwayat: pola opt-out pernah bocor dua kali).
- **Badge status** (`GAYA_STATUS` di `src/lib/status.ts`) — dibedakan
  TIGA cara sekaligus: warna latar, gaya isian (lembut/garis/solid), dan
  titik kecil. Level warna makin gelap & makin solid = makin dekat ke
  status akhir alur.
- **Tombol** — pil penuh (`border-radius: 999px`), memakai font heading
  (Caprasimo), bukan font body. `btn-primary` (biru pekat), `btn-secondary`
  (garis tepi transparan), `btn-ghost` (tanpa latar), `btn-danger` (merah).

---

## 7. Logo / identitas merek

`src/components/logo.tsx` — SVG custom, konsep **"Ruang dan Barang"**:
denah ruang (garis putus di satu sisi sebagai pintu terbuka) dengan satu
bentuk barang di dalamnya. Digambar di kanvas 48×48, ketebalan garis
6.5px, memakai `currentColor` sehingga otomatis mengikuti warna teks di
kedua mode. Dipakai di sidebar, footer, dan favicon.

Ini sudah melalui proses desain sebelumnya (beberapa konsep logo
diajukan, satu dipilih) dan kemungkinan **ingin dipertahankan** — bukan
bagian dari keluhan "boring".

---

## 8. Struktur halaman (pola layout)

- **Shell**: sidebar kiri tetap (desktop, 236px, bisa disusutkan jadi
  rel 68px) atau tab bawah (mobile, breakpoint 768px). Tidak pernah
  keduanya muncul bersamaan.
- **Header/judul halaman**: judul juga berfungsi sebagai tombol refresh,
  dengan subjudul kecil "diperbarui N menit lalu".
- **Grid kartu responsif**: `repeat(auto-fit, minmax(Npx, 1fr))` dipakai
  di banyak tempat (statistik dasbor, grafik laporan) — bukan breakpoint
  tetap.
- **Form**: input pil (radius penuh), label di atas, error di bawah
  dengan warna danger.
- **Modal**: `<dialog>` native, ikon bulat di atas judul (warna ikon
  menandai bobot aksi: sukses/tanya/bahaya/naik/pamit).

---

## 9. Batasan yang harus tetap dipegang, apa pun hasil desain baru

1. **Mode gelap tidak boleh berubah.** Kalau desain baru mengubah
   struktur token (nama variabel, jumlah level ramp), mode gelap wajib
   didefinisikan ulang secara setangkup, bukan ditinggal begitu saja.
2. **Tidak ada em dash atau en dash** di mana pun — termasuk di teks
   UI hasil desain baru. ✅ Sudah dijaga otomatis lewat skrip
   `npm run cek:tipografi`, tapi tetap perlu diingat saat menulis salinan
   UI baru.
3. **Warna status (hijau/kuning/merah) harus tetap murni untuk status.**
   Kalau eksplorasi desain menambah warna baru untuk permukaan besar, ia
   tidak boleh bentrok secara persepsi dengan ramp status yang sudah ada.
4. **Kontras teks harus lulus ambang AA (4.5:1)** di kedua mode, di atas
   permukaan mana pun teks itu diletakkan. Sistem sekarang sudah
   menghitung ini eksplisit per token (lihat komentar di
   `globals.css`), jadi palet baru sebaiknya datang dengan perhitungan
   serupa, bukan sekadar "terlihat bagus di mata".
5. **Semua warna lewat CSS custom properties di `globals.css`**, tidak
   ada hex literal langsung di komponen. Ini memudahkan retint total
   tanpa menyentuh logika komponen.
6. **Tiga lapisan permukaan (latar/panel/kartu) harus tetap
   terbedakan** secara terukur, bukan cuma "kelihatannya beda" — ini
   akar masalah yang sudah dua kali gagal sebelumnya.

---

## 10. Yang eksplisit BEBAS diubah

- Palet warna mode terang sepenuhnya (asal memenuhi §9).
- Pemilihan font (asal tetap ada pasangan display/body yang kontras,
  dan asal Google Fonts tersedia untuk `next/font/google`).
- Radius, shadow, spacing scale.
- Detail interaksi hover/animasi (asal tetap menghormati
  `prefers-reduced-motion`).
- Ilustrasi/ikon set (`src/components/ikon-nav.tsx`,
  `src/components/ilustrasi-aset.tsx`) — semuanya SVG custom dengan
  `currentColor`, jadi mudah digambar ulang.

---

## 11. Yang sebaiknya dibawa balik dari Claude Design

Supaya bisa langsung diimplementasikan tanpa banyak tanya-jawab lagi,
idealnya hasil brainstorming membawa:

1. **Nilai hex + L\* (lightness) untuk tiga lapisan permukaan** mode
   terang (latar, panel, kartu), dengan selisih L\* eksplisit antar
   lapisan.
2. **Satu warna aksen utama** (hex) + alasan kenapa itu tidak jatuh ke
   pola "terlalu berwarna" (ronde 1) atau "terlalu pucat" (ronde 3).
3. Konfirmasi bahwa **hijau/kuning/merah status tetap terpisah** dari
   palet permukaan baru.
4. Kalau font ikut diusulkan ulang: nama font dari Google Fonts (perlu
   kompatibel dengan `next/font/google`), bukan font berbayar/custom.
5. Idealnya ada 2–3 alternatif arah, bukan satu jawaban tunggal — supaya
   ada ruang pilih ulang tanpa muter dari nol lagi kalau meleset.
