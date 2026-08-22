/**
 * Pencacah kebocoran bahasa.
 *
 * Dibuat setelah pencacah sebelumnya gagal menangkap kebocoran nyata. Yang
 * lama memakai daftar kata yang ditulis tangan, jadi kata yang tidak
 * terpikirkan otomatis lolos, dan hasilnya cuma membuktikan apa yang sudah
 * diduga. Yang ini menurunkan daftarnya dari dua sumber yang tidak
 * bergantung pada ingatan siapa pun:
 *
 *   1. Nilai kamus Indonesia tidak boleh muncul di halaman mode Inggris.
 *   2. Nilai kamus Inggris tidak boleh muncul di halaman mode Indonesia.
 *   3. Kode sumber tidak boleh menyisakan teks Indonesia di JSX yang belum
 *      lewat kamus. Langkah ini yang menangkap kalimat seperti "Tampilkan
 *      yang nonaktif", karena kalimat itu memang tidak pernah ada di kamus
 *      sehingga langkah 1 buta terhadapnya.
 *
 * Jalankan dengan server dev hidup:  npm run cek:bahasa
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const ASAL = process.env.SIPRAS_URL ?? "http://localhost:3000";
const SESI = process.env.SIPRAS_SESI ?? "";

const RUTE_TAMU = ["/masuk", "/daftar"];
const RUTE_SESI = [
  "/dasbor", "/katalog", "/pengajuan", "/ajukan", "/profil", "/notifikasi",
  "/admin", "/admin/review", "/admin/aset", "/admin/verifikasi",
  "/admin/riwayat", "/admin/pengguna", "/admin/jadwal", "/admin/serah",
  "/kalender",
];

/* ── ambil kamus dari kode sumber ───────────────────────────────────── */

const sumberKamus = readFileSync("src/lib/kamus.ts", "utf8");

/**
 * Pasangan kunci dan nilainya di satu blok kamus.
 *
 * Dipakai langkah 4, yang membandingkan kedua kamus langsung alih alih
 * lewat halaman. Perlu berpasangan, bukan sekadar daftar nilai, supaya
 * bisa menunjuk kunci mana yang bermasalah.
 */
function pasanganKamus(penanda) {
  const awal = sumberKamus.indexOf(penanda);
  const akhir = penanda.includes("const ID")
    ? sumberKamus.indexOf("export type Kamus")
    : sumberKamus.length;
  const blok = sumberKamus.slice(awal, akhir);

  const peta = new Map();
  for (const m of blok.matchAll(/"?([\w.]+)"?:\s*\n?\s*"((?:[^"\\]|\\.){4,})"/g)) {
    peta.set(m[1], m[2].replace(/\\"/g, '"'));
  }
  return peta;
}

/** Kutip semua literal string di satu blok kamus. */
function nilaiKamus(penanda) {
  const awal = sumberKamus.indexOf(penanda);
  if (awal === -1) throw new Error(`blok kamus tidak ketemu: ${penanda}`);
  // Blok ID berakhir tepat sebelum deklarasi tipe, blok EN di akhir berkas.
  const akhir = penanda.includes("const ID")
    ? sumberKamus.indexOf("export type Kamus")
    : sumberKamus.length;
  const blok = sumberKamus.slice(awal, akhir);

  const keluar = new Set();
  for (const m of blok.matchAll(/"((?:[^"\\]|\\.){4,})"/g)) {
    const teks = m[1].replace(/\\"/g, '"');
    // Lewati yang bukan kalimat: penanda sisip, kelas CSS, dan token.
    if (/^[{}\s.\-_/]*$/.test(teks)) continue;
    if (teks.includes("var(--") || teks.startsWith("/")) continue;
    keluar.add(teks);
  }
  return [...keluar];
}

/**
 * Isi basis data contoh. Nama orang, kategori, dan lokasi memang tidak
 * diterjemahkan karena itu data, bukan antarmuka.
 */
