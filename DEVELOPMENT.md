# SIPRAS: Panduan Pengembangan

Dokumen ini adalah catatan handoff untuk menjalankan dan mengembangkan SIPRAS
secara lokal.

## Setup cepat

Prasyarat:

- Node.js 20 atau lebih baru
- npm
- Docker Desktop, atau PostgreSQL lokal yang kompatibel

Dengan Docker:

```bash
npm install
cp .env.example .env
```

Isi nilai berikut di `.env` untuk database Compose:

```bash
DATABASE_URL="postgresql://sipras:sipras_dev@127.0.0.1:5432/sipras?schema=public"
SESSION_SECRET="isi-dengan-hasil-node-e-randomBytes"
```

Generate secret sesi:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Jalankan database, migrasi, seed, dan aplikasi:

```bash
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run dev
```

Buka `http://localhost:3000`. Seed menyediakan akun demo:

| Peran | Email | Kata sandi |
| --- | --- | --- |
| Admin | nilai `EMAIL_REPLY_TO` | `admin1234` |
| Peminjam | `siti@gmail.com` | `peminjam1234` |

Mode email dapat tetap kosong. Sistem menyimpan notifikasi in-app terlebih
dahulu dan memakai mode konsol jika `RESEND_API_KEY` kosong.

## Peta repository

- `src/app`: route App Router, page, layout, server action, dan API route.
  Route group `(auth)` menangani autentikasi. Route group `(app)` memakai
  shell aplikasi dan membagi area peminjam serta admin.
- `src/components`: komponen presentasi bersama, shell responsif, modal,
  badge status, form, ikon, grafik, logo, dan provider preferensi.
- `src/lib`: aturan bisnis dan infrastruktur aplikasi. File penting:
  `auth.ts`, `status.ts`, `ketersediaan.ts`, `penutupan.ts`, `notifikasi.ts`,
  `pengingat.ts`, `validasi.ts`, `unggah.ts`, dan `prisma.ts`.
- `prisma/schema.prisma`: model, enum, relasi, indeks, serta constraint
  database. `prisma/migrations` adalah sumber perubahan schema yang diterapkan.
- `prisma/seed.ts`: data demo lokal. Jangan jalankan pada database produksi.
- `prisma/buat-admin-produksi.ts`: membuat admin produksi tanpa data fiktif.
- `skrip`: pemeriksaan bahasa, tipografi, warna, environment Vercel, dan upload
  foto aset.

## Alur data dan aturan bisnis

1. Server component membaca sesi dan data melalui Prisma.
2. Form mengirim server action. Action mengulangi pemeriksaan sesi, role,
   kepemilikan data, validasi Zod, dan aturan status, sehingga tidak bergantung
   pada tombol UI yang disembunyikan.
3. Perubahan penting dilakukan dalam transaksi Prisma. Status baru dicatat
   bersama `RiwayatStatus`.
4. Notifikasi in-app dibuat terlebih dahulu. Pengiriman email bersifat
   tambahan dan kegagalannya dicatat tanpa membatalkan aksi utama.

Invariants yang harus dipertahankan:

- Ketersediaan tidak disimpan sebagai kolom. Ia dihitung dari pengajuan
  `DISETUJUI` dan `DIPINJAM`.
- Barang dihitung dengan puncak pemakaian harian, bukan jumlah seluruh
  pengajuan yang menyentuh rentang.
- Ruang memakai aturan bentrok rentang tanggal.
- Validasi ketersediaan dilakukan di form dan di dalam transaksi sebelum simpan.
- Semua perpindahan status melewati `bolehPindah` di `src/lib/status.ts`.
- Aset dan akun dinonaktifkan dengan `aktif`, bukan dihapus, agar riwayat lama
  tetap terbaca.
- Constraint database seperti unique key pada pengingat dan penutupan menjadi
  penjaga idempotensi saat dua request datang bersamaan.
