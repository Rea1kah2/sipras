/**
 * Grafik sederhana, digambar sebagai SVG di server.
 *
 * Tanpa pustaka grafik, alasannya dua dan keduanya konkret:
 *   1. Bentuk yang dibutuhkan cuma batang dan peringkat. Pustaka grafik
 *      menyelesaikan masalah yang tidak kita punya.
 *   2. Pustaka grafik memaksa jadi komponen klien, dan itu berarti kamus
 *      ikut dikirim ke peramban serta label diambil lewat konteks. Digambar
 *      di server, labelnya cukup dirakit di tempat.
 *
 * AKSESIBILITAS DIRANCANG, BUKAN DITAMBAL. Grafik yang hanya bercerita
 * lewat panjang batang dan warna tidak terbaca pembaca layar. Karena itu
 * tiap grafik menyertakan daftar nilainya sebagai teks tersembunyi, dan
 * angkanya juga ditulis di sebelah tiap batang supaya tidak ada yang perlu
 * menebak dari panjangnya.
 */

export type TitikData = {
  /** Label pendek di sumbu, mis. "Agu" atau "4+". */
  label: string;
  nilai: number;
  /**
   * Label panjang untuk padanan teks. Sumbu grafik harus pendek supaya muat,
   * tapi pembaca layar tidak melihat sumbunya, jadi "1" tanpa satuan tidak
   * berarti apa apa di sana.
   */
  panjang?: string;
};

/** Batang tegak, untuk tren sepanjang waktu. */
export function GrafikBatang({
  data,
  judul,
  satuan,
}: {
  data: TitikData[];
  judul: string;
  satuan: string;
}) {
  const puncak = Math.max(1, ...data.map((d) => d.nilai));

  return (
    <figure className="grafik">
      <figcaption className="grafik-judul">{judul}</figcaption>

      <div className="batang-kisi" role="presentation">
        {data.map((d) => (
          <div key={d.label} className="batang-kolom">
            <span className="batang-nilai">{d.nilai}</span>
            <div className="batang-jalur">
              <div
                className="batang-isi"
                // Tinggi relatif terhadap puncak. Puncak dijaga minimal 1
                // supaya data yang semuanya nol tidak membagi dengan nol.
                style={{ height: `${(d.nilai / puncak) * 100}%` }}
              />
            </div>
            <span className="batang-label">{d.label}</span>
          </div>
        ))}
      </div>

      <ul className="sr-only">
        {data.map((d) => (
          <li key={d.label}>
            {d.panjang ?? d.label}: {d.nilai} {satuan}
          </li>
        ))}
      </ul>
    </figure>
  );
}

/** Batang mendatar berperingkat, untuk daftar teratas. */
export function GrafikPeringkat({
  data,
  judul,
  satuan,
  kosong,
}: {
  data: TitikData[];
  judul: string;
  satuan: string;
  kosong: string;
}) {
  const puncak = Math.max(1, ...data.map((d) => d.nilai));

  return (
    <figure className="grafik">
      <figcaption className="grafik-judul">{judul}</figcaption>

      {data.length === 0 ? (
        <p className="grafik-kosong">{kosong}</p>
      ) : (
        <>
          <ol className="peringkat" role="presentation">
            {data.map((d) => (
              <li key={d.label} className="peringkat-baris">
                <span className="peringkat-label" title={d.label}>
                  {d.label}
                </span>
                <span className="peringkat-jalur">
                  <span
                    className="peringkat-isi"
                    style={{ width: `${(d.nilai / puncak) * 100}%` }}
                  />
                </span>
                <span className="peringkat-nilai">{d.nilai}</span>
              </li>
            ))}
          </ol>

          <ul className="sr-only">
            {data.map((d, i) => (
              <li key={d.label}>
                {i + 1}. {d.panjang ?? d.label}: {d.nilai} {satuan}
              </li>
            ))}
          </ul>
        </>
      )}
    </figure>
  );
}