const DATA_SEED = [
  "Nadia Rahmawati", "Teknologi Pangan", "Audio Visual", "Elektronik",
  "Furnitur", "Gudang Sarpras Lt. 1", "Gudang Gedung C", "Ruang Media Lt. 2",
  "21.01.2345", "nadia@kampus.ac.id", "Ilmu Komunikasi", "Tata Usaha",
  "Teknik Industri", "BEM Fakultas Teknik",
  // Nama kegiatan di data contoh. Kebetulan sama persis dengan contoh
  // placeholder di form pengajuan, jadi tanpa baris ini pencacah akan
  // menuduh data seed sebagai kebocoran antarmuka.
  "Seminar Nasional Teknologi Pangan",
];

const NILAI_ID = nilaiKamus("const ID = {");
const NILAI_EN = nilaiKamus("const EN: Kamus = {");

/**
 * Kata yang sama persis di kedua bahasa (Email, WhatsApp, SIPRAS, angka)
 * jelas bukan kebocoran. Dibuang dari kedua daftar.
 */
const SAMA = new Set(NILAI_ID.filter((x) => NILAI_EN.includes(x)));

/**
 * Frasa satu kata dibuang dari pencarian. Bukan karena tidak penting, tapi
 * karena kata seperti "Item", "Edit", atau "unit" muncul juga sebagai
 * potongan kata lain dan sebagai istilah yang sah di kedua bahasa, sehingga
 * hasilnya penuh temuan palsu dan justru menutupi kebocoran sungguhan.
 * Kalimat yang berisi dua kata atau lebih sudah cukup untuk menangkap
 * kebocoran nyata, dan langkah pindai sumber menjaring sisanya.
 */
const layak = (x) =>
  !SAMA.has(x) && x.trim().split(/\s+/).length >= 2 && !DATA_SEED.includes(x);

const CARI_ID = NILAI_ID.filter(layak);
const CARI_EN = NILAI_EN.filter(layak);

/* ── langkah 1 dan 2: periksa halaman yang benar benar dirender ──────── */

/**
 * Sisakan HANYA teks yang benar benar terbaca pengguna.
 *
 * Tiga hal dibuang, dan tiap alasannya konkret:
 *   <script>  payload RSC memuat nama kunci seperti "kolomKategori"
 *   <style>   bukan teks
 *   seluruh tag beserta atributnya, karena `value="Semua"` pada sebuah
 *             <option> adalah nilai form yang memang harus tetap stabil
 *             lintas bahasa, bukan tulisan yang dilihat orang
 */
function teksTampak(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}


/**
 * Bahasa sekarang milik AKUN, bukan cookie. Untuk rute bersesi, menyetel
 * cookie tidak lagi berpengaruh karena akun yang menang, jadi pencacah
 * harus menyetel bahasanya di basis data.
 *
 * Ini bukan pelonggaran alat, justru sebaliknya: alatnya menyesuaikan
 * diri dengan desain yang benar, bukan desainnya yang dibengkokkan agar
 * alatnya tetap jalan.
 */
const DB_URL = (readFileSync(".env", "utf8").match(/^DATABASE_URL="?([^"\n]+)"?/m) ?? [])[1];
const db = DB_URL ? new pg.Client({ connectionString: DB_URL }) : null;

async function setBahasaAkun(bahasa) {
  if (!db || !SESI) return;
  await db.query(`update "User" set bahasa = $1 where peran = 'ADMIN'`, [bahasa]);
}

async function ambil(rute, bahasa, pakaiSesi) {
  const cookie = [`sipras_bahasa=${bahasa}`, pakaiSesi && SESI ? `sipras_sesi=${SESI}` : ""]
    .filter(Boolean)
    .join("; ");
  const res = await fetch(ASAL + rute, { headers: { cookie } });
  if (!res.ok) throw new Error(`${rute} (${bahasa}) balas ${res.status}`);
  return teksTampak(await res.text());
}

const temuan = [];


