# Brief Logo SIPRAS

Dokumen ini untuk diserahkan ke Claude Design. Semua nilai warna, ukuran, dan nama huruf di sini **diambil langsung dari kode yang sudah jalan** (`src/app/globals.css`), bukan angka usulan. Jadi hasil desainnya bisa langsung dipasang tanpa penyesuaian.

---

## 1. Tentang produknya

**SIPRAS** adalah sistem peminjaman sarana dan prasarana kampus. Mahasiswa mengajukan peminjaman barang (proyektor, sound system, kamera, kursi lipat) dan ruang (aula, lab, ruang seminar) lewat satu pengajuan, lalu memantau statusnya sampai selesai. Admin sarpras mereview, menyetujui, dan memverifikasi pengembalian dari dasbor yang sama.

**Dua jenis pengguna:**
- **Peminjam**: mahasiswa dan unit kegiatan. Sering membuka dari HP.
- **Admin sarpras**: petugas yang bekerja dengan daftar panjang dan tabel, biasanya dari desktop.

**Alurnya**: pilih barang atau ruang, isi tanggal, tunggu review admin, pakai, lalu kembalikan dan diverifikasi. Inti maknanya adalah **dipinjam lalu kembali**, bukan dibeli atau dimiliki.

---

## 2. Di mana logonya benar benar dipakai

Ini bagian paling menentukan bentuknya. Logo yang bagus di 200px sering hancur di 16px, dan di sistem ini **ukuran kecil justru yang paling sering terlihat**.

| Tempat | Ukuran | Latar | Catatan |
| --- | --- | --- | --- |
| Lambang di sidebar | 30 x 30 px | `#ffffff` | Lingkaran, di samping tulisan SIPRAS |
| Lambang di sidebar yang menyusut jadi rel | 30 x 30 px | `#ffffff` | **Tanpa tulisan**, jadi lambang harus berdiri sendiri |
| Lambang di footer | 28 x 28 px | `#ffffff` | Di samping tulisan SIPRAS |
| Favicon tab browser | 16, 32, 48 px | putih dan gelap | Paling kecil, paling menentukan |
| Halaman masuk | fleksibel | `#f7f5f0` | Satu satunya tempat logo bisa tampil besar |

**Konsekuensi yang harus dipatuhi:** lambang wajib tetap terbaca sebagai bentuk utuh di **16px**. Kalau sebuah detail hilang di ukuran itu, detail tersebut sebaiknya tidak ada sejak awal.

---

## 3. Nada yang dicari

Profesional, elegan, modern, humanis, dan menarik perhatian, tapi **tidak berlebihan**. Ini sistem kampus yang dipakai mahasiswa sehari hari, jadi harus terasa tepercaya tanpa terasa kaku seperti lembaga pemerintah, dan ramah tanpa terlihat seperti aplikasi mainan.

---

## 4. Riwayat yang sudah ditolak, beserta alasannya

**Bagian paling berharga di brief ini.** Palet aplikasinya sudah empat kali diganti sebelum menetap. Membaca daftar ini akan menghemat banyak putaran bolak balik.

| Arah | Kenapa ditolak |
| --- | --- |
| Hangat organik (krem, terakota, sage) | Terlalu berwarna, warnanya jadi hiasan dan berhenti menandai apa apa |
| Grafit minimal (hampir hitam putih) | Terlalu suram, terasa tidak ramah dan tidak menarik |
| Indigo cerah di atas putih dingin | Terlalu pudar dan kurang bersemangat, terlihat pastel |
| **Biru laut di atas pasir hangat** | **Dipakai sekarang** |

Pelajaran yang bisa dipakai: klien menyukai **warna pekat yang tegas** di atas **latar hangat**, dan menolak apa pun yang terasa pucat, kelabu, atau ramai.

---

## 5. Palet resmi

Salin persis. Ini nilai yang sedang berjalan di aplikasi.

| Peran | Hex | Dipakai untuk |
| --- | --- | --- |
| **Biru laut (utama)** | `#0369a1` | Warna lambang, tombol utama |
| Biru laut pekat | `#075985` | Hover, bayangan warna |
| Biru laut sangat muda | `#f0f9ff` | Latar lembut |
| Hijau (berhasil) | `#047857` | Status disetujui dan selesai |
| Kuningan (peringatan) | `#b45309` | Status sedang dipinjam |
| Merah (bahaya) | `#b91c1c` | Status ditolak |
| **Pasir hangat (latar aplikasi)** | `#f7f5f0` | Latar seluruh halaman |
| Putih (kartu) | `#ffffff` | Latar kartu dan sidebar |
| **Tinta (teks)** | `#14212b` | Warna teks utama |

**Aturan warna untuk logo:** pakai **biru laut sebagai warna utama lambang**. Hijau, kuningan, dan merah **tidak boleh dipakai di logo**, karena ketiganya sudah punya arti khusus sebagai penanda status di dalam aplikasi. Logo berwarna hijau akan membuat orang salah membaca.

