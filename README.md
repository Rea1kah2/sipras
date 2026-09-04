# SIPRAS

Sistem peminjaman sarana dan prasarana kampus. Peminjam mengajukan sekali untuk banyak barang dan ruang, sistem mengecek bentrok jadwal secara otomatis, admin mereview dan memverifikasi pengembalian dari dasbor yang sama.

Dibangun dengan Next.js 16 (App Router), React 19, Prisma 7, PostgreSQL, dan Tailwind 4.

---

## Menjalankan di komputer sendiri

**Prasyarat:** Node.js 20 atau lebih baru, dan PostgreSQL yang sudah berjalan.

```bash
# 1. Pasang dependensi
npm install

# 2. Siapkan environment
cp .env.example .env      # lalu isi nilainya, lihat bagian di bawah

# 3. Buat database dan tabelnya
npx prisma migrate dev

# 4. Isi data contoh (opsional, tapi disarankan untuk mencoba)
npm run db:seed

# 5. Jalankan
npm run dev
```

Buka <http://localhost:3000>. Untuk membuka dari HP di jaringan wifi yang sama, pakai alamat Network yang tercetak di terminal saat `npm run dev`.

### Akun contoh setelah `npm run db:seed`

| Peran | Email | Kata sandi |
| --- | --- | --- |
| Admin | nilai `EMAIL_REPLY_TO` di `.env` | `admin1234` |
| Peminjam | `nadia@kampus.ac.id` | `peminjam1234` |

Akun admin sengaja memakai email asli dari `.env`, bukan alamat karangan. Alasannya ada di bagian Email di bawah.

---

## Isi `.env`

```bash
DATABASE_URL="postgresql://postgres:SANDI@localhost:5432/sipras?schema=public"

# Kunci penandatangan cookie sesi. Generate dengan:
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
SESSION_SECRET="..."

# Boleh kosong. Lihat bagian Email.
RESEND_API_KEY=""
EMAIL_FROM="SIPRAS <onboarding@resend.dev>"
EMAIL_REPLY_TO="email@kamu.com"

# Ditampilkan sebagai tautan kontak, tanpa API berbayar apa pun
NEXT_PUBLIC_WA_PETUGAS="08xxxxxxxxxx"
NEXT_PUBLIC_EMAIL_PETUGAS="email@kamu.com"
```

---

## Notifikasi

Setiap perubahan status selalu **ditulis dulu ke tabel Notifikasi**, baru dicoba dikirim lewat email. Urutan ini disengaja: notifikasi dalam aplikasi berfungsi penuh sejak awal, dan kegagalan mengirim email tidak pernah menggagalkan aksi admin. Kegagalannya dicatat lengkap dengan alasannya dan bisa dilihat di halaman Notifikasi.

**WhatsApp tidak memakai API.** Nomor petugas hanya ditampilkan sebagai tautan `wa.me`, jadi tidak ada biaya langganan sama sekali.

**Email lewat Resend.** Kalau `RESEND_API_KEY` dikosongkan, sistem otomatis masuk mode konsol: isi email tercetak di terminal dan notifikasi dalam aplikasi tetap jalan. Demo tidak terganggu sama sekali tanpa API key.

Kalau ingin email sungguhan, ambil key gratis di <https://resend.com/api-keys>. Satu batasan yang perlu diketahui: tanpa domain terverifikasi, Resend **hanya mengantar ke alamat email pemilik akun**. Karena itu akun admin memakai `EMAIL_REPLY_TO`, supaya notifikasi ke admin benar benar sampai. Notifikasi ke akun peminjam contoh akan tercatat gagal, dan itu wajar.

---

## Perintah lain

| Perintah | Kegunaan |
| --- | --- |
| `npm run build` | Build produksi |
| `npm run typecheck` | Cek tipe TypeScript |
| `npm run lint` | ESLint |
| `npm run db:studio` | Lihat isi database lewat GUI |
| `npm run db:reset` | Kosongkan lalu isi ulang database |
| `npm run cek:ketersediaan` | Uji regresi logika bentrok jadwal |
| `npm run cek:tipografi` | Pastikan tidak ada em dash atau en dash |

---

## Bagian yang paling penting dipahami

### Ketersediaan tidak pernah disimpan

Tidak ada kolom `tersedia` di tabel Aset. Ketersediaan **selalu dihitung** dari pengajuan berstatus `DISETUJUI` atau `DIPINJAM` yang beririsan tanggal. Satu sumber kebenaran, jadi mustahil jadi tidak sinkron.

Untuk barang, yang dihitung adalah **puncak pemakaian harian**, bukan jumlah seluruh pengajuan yang beririsan. Bedanya nyata: dua pengajuan bisa sama sama menyentuh rentang tanggal yang ditanyakan tapi tidak saling beririsan, sehingga tidak pernah dipakai bersamaan. Kalau dijumlahkan begitu saja, pengajuan yang sebenarnya sah akan ditolak. Lihat `puncakPemakaian()` di [src/lib/ketersediaan.ts](src/lib/ketersediaan.ts), dan `npm run cek:ketersediaan` menjaga perilaku ini tetap benar.

### Validasi bentrok dijalankan dua kali