/** Satu babak: setel bahasanya, muat semua rute, cari frasa bahasa lawan. */
async function babak(bahasa, rute, pakaiSesi) {
  if (pakaiSesi) await setBahasaAkun(bahasa);
  const cari = bahasa === "en" ? CARI_ID : CARI_EN;
  const mode = bahasa === "en" ? "EN" : "ID";

  for (const r of rute) {
    const halaman = await ambil(r, bahasa, pakaiSesi);
    for (const frasa of cari) {
      if (halaman.includes(frasa)) temuan.push({ rute: r, mode, frasa });
    }
  }
}

/* ── langkah 3: pindai kode sumber ───────────────────────────────────── */

/** Kata Indonesia yang tidak mungkin muncul di kode teknis, jadi kalau ada
 *  di teks JSX berarti kalimat yang belum lewat kamus. */
const PENANDA_ID =
  /\b(yang|dan|atau|dengan|untuk|kamu|tidak|sudah|belum|akan|bisa|dari|pada|kalau|supaya|hanya|semua|tanpa|lalu|saat|masih)\b/i;

/**
 * Penanda ketiga: MORFOLOGI Indonesia.
 *
 * PENANDA_ID di atas hanya melihat kata sambung, jadi ia buta terhadap label
 * satu kata seperti "Dipakai", "Dikembalikan", dan "Diajukan". Ketiganya juga
 * tidak ada di kamus sebagai nilai utuh, sebab yang tersimpan di sana adalah
 * kalimat lengkapnya, jadi pencocokan kamus pun tidak menolongnya.
 *
 * Awalan di-, ter-, meng-, ber-, dan sejenisnya adalah ciri kata kerja
 * Indonesia yang jarang membentuk kata Inggris utuh. Kalaupun sesekali ada
 * yang tertuduh, temuannya tetap berguna: teks Inggris yang ditulis langsung
 * di JSX juga melewati kamus, dan itu sama sama kebocoran.
 */
const MORFOLOGI_ID =
  /\b(di|ter|meng|mem|men|ber|peng|pem)[a-z]{4,}\b/i;

function berkasTsx(dir, keluar = []) {
  for (const nama of readdirSync(dir)) {
    const jalur = join(dir, nama);
    if (statSync(jalur).isDirectory()) berkasTsx(jalur, keluar);
    else if (nama.endsWith(".tsx")) keluar.push(jalur);
  }
  return keluar;
}

/**
 * Langkah 4: kunci yang nilainya SAMA PERSIS di kedua kamus.
 *
 * Ini menutup celah nyata di langkah 1 dan 2. Di sana, frasa yang sama di
 * kedua bahasa sengaja dilewati supaya kata seperti Email dan WhatsApp
 * tidak dituduh bocor. Tapi aturan itu juga menyembunyikan hal yang justru
 * paling ingin kita temukan: kunci yang LUPA diterjemahkan, yang tandanya
 * persis sama, nilainya identik.
 *
 * Celah ini ketahuan saat saya sengaja mengembalikan satu terjemahan ke
 * bahasa Indonesia dan pencacah tetap melaporkan bersih.
 *
 * SEMULA pembedanya penanda kata sambung Indonesia ("yang", "dengan", dst),
 * dengan alasan "Email" tidak punya penanda itu sedangkan kalimat penuh
 * jelas punya. Tapi syarat itu sendiri jadi celah baru: label pendek dua
 * kata seperti "Hari layanan" tidak punya satu pun kata sambung, jadi lolos
 * juga walau benar benar belum diterjemahkan. Celah ini ketahuan lewat
 * sabotase ulang, kali ini pada kunci yang benar benar dirender halaman.
 *
 * Sekarang syaratnya dibalik: SEMUA nilai identik dua kata atau lebih
 * dicurigai, KECUALI yang memang secara sah tidak diterjemahkan, yaitu
 * data contoh (DATA_SEED, sama seperti langkah 1/2) dan nomor telepon
 * contoh. Nama orang dan istilah asing seperti "Audio Visual" sudah masuk
 * DATA_SEED, jadi daftar itu dipakai ulang di sini, bukan ditulis dua kali.
 */