---

## 6. Tipografi

| Peran | Huruf | Berat |
| --- | --- | --- |
| Judul dan wordmark | **Caprasimo** | 400 (hanya tersedia satu berat) |
| Teks isi | **Figtree** | 400, 600, 700 |

**Wordmark memakai Caprasimo**, supaya logo dan antarmuka terasa satu keluarga. Caprasimo adalah huruf display yang tebal dan berkarakter.

**Catatan penting:** karena Caprasimo cukup tebal dan bulat, tulisan "SIPRAS" dalam huruf kapital semua bisa terlihat sesak. Mohon setel **jarak antarhuruf** dan pertimbangkan varian dengan jarak sedikit renggang untuk ukuran kecil. Kedua huruf ini tersedia gratis di Google Fonts dan sudah terpasang di project.

---

## 7. Yang diminta: tiga arah konsep

Tolong sodorkan **tiga konsep berbeda**, masing masing lengkap dengan lambang dan lockup-nya, supaya klien punya bahan pembanding.

### Konsep 1: Monogram huruf S
Mengolah huruf S jadi bentuk yang punya karakter, bukan sekadar huruf di dalam lingkaran seperti sekarang. Boleh dieksplorasi sebagai potongan geometris, bentuk negatif, atau S yang tersusun dari dua elemen yang saling mengunci.

### Konsep 2: Simbol alur pinjam dan kembali
Bercerita tentang inti sistemnya: sesuatu keluar lalu kembali. Bisa berupa panah melingkar, dua bentuk yang bertukar tempat, atau bentuk yang menyiratkan siklus. **Peringatan:** konsep ini paling berisiko jadi rumit, jadi tolong jaga agar tetap terbaca di 16px.

### Konsep 3: Bentuk abstrak ruang dan barang
Menggabungkan gagasan **ruang** (bidang, pintu, denah) dan **barang** (kotak, kubus) jadi satu bentuk sederhana. Arah ini paling mungkin menghasilkan lambang yang khas sekaligus tetap sederhana.

---

## 8. Batasan teknis

**Wajib:**
- Terbaca sebagai bentuk utuh di **16 x 16 px**
- Punya **versi satu warna** (untuk cetak hitam putih dan dokumen laporan)
- Berfungsi di atas **putih `#ffffff`** maupun **pasir `#f7f5f0`**
- Diserahkan sebagai **SVG** dengan `viewBox` rapi dan tanpa teks yang belum di-outline
- Bentuk lambang cocok dimasukkan ke **lingkaran**, karena itu wadahnya di sidebar dan footer sekarang

**Hindari:**
- Gradien, bayangan, dan efek 3D
- Garis lebih tipis dari 1.5px pada kanvas 24px, karena akan hilang saat diperkecil
- Detail yang hanya terlihat di ukuran besar
- Lebih dari dua warna dalam satu lambang
- Kiasan yang sudah terlalu sering dipakai: jabat tangan, gedung berkolom, tanda centang polos, gerigi mesin

---

## 9. Keluaran yang diharapkan

Untuk **tiap** konsep:
1. **Lambang** saja, SVG, di dalam kotak persegi
2. **Lockup mendatar**: lambang di kiri, tulisan SIPRAS di kanan
3. **Lockup menurun**: lambang di atas, tulisan di bawah (untuk halaman masuk)
4. **Versi satu warna** dari lambang
5. **Favicon** 16, 32, dan 48 px
6. Contoh penerapan di **latar putih** dan **latar pasir `#f7f5f0`**

---

## 10. Yang akan digantikan

Supaya jelas apa yang sedang ditambal:

- **Lambang sekarang** hanya huruf "S" biasa di dalam lingkaran biru, dibuat dengan CSS. Ada di `src/components/shell.tsx` (kelas `.sidebar-lambang`) dan `src/components/footer.tsx`.
- **`src/app/favicon.ico` masih bawaan Next.js**, belum diganti sama sekali.
- **`public/` masih menyimpan SVG boilerplate** dari template Next.js (`next.svg`, `vercel.svg`, `globe.svg`, `file.svg`, `window.svg`) yang tidak dipakai dan akan dihapus.

---

## 11. Cara menilai hasilnya

Daftar periksa untuk memilih di antara tiga konsep:

- [ ] Diperkecil ke 16px, masih terbaca sebagai bentuk yang sama?
- [ ] Dicetak hitam putih, masih punya karakter?
- [ ] Ditaruh di samping tulisan SIPRAS berhuruf Caprasimo, terasa satu keluarga?
- [ ] Ditaruh di atas pasir `#f7f5f0`, masih cukup kontras?
- [ ] Bisa dijelaskan maknanya dalam satu kalimat tanpa terdengar dipaksakan?
- [ ] Tidak mirip logo sistem kampus lain yang umum?
- [ ] Kalau ditempel di sidebar yang menyusut jadi rel, tetap jelas tanpa tulisan pendampingnya?
