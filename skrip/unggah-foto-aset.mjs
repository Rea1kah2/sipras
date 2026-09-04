/**
 * Mengunggah foto aset sekolah ke Vercel Blob, lalu memasang URL-nya ke
 * kolom Aset.foto di basis data.
 *
 * Dipisahkan dari src/lib/unggah.ts karena berkas itu bertanda "server-only"
 * dan hidup di dalam aplikasi Next. Yang dipakai ulang di sini bukan
 * kodenya, melainkan paket dan cara yang sama persis: put() dari
 * @vercel/blob, akses publik, nama berkas ditentukan sistem.
 *
 * Pakai:
 *   npx vercel env pull .env.vercel --environment=production
 *   npm run foto:unggah
 *   npm run foto:unggah -- --paksa    (timpa foto yang sudah ada)
 */
import { readFileSync, existsSync } from "node:fs";
import { put } from "@vercel/blob";
import pg from "pg";

const PAKSA = process.argv.includes("--paksa");
const SUMBER = "foto-aset";

/**
 * ─────────────────────────────────────────────────────────────────────────
 * PEMETAAN FOTO KE ASET. Satu satunya bagian yang perlu diubah.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Satu foto boleh dipakai beberapa aset, dan itu disengaja. Foto ruang kelas
 * menampilkan kursi plastik, meja kayu, dan lemari kayu sekaligus, jadi
 * memakainya untuk ketiga furnitur itu lebih menolong guru yang sedang
 * memilih daripada ilustrasi generik. Tiap berkas tetap diunggah SEKALI,
 * lalu URL-nya dibagikan.
 *
 * Berkas yang ada di folder tapi tidak disebut di sini sengaja tidak
 * dipakai. Alasannya dicatat di bawah supaya tidak terlihat seperti lupa.
 */
const PEMETAAN = [
  {
    berkas: "perpustakaan.jpeg",
    aset: ["Perpustakaan", "Kursi Lipat"],
  },
  {
    berkas: "ruang-kelas.jpeg",
    aset: [
      "Ruang Kelas 1",
      "Ruang Kelas 2",
      "Ruang Kelas 3",
      "Ruang Kelas 4",
      "Ruang Kelas 5",
      "Ruang Kelas 6",
      "Kursi Plastik Siswa",
      "Meja Siswa Kayu",
      "Lemari Kayu",
    ],
  },
  { berkas: "laptop-acer.jpeg", aset: ["Laptop Acer", "Ruang Guru"] },
  { berkas: "proyektor-infocus.jpeg", aset: ["Proyektor InFocus"] },
  { berkas: "raket-bulu-tangkis.jpeg", aset: ["Raket Bulu Tangkis"] },
  { berkas: "bola-kaki.jpeg", aset: ["Bola Kaki"] },
  { berkas: "bola-voli.jpeg", aset: ["Bola Voli"] },
  { berkas: "halaman-sekolah.jpeg", aset: ["Halaman Sekolah"] },
];

/**
 * Berkas yang sengaja tidak dipetakan, beserta alasannya. Dicetak saat
 * skrip jalan, karena berkas yang diam diam terlewat tidak bisa dibedakan
 * dari berkas yang memang tidak dipakai.
 */
const SENGAJA_DILEWATI = {
  "gedung-sekolah.jpeg":
    "tampak depan sekolah, menggambarkan sekolahnya dan bukan satu aset tertentu",
  "halaman-polos.jpeg":
    "nyaris kembar dengan halaman-sekolah.jpeg tapi tanpa bangunan yang memberi konteks",
};

/** Aset yang memang dibiarkan tanpa foto, bukan kelewat. */
const TANPA_FOTO = {
  "Meja Panjang": "tidak terlihat jelas di foto mana pun, dan memasang foto yang tidak menampilkan barangnya justru menyesatkan",
};