function belumDiterjemahkan() {
  const id = pasanganKamus("const ID = {");
  const en = pasanganKamus("const EN: Kamus = {");
  const hasil = [];
  for (const [kunci, nilai] of id) {
    if (en.get(kunci) !== nilai) continue;
    if (nilai.trim().split(/\s+/).length < 2) continue;
    if (DATA_SEED.includes(nilai)) continue;
    // Nomor telepon contoh: hanya angka, spasi, dan tanda hubung.
    if (/^[\d\s+-]+$/.test(nilai)) continue;
    hasil.push({ kunci, nilai: nilai.slice(0, 62) });
  }
  return hasil;
}

/**
 * Atribut yang isinya memang bukan kalimat untuk dibaca orang. Nilai di sini
 * wajib stabil lintas bahasa, jadi menuduhnya bocor justru salah.
 */
const ATRIBUT_TEKNIS = new Set([
  "className", "href", "type", "name", "id", "value", "style", "key", "rel",
  "target", "src", "method", "action", "role", "width", "height", "viewBox",
  "fill", "stroke", "d", "strokeWidth", "strokeLinecap", "strokeLinejoin",
  "cx", "cy", "r", "x", "y", "rx", "ry", "points", "transform", "offset",
  "autoComplete", "inputMode", "accept", "scope", "colSpan", "rowSpan",
  "min", "max", "step", "pattern", "lang", "charSet", "content", "property",
  "as", "sizes", "loading", "decoding", "htmlFor", "download", "formAction",
  "encType", "gridTemplateColumns", "fontFamily", "background", "color",
  // Prop `nama` di proyek ini SELALU berisi nama field form atau nama ikon,
  // bukan kalimat. Sudah diperiksa: seluruh nilainya berupa "email", "sandi",
  // "kalender", dan sejenisnya. Tanpa pengecualian ini, nama="unit" tertuduh
  // bocor cuma karena kata "unit" kebetulan ada di kamus.
  "nama",
]);

/**
 * Buang komentar supaya penjelasan berbahasa Indonesia di dalam kode tidak
 * ikut tertuduh. Dilakukan atas SELURUH berkas sekaligus, bukan per baris,
 * karena komentar blok memang membentang beberapa baris.
 *
 * Panjang berkas dijaga tetap sama, karakter komentarnya diganti spasi dan
 * baris barunya dipertahankan, supaya nomor baris temuan tetap benar.
 */
function tanpaKomentar(isi) {
  return isi
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, awal) => awal + " ".repeat(m.length - awal.length));
}

const barisKe = (isi, indeks) => isi.slice(0, indeks).split("\n").length;

/**
 * Literal yang jelas BUKAN kalimat untuk dibaca orang.
 *
 * Daftar ini yang menjaga penjaring literal-dalam-kode tetap berguna. Tanpa
 * penyaring ini ia melaporkan nilai enum, kelas CSS, dan jalur impor sebagai
 * kebocoran, dan temuan sungguhannya tenggelam di antaranya.
 */
