# PROGRESS: SIPRAS, Sistem Peminjaman Barang dan Ruang

**Terakhir diperbarui:** 17 Agustus 2026, disusun dari pembacaan kode langsung, bukan dari catatan sesi.

## Ringkasan

Proyek klien dari jasa website. Klien masih mahasiswa, sistem ini untuk tugas kuliahnya sendiri, bukan untuk institusi riil, jadi tidak perlu dokumentasi akademis formal seperti BAB, UML, atau ERD. Yang penting aplikasinya jalan dan fungsional.

Nama sistem sudah ditetapkan: **SIPRAS**, sistem peminjaman sarana dan prasarana kampus.

## Tech Stack

Next.js 16 (App Router), React 19, Prisma 7, PostgreSQL, Tailwind 4. Auth digarap sendiri pakai `jose` dan `bcryptjs`, validasi pakai Zod, email lewat Resend.

## Status Sekarang

**Bukan tahap brainstorming lagi.** Aplikasinya sudah jalan hampir penuh. Sentuhan terakhir 17 Agustus 2026 jam 20:00 di `components/shell.tsx`, `app/globals.css`, dan halaman masuk.

Yang sudah berfungsi:

- Auth lengkap: masuk, daftar sendiri, ganti kata sandi, indikator kekuatan sandi
- Dasbor peminjam dan dasbor admin terpisah
- Katalog aset beserta halaman detail per aset
- Form ajukan multi item (satu pengajuan bisa banyak barang dan ruang sekaligus), pakai keranjang
- Cek ketersediaan otomatis, dihitung dari data, tanpa kolom `tersedia` yang bisa jadi tidak sinkron
- Kalender ketersediaan
- Alur status penuh: MENUNGGU, DISETUJUI, DIPINJAM, DIKEMBALIKAN, SELESAI, plus DITOLAK
- Pengembalian oleh peminjam, verifikasi oleh admin
- Panel admin: review pengajuan, verifikasi pengembalian, CRUD aset, kelola pengguna, riwayat lengkap plus ekspor CSV
- Notifikasi dalam aplikasi (selalu jalan) dan email lewat Resend (opsional)
- Pengingat jatuh tempo lewat `app/api/pengingat/route.ts`
- Cetak bukti pengajuan
- Dua bahasa lewat `lib/kamus.ts`, preferensi bahasa tersimpan per akun
- Togel tampilan terang dan gelap
- Empat migrasi Prisma sudah tercatat, terbaru `20260816123839_bahasa_akun_dan_notifikasi_berkunci`

Dua skrip penjaga sudah dipasang: `npm run cek:ketersediaan` (uji regresi logika bentrok jadwal) dan `npm run cek:tipografi` (memastikan tidak ada em dash atau en dash).

## Ketentuan Fungsional (semua sudah terpenuhi)

- Objek yang bisa dipinjam: barang dan ruang, dua duanya
- Semua pengguna terdaftar bisa login dan mengajukan, lewat self register
- Alur persetujuan satu tingkat, admin langsung setuju atau tolak
- Tidak ada denda keterlambatan, cukup status dan pengingat
- Admin CRUD penuh untuk barang dan ruang
- Role admin bisa lebih dari satu orang, akses sama
- Halaman riwayat dan laporan peminjaman yang sudah selesai
- Cek ketersediaan otomatis untuk cegah bentrok
- Satu form pengajuan bisa pilih lebih dari satu barang atau ruang
- Notifikasi: email lewat Resend, WhatsApp cuma tautan `wa.me` tanpa API berbayar

## Keputusan Desain Penting

- Palet sudah beberapa kali diganti sebelum menetap. Yang dipakai sekarang: **Coastal Glass dengan indigo `#3157d5` di atas slate `#eef4f8`**, teks deep navy `#142338`
- Tiga arah yang sudah ditolak klien beserta alasannya tercatat di `BRIEF-LOGO.md` bagian 4, jangan diulang
- Hijau, cyan, dan merah dikhususkan sebagai penanda status, tidak boleh dipakai di logo
- Huruf: Caprasimo untuk judul dan wordmark, Figtree untuk teks isi
- Tipografi menghindari em dash dan en dash, dijaga otomatis oleh `npm run cek:tipografi`
- Fully responsive, dipakai dari HP juga

## Keputusan Arsitektur

- Ketersediaan **tidak pernah disimpan**, selalu dihitung dari pengajuan yang beririsan tanggal. Untuk barang yang dihitung adalah puncak pemakaian harian, bukan total pengajuan yang beririsan, lihat `puncakPemakaian()` di `src/lib/ketersediaan.ts`
- Validasi bentrok dijalankan dua kali, sekali di form dan sekali di dalam transaksi sebelum simpan
- Semua perpindahan status lewat satu pintu, `bolehPindah(dari, ke, aktor)` di `src/lib/status.ts`
- Setiap server action memverifikasi sesi dan kepemilikan datanya sendiri, tidak bergantung tombol yang disembunyikan
- Data tidak dihapus, hanya dinonaktifkan, supaya riwayat lama tetap terbaca
- Notifikasi ditulis ke database dulu, baru dicoba dikirim lewat email, jadi gagal kirim tidak pernah menggagalkan aksi admin

## Konvensi Kode

Bebas komentar, mengandalkan clean code. Nama berkas dan variabel pakai bahasa Indonesia (`ajukan`, `pengajuan`, `ketersediaan`, `kamus`).

## Open item, butuh keputusan Kay

1. **Logo belum dieksekusi.** `BRIEF-LOGO.md` sudah final sejak 16 Agustus tapi belum dilempar ke Claude Design. Akibatnya: `src/app/favicon.ico` masih bawaan Next.js, lambang di sidebar masih huruf S dari CSS, dan `public/` masih menyimpan `next.svg`, `vercel.svg`, `globe.svg`, `file.svg`, `window.svg` yang mestinya dihapus.
2. **Penyimpanan foto aset.** Sekarang di `public/uploads`. Kalau di-deploy ke Vercel, foto hilang tiap redeploy. Kode unggahnya terkumpul di satu berkas, `src/lib/unggah.ts`, jadi pindah ke Supabase Storage atau Vercel Blob cukup di satu tempat. Kalau demonya cuma lokal, biarkan saja tapi tulis di catatan serah terima.
3. **RESEND_API_KEY.** Tanpa domain terverifikasi, Resend hanya mengantar ke email pemilik akun, jadi notifikasi ke akun peminjam contoh akan selalu tercatat gagal saat demo. Pilih: terima mode konsol, atau verifikasi domain.
4. **Serah terima ke klien.** Belum ada catatan cara pakai untuk klien, padahal ini yang dia butuh saat mempertanggungjawabkan tugasnya.

## Langkah Selanjutnya

1. Lempar `BRIEF-LOGO.md` ke Claude Design, minta tiga konsep sesuai bagian 7, nilai pakai checklist bagian 11
2. Setelah logo kepilih: ganti favicon, ganti lambang di `components/shell.tsx` dan `components/footer.tsx`, hapus lima SVG boilerplate dari `public/`
3. Putuskan penyimpanan foto aset, eksekusi kalau pilih object storage
4. Jalankan `npm run build`, `npm run typecheck`, `npm run cek:ketersediaan`, dan `npm run cek:tipografi` sekali penuh sebagai pemeriksaan akhir
5. Uji dari HP di wifi yang sama, alur peminjam dari daftar sampai pengembalian
6. Susun catatan serah terima untuk klien