const TIPE = { jpeg: "image/jpeg", jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

function wajib(nama) {
  const nilai = process.env[nama];
  if (!nilai) {
    console.error(
      `${nama} kosong.\n\n` +
        "BLOB_READ_WRITE_TOKEN hanya ada di Vercel, tidak pernah disalin ke .env lokal.\n" +
        "Ambil dulu dengan:\n\n" +
        "  npx vercel env pull .env.vercel --environment=production\n\n" +
        "lalu jalankan lagi lewat npm run foto:unggah."
    );
    process.exit(1);
  }
  return nilai;
}

async function main() {
  const token = wajib("BLOB_READ_WRITE_TOKEN");
  const koneksi = wajib("DATABASE_URL");

  const db = new pg.Client({ connectionString: koneksi });
  await db.connect();

  let diunggah = 0;
  let diperbarui = 0;
  const dilewati = [];
  const hilang = [];

  try {
    for (const { berkas, aset } of PEMETAAN) {
      const jalur = `${SUMBER}/${berkas}`;
      if (!existsSync(jalur)) {
        hilang.push(berkas);
        continue;
      }

      // Aset yang sudah berfoto dilewati lebih dulu, SEBELUM mengunggah.
      // Kalau urutannya dibalik, menjalankan ulang skrip ini menumpuk berkas
      // kembar di Blob walaupun tidak ada satu pun baris yang berubah.
      const perlu = [];
      for (const nama of aset) {
        const r = await db.query(`SELECT id, foto FROM "Aset" WHERE nama = $1`, [nama]);
        if (r.rows.length === 0) {
          dilewati.push([nama, "aset tidak ada di basis data"]);
          continue;
        }
        if (r.rows[0].foto && !PAKSA) {
          dilewati.push([nama, "sudah punya foto, pakai --paksa untuk menimpa"]);
          continue;
        }
        perlu.push(r.rows[0].id);
      }
      if (perlu.length === 0) continue;

      const ekstensi = berkas.split(".").pop().toLowerCase();
      const hasil = await put(berkas, readFileSync(jalur), {
        access: "public",
        contentType: TIPE[ekstensi] ?? "image/jpeg",
        // Sufiks acak DIBIARKAN menyala di sini, beda dengan unggah.ts yang
        // mematikannya. Di sana namanya sudah unik karena randomUUID, di sini
        // namanya tetap seperti "bola-kaki.jpeg" sehingga menjalankan ulang
        // dengan --paksa akan bertabrakan tanpa sufiks.
        addRandomSuffix: true,
        cacheControlMaxAge: 31536000,
      });
      diunggah++;

      for (const id of perlu) {
        await db.query(`UPDATE "Aset" SET foto = $1, "diubahPada" = NOW() WHERE id = $2`, [
          hasil.url,
          id,
        ]);
        diperbarui++;
      }
      console.log(`  ${berkas} -> ${perlu.length} aset`);
    }
  } finally {
    await db.end();
  }

  console.log(`\n${diunggah} foto diunggah, ${diperbarui} aset diperbarui, ${dilewati.length} dilewati.`);

  if (dilewati.length > 0) {
    console.log("\nDilewati:");
    for (const [nama, alasan] of dilewati) console.log(`  ${nama.padEnd(22)} ${alasan}`);
  }

  if (hilang.length > 0) {
    console.error(`\nBERKAS TIDAK DITEMUKAN di folder ${SUMBER}/:`);
    for (const b of hilang) console.error(`  ${b}`);
    console.error("\nPemetaan menyebut berkas yang tidak ada. Ini kekeliruan, bukan hal wajar.");
    process.exitCode = 1;
  }

  console.log("\nSengaja tidak dipakai:");
  for (const [b, alasan] of Object.entries(SENGAJA_DILEWATI)) console.log(`  ${b.padEnd(24)} ${alasan}`);
  console.log("\nSengaja tanpa foto:");
  for (const [n, alasan] of Object.entries(TANPA_FOTO)) console.log(`  ${n.padEnd(24)} ${alasan}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