function tokenTeknis(t) {
  if (/^[A-Z_]+$/.test(t)) return true;                          // nilai enum
  // Jalur: WAJIB "./", "../", atau "/" di awal. Pola lama menerima titik
  // tunggal, sehingga kalimat seperti ". Sandi ini sudah aman." dikira jalur
  // dan lolos tanpa terdeteksi.
  if (/^(\.{1,2}\/|\/|@\/|#|https?:)/.test(t)) return true;
  if (t.includes("var(--") || /\d+px|1px solid/.test(t)) return true; // nilai gaya
  if (/^[a-z][a-z0-9-]*( [a-z][a-z0-9-]*)*$/.test(t) && t.includes("-")) return true; // kelas CSS
  if (/^[a-z][a-zA-Z0-9]*$/.test(t)) return true;                // identifier satu kata
  return false;
}

/**
 * Ganti tiap ${...} di template literal dengan penanda, sampai tidak ada lagi.
 *
 * Perulangannya perlu karena template bisa BERSARANG, dan sekali ganti akan
 * menyisakan "${" yang membuat nama variabel seperti `pemohon` ikut terbaca
 * sebagai kata Indonesia. Kalau sesudah beberapa putaran masih ada kurung
 * kurawal, template itu terlalu rumit untuk dibaca dengan aman, jadi
 * dilewati saja alih alih dilaporkan sebagai temuan yang belum tentu benar.
 */
function bersihkanTemplate(t) {
  let hasil = t;
  for (let i = 0; i < 5; i++) {
    const berikut = hasil.replace(/\$\{[^{}]*\}/g, " ");
    if (berikut === hasil) break;
    hasil = berikut;
  }
  return /[${}]/.test(hasil) ? null : hasil;
}

/**
 * Langkah 3: pindai kode sumber untuk teks yang belum lewat kamus.
 *
 * DITULIS ULANG setelah versi lama terbukti buta. Yang lama memeriksa BARIS
 * DEMI BARIS dengan pola `>teks<`, sehingga menuntut `>` dan `<` berada di
 * baris yang sama. Teks JSX yang membentang beberapa baris, yang justru
 * bentuk paling lazim untuk kalimat panjang, tidak terlihat sama sekali.
 * Saat celah ini diukur, ada 19 kalimat Indonesia yang lolos, termasuk isi
 * modal yang dikeluhkan pemakai.
 *
 * Sekarang pemindaian dilakukan atas seluruh berkas sekaligus, dengan tiga
 * penjaring yang saling menutupi:
 *
 *   1. Teks JSX di antara tag, BOLEH melewati baris baru.
 *   2. Nilai string di atribut dan di nilai bawaan parameter, karena teks
 *      juga sering dioper sebagai prop, misalnya sedang="Memproses...".
 *   3. Kecocokan dengan kamus Indonesia.
 *
 * Penjaring ketiga itu yang menangkap label pendek seperti "Batal" dan
 * "Ya, nonaktifkan". Keduanya tidak punya satu pun kata sambung sehingga
 * PENANDA_ID buta terhadapnya, tapi keduanya ADA di kamus Indonesia dengan
 * padanan Inggris yang berbeda. Menuliskannya langsung di JSX berarti
 * melewati kamus, dan itu persis definisi kebocorannya. Sumbernya kamus,
 * bukan daftar kata tulisan tangan, jadi ia ikut tumbuh sendiri.
 */
function pindaiSumber() {
  // Nilai kamus Indonesia yang padanan Inggrisnya BERBEDA. Yang identik di
  // kedua bahasa, misalnya "Email", jelas bukan kebocoran.
  const kamusID = new Set(NILAI_ID.filter((x) => !SAMA.has(x) && x.length >= 4));

  const mencurigakan = (teks) =>
    PENANDA_ID.test(teks) || kamusID.has(teks) || MORFOLOGI_ID.test(teks);

  const hasil = [];
  for (const jalur of berkasTsx("src")) {
    if (jalur.includes("kamus")) continue;
    const isi = tanpaKomentar(readFileSync(jalur, "utf8"));

    // 1. Teks JSX di antara tag. Baris baru diizinkan, inilah perbaikan
    //    pertamanya. Dipakai DUA pola, dan pembagiannya disengaja:
    //
    //      >teks<  dan  >teks{   teks tepat setelah sebuah tag
    //      }teks<                teks tepat sebelum sebuah tag
    //
    //    Keduanya perlu karena teks sangat sering berdempetan dengan
    //    interpolasi, misalnya `Dipakai {fmtRentang(...)}` dan `{n} hari`.
    //    Pola lama berhenti di "{" lalu membuang seluruh kecocokan, sehingga
    //    kalimat semacam itu tidak pernah terlihat sama sekali.
    //
    //    Pola `}teks{` SENGAJA TIDAK dipakai. Ia cocok dengan kode TypeScript
    //    biasa di antara dua blok, dan hasilnya banjir temuan palsu yang
    //    justru menutupi kebocoran sungguhan. Ini pernah terjadi dan langsung
    //    terlihat saat dicoba.
    const kandidat = [
      ...isi.matchAll(/>([^<>{}]+)[<{]/g),
      ...isi.matchAll(/}([^<>{}]+)</g),
    ];
    for (const m of kandidat) {
      const teks = m[1].replace(/\s+/g, " ").trim();
      if (teks.length < 3) continue;
      // Titik koma dan tanda sama dengan praktis tidak pernah muncul di
      // kalimat antarmuka, tapi selalu muncul di kode. Ini penjaga terakhir
      // kalau ada potongan kode yang lolos dari kedua pola di atas.
      if (/[;=]/.test(teks)) continue;
      // Diawali kurung atau koma penutup berarti ini lanjutan ekspresi kode,
      // bukan kalimat. Contohnya `), pengajuan: (` di peta ikon.
      if (/^[)\],}]/.test(teks)) continue;
      if (!mencurigakan(teks)) continue;
      hasil.push({ jalur, baris: barisKe(isi, m.index), teks: teks.slice(0, 60) });
    }

    // 3. Literal string DI DALAM KODE: ternary, template literal, dan nilai
    //    bawaan. Ini celah keempat yang ditemukan, dan yang paling licin.
    //    Contoh nyatanya `{barang ? "Barang" : "Ruang"}` di BadgeTipe dan
    //    `${a.kapasitas} orang` di tabel aset: keduanya kalimat yang dilihat
    //    pengguna, tapi letaknya di dalam ekspresi, jadi kedua penjaring di
    //    atas sama sekali tidak melihatnya.
    //
    //    Penyaringnya ketat, dan harus ketat. Berkas .tsx penuh literal yang
    //    memang bukan kalimat: nilai enum, kelas CSS, jalur impor, dan nilai
    //    gaya. Saat disaring longgar, hasilnya 166 kandidat dengan 92% palsu,
    //    dan gerbang yang meleset sebanyak itu cuma melatih orang
    //    mengabaikannya. Syarat lolosnya: bukan token teknis, DAN mengandung
    //    spasi atau berawalan morfologi Indonesia.
    for (const m of isi.matchAll(/"([^"\n]{3,})"|`([^`]{3,})`/g)) {
      const mentah = m[1] ?? bersihkanTemplate(m[2]);
      if (mentah === null) continue;
      const teks = mentah.trim();
      if (tokenTeknis(teks)) continue;
      // Kecocokan kamus MELEWATI syarat "harus ada spasi". Tanpa kelonggaran
      // ini, label satu kata seperti "Barang" dan "Ruang" tersaring sebelum
      // sempat dicocokkan, padahal keduanya jelas ada di kamus dengan padanan
      // Inggris yang berbeda. Ini ketahuan lewat sabotase: pemindainya gagal
      // menangkap persis kasus yang melatarbelakangi pembuatannya.
      if (!(teks.includes(" ") || MORFOLOGI_ID.test(teks) || kamusID.has(teks)))
        continue;
      if (!mencurigakan(teks)) continue;
      hasil.push({ jalur, baris: barisKe(isi, m.index), teks: teks.slice(0, 60) });
    }

    // 2. Nilai string di atribut JSX dan di nilai bawaan parameter.
    //    Spasi di sekitar "=" diizinkan supaya `labelBatal = "Batal"` ikut
    //    terjaring, sebab nilai bawaan itulah yang membuat tombol Batal
    //    tetap berbahasa Indonesia walau pemanggilnya sudah benar.
    for (const m of isi.matchAll(/([\w-]+)\s*=\s*\{?"([^"]+)"\}?/g)) {
      const [, atribut, teks] = m;
      if (ATRIBUT_TEKNIS.has(atribut)) continue;
      if (teks.length < 3) continue;
      if (teks.startsWith("var(--") || teks.startsWith("/") || teks.startsWith("#")) continue;
      if (!mencurigakan(teks)) continue;
      hasil.push({
        jalur,
        baris: barisKe(isi, m.index),
        teks: `${atribut}="${teks.slice(0, 50)}"`,
      });
    }
  }
  return hasil;
}