Sekali saat peminjam mengubah tanggal di form, untuk umpan balik cepat. Sekali lagi **di dalam transaksi** sebelum menyimpan, dan yang kedua inilah yang mencegah dua orang merebut ruang yang sama di detik yang sama. Hal serupa berlaku saat admin menyetujui.

### Semua perpindahan status lewat satu pintu

```
MENUNGGU  ke  DISETUJUI  ke  DIPINJAM  ke  DIKEMBALIKAN  ke  SELESAI
     ke  DITOLAK
```

Aturannya ada di `bolehPindah(dari, ke, aktor)` di [src/lib/status.ts](src/lib/status.ts). Peminjam hanya boleh `DIPINJAM` ke `DIKEMBALIKAN`, sisanya milik admin. Setiap perpindahan tercatat di tabel `RiwayatStatus` dan bisa dilihat di halaman rincian pengajuan.

### Server action selalu memeriksa identitasnya sendiri

Server action bisa dipanggil lewat POST langsung, bukan hanya lewat tombol di UI. Karena itu setiap action memverifikasi sesi dan kepemilikan data di dalam dirinya sendiri, tidak bergantung pada tombol yang disembunyikan.

### Data tidak dihapus, hanya dinonaktifkan

Aset dan akun pengguna memakai penanda aktif, bukan penghapusan. Riwayat peminjaman lama tetap bisa menampilkan nama aset dan peminjamnya walaupun keduanya sudah tidak dipakai lagi.

---

## Catatan sebelum deploy

Foto aset disimpan di Vercel Blob lewat [src/lib/unggah.ts](src/lib/unggah.ts), jadi tahan redeploy (filesystem proyek sendiri bersifat sementara, tapi foto tidak lagi lewat situ). Diaktifkan dari menu **Storage** di dashboard proyek Vercel, dan variabel `BLOB_READ_WRITE_TOKEN` terisi otomatis ke environment proyek begitu diaktifkan, tidak perlu disalin manual.

### Mengisi variabel lingkungan di Vercel

Jangan menyalin satu per satu lewat dashboard. Cara itu sudah gagal dua kali di proyek ini, dan dua duanya baru ketahuan setelah situsnya error di depan pengguna: pertama `DATABASE_URL`, lalu `SESSION_SECRET`. Pakai:

```
npx vercel login     # sekali saja
npx vercel link      # sekali saja, sambungkan folder ini ke proyeknya
npm run env:dorong
```

Skrip itu membaca `.env` lokal dan mendorong isinya ke Production, Preview, dan Development sekaligus. Yang sengaja tidak ikut didorong tetap dicetak beserta alasannya, jadi yang dilewati terlihat, bukan hilang diam diam: `DATABASE_URL` dan `BLOB_READ_WRITE_TOKEN` sudah diisi otomatis oleh integrasi Vercel, sedangkan `NEXT_PUBLIC_APP_URL` dan `EMAIL_UJI_KE` ditanyakan ulang karena nilainya di produksi memang berbeda dari lokal.

Variabel baru tidak otomatis dipakai deployment yang sudah ada. Setelah mendorong, buka tab Deployments, klik titik tiga di deployment teratas, pilih Redeploy, dan jangan centang "Use existing Build Cache".

### Menyiapkan basis data

Sebelum aplikasi dipakai pertama kali di basis data produksi yang masih kosong:

1. `npm run db:deploy` - menjalankan migrasi Prisma secara non interaktif.
2. `npx tsx -r dotenv/config prisma/buat-admin-produksi.ts -- "Nama Admin" admin@sekolah.sch.id "kata-sandi"` - membuat satu akun admin, tanpa data fiktif apa pun. Jangan jalankan `prisma/seed.ts` di basis data produksi, itu mengisi puluhan pengajuan dan pengguna contoh untuk demo.
3. `npm run db:aset` - mengisi daftar sarana dan prasarana sekolah. Skrip ini tidak pernah menghapus apa pun dan aman dijalankan berulang: aset yang sudah ada diperbarui, bukan diduplikasi, dan foto yang sudah dipasang admin tidak ikut tertimpa.

Setelah masuk pertama kali, ganti kata sandi admin dari halaman profil.

### Stok yang masih berupa taksiran

Sebagian aset di [prisma/isi-aset-sekolah.ts](prisma/isi-aset-sekolah.ts) ditandai `perkiraan: true`, artinya jumlahnya belum pernah dihitung langsung di sekolah. Aset itu tetap bisa dipinjam, dan `npm run db:aset` mencetak daftarnya tiap kali dijalankan.

Angka barang sengaja ditaksir rendah. Stok yang kelebihan membuat sistem menyetujui peminjaman barang yang sebenarnya tidak ada, dan petugas baru menyadarinya saat guru datang mengambil. Stok yang kekurangan hanya menolak lebih cepat dari perlunya, dan itu cukup dinaikkan admin lewat halaman Kelola aset tanpa menyentuh kode.

Kapasitas ruang tidak ikut ditaksir rendah karena sifatnya berbeda: nilainya hanya ditampilkan sebagai keterangan dan tidak pernah menjadi dasar penolakan, sebab tiap ruang selalu berstok 1.