- `diserahkanPada` menjadi awal efektif pemakaian jika admin menyerahkan aset
  sebelum tanggal mulai.

Lifecycle normal:

```text
MENUNGGU -> DISETUJUI -> DIPINJAM -> DIKEMBALIKAN -> SELESAI
       \-> DITOLAK
```

Admin mengelola review, serah-terima, verifikasi pengembalian, aset, pengguna,
jadwal penutupan, dan laporan. Peminjam mengelola pengajuan sendiri,
pengembalian, profil, notifikasi, bahasa, dan tema.

## Pemeriksaan yang tersedia

```bash
npm run typecheck
npm run lint
npm run build
npm run cek:ketersediaan
npm run cek:penutupan
npm run cek:alur
npm run cek:tipografi
npm run cek:warna
npm run cek:bahasa
```

`npm run build` menggunakan konfigurasi default Next.js. Pada environment ini,
build Turbopack gagal saat memproses `next/font/google`, sedangkan build
webpack berhasil:

```bash
npx next build --webpack
```

Lint saat ini tidak gagal, tetapi memberi satu warning variabel `token` yang
belum digunakan di `skrip/unggah-foto-aset.mjs`. Warning itu dicatat sebagai
pekerjaan terpisah karena tidak menghalangi aplikasi.

## Deployment dan operasional

- Vercel memakai filesystem ephemeral. Foto aset harus disimpan di Vercel Blob,
  bukan hanya di `public/uploads`.
- `DATABASE_URL` dan `BLOB_READ_WRITE_TOKEN` sebaiknya diisi melalui integrasi
  Vercel, bukan disalin sembarangan.
- Jalankan `npm run db:deploy` pada database produksi.
- Buat admin produksi dengan `prisma/buat-admin-produksi.ts`.
- Gunakan `npm run db:aset` untuk katalog aset. Jangan gunakan seed demo pada
  produksi.
- Rute `/api/pengingat` harus dilindungi `PENGINGAT_SECRET` dan dipanggil
  scheduler sekali sehari.
- Resend tanpa domain terverifikasi hanya dapat mengirim ke alamat pemilik
  akun. Untuk demo, mode konsol atau `EMAIL_UJI_KE` lebih aman.
- Setelah environment Vercel berubah, lakukan redeploy tanpa build cache agar
  deployment mengambil nilai baru.

## Roadmap prioritas

### Prioritas tinggi

1. Pastikan developer baru dapat memilih Docker Compose atau PostgreSQL native
   tanpa menebak format `DATABASE_URL`.
2. Tambahkan pengujian action dan authorization untuk ownership, role, request
   ganda, dan validasi server-side.
3. Selidiki perbedaan build Turbopack dan webpack pada `next/font/google` sebelum
   mengandalkan build default di CI.
4. Tinjau script upload foto, khususnya variabel token yang belum digunakan,
   agar jalur upload Vercel Blob benar-benar terverifikasi.
5. Siapkan backup database, logging terpusat, dan prosedur rollback migrasi
   sebelum pemakaian produksi.

### Prioritas menengah

1. Tambahkan CI yang menjalankan install, typecheck, lint, build webpack,
   migrasi database uji, seed, dan seluruh pemeriksaan regresi.
2. Tambahkan smoke test browser untuk login, pengajuan multi-item,
   persetujuan, serah-terima, pengembalian, dan verifikasi admin.
3. Dokumentasikan kontrak environment per environment, termasuk preview dan
   production.
4. Selesaikan keputusan branding dan catatan serah-terima klien yang masih
   tercatat di `PROGRESS.md`.

### Prioritas produk

1. Validasi kebutuhan institusi nyata sebelum menambah fitur baru.
2. Pertahankan prinsip single source of truth availability dan satu pintu
   transisi status.
3. Evaluasi audit log, ekspor laporan, pencarian, dan filter berdasarkan
   beban kerja admin setelah digunakan pada data nyata.