/* ── jalankan ────────────────────────────────────────────────────────── */

console.log(`\nKamus: ${CARI_ID.length} frasa Indonesia, ${CARI_EN.length} frasa Inggris.`);
console.log(`Frasa yang sama di kedua bahasa dan sengaja dilewati: ${SAMA.size}.\n`);

if (db) await db.connect();

/**
 * Langkah 1 dan 2 butuh server hidup, langkah 3 dan 4 tidak.
 *
 * Kalau servernya mati, pemindaian sumber TETAP dijalankan dan hasilnya tetap
 * dilaporkan, cuma pemeriksaan halamannya yang dilewati dengan pemberitahuan
 * yang jelas. Sebelumnya seluruh pencacah langsung jatuh dengan jejak galat
 * jaringan, dan itu membuat orang enggan menjalankannya saat sedang menambal
 * kebocoran, justru di saat ia paling dibutuhkan.
 *
 * Dilewatinya dikatakan terang terangan, bukan didiamkan, supaya "Bersih"
 * tidak pernah berarti lebih dari yang sebenarnya diperiksa.
 */
let halamanDiperiksa = true;
try {
  // Tamu memakai cookie, karena memang belum punya akun untuk ditanya.
  await babak("en", RUTE_TAMU, false);
  await babak("id", RUTE_TAMU, false);
} catch (e) {
  if (e?.cause?.code !== "ECONNREFUSED") throw e;
  halamanDiperiksa = false;
  console.log(`Server di ${ASAL} tidak hidup. Pemeriksaan halaman DILEWATI,`);
  console.log("hanya pemindaian kode sumber yang dijalankan.\n");
}

if (halamanDiperiksa && SESI) {
  await babak("en", RUTE_SESI, true);
  await babak("id", RUTE_SESI, true);
  // Kembalikan ke bawaan supaya menjalankan pencacah tidak diam diam
  // mengubah preferensi akun yang sedang dipakai orang.
  await setBahasaAkun("id");
} else if (halamanDiperiksa) {
  console.log("SIPRAS_SESI kosong, rute bersesi dilewati.\n");
}
if (db) await db.end();

const sumber = pindaiSumber();
const belum = belumDiterjemahkan();


if (temuan.length === 0 && sumber.length === 0 && belum.length === 0) {
  console.log(
    halamanDiperiksa
      ? "Bersih. Tidak ada kebocoran bahasa di halaman maupun di kode sumber.\n"
      : "Kode sumber bersih. Halaman BELUM diperiksa, nyalakan server dulu.\n"
  );
  process.exit(0);
}

if (temuan.length) {
  console.log(`KEBOCORAN DI HALAMAN (${temuan.length}):`);
  for (const t of temuan) console.log(`  ${t.rute} [mode ${t.mode}] "${t.frasa}"`);
  console.log("");
}
if (sumber.length) {
  console.log(`TEKS BELUM LEWAT KAMUS DI KODE SUMBER (${sumber.length}):`);
  for (const s of sumber) console.log(`  ${s.jalur}:${s.baris}  "${s.teks}"`);
  console.log("");
}
if (belum.length) {
  console.log(`KUNCI BELUM DITERJEMAHKAN, nilainya sama di kedua kamus (${belum.length}):`);
  for (const b of belum) console.log(`  ${b.kunci}  "${b.nilai}"`);
  console.log("");
}
process.exit(1);
