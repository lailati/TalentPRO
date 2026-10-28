# Modul Kenaikan Pangkat — panduan reka bentuk dan penggunaan

Modul ini melaksanakan **Garis Panduan Kenaikan Pangkat Staf Akademik UPNM (Edisi 2025, LPU 28 Ogos 2025)** di dalam Peta Bakat FSTP. Dokumen PDF Garis Panduan tidak disertakan dalam repositori (fail peribadi); semua peraturan dikodkan sebagai **data** dalam `js/promotion/guideline.js` dengan rujukan perenggan (Perenggan ).

## Prinsip: mesti mesra pengguna dan mesra pentadbir

Garis Panduan itu rumit (108 halaman). Sistem ini menyembunyikan kerumitannya di belakang enjin peraturan, dan skrin hanya menunjukkan **satu perkara seterusnya**:

- **Pensyarah**: satu halaman (`#/kp`) — gred sekarang → sasaran, cincin kesediaan, "3 perkara paling penting", dan **satu** butang utama (Mulakan permohonan / Lihat status). Butang "Tambah rekod" membuka borang dengan jenis rekod yang betul.
- **Pegawai KP (HR)**: dashboard (#/hr) dan papan kerja (#/kp-admin) dengan tab *Perlu tindakan / Semua / Calon berpotensi*; butiran permohonan menunjukkan **satu langkah semasa**, siapa yang bertindak, senarai semak, dan butang keputusan dalam bahasa biasa.
- **Butang "?"** di sebelah setiap istilah / butang yang kelihatan rumit (kira-kira 150 entri dalam `js/help.js`, dengan rujukan Perenggan ). Butang **Bantuan** di bar atas menerangkan halaman semasa. Borang menyembunyikan medan kenaikan pangkat di bawah bahagian pilihan yang dilipat, dan medan lain muncul hanya apabila relevan (contoh: jenis aktiviti).

## Rekod bukti yang dipaparkan

Aktiviti Akademik, Penyelidikan, Penerbitan, Konsultansi, Pencapaian (anugerah/pingat, Lampiran D1–D2, E1–E2, B15–B18), Dokumen (pensyarah menulis; HR membaca sahaja), serta Markah LPPT dan Hukuman Tatatertib (HR menulis). Kepakaran, Pensijilan dan Latihan tidak dipaparkan kerana tidak menjadi bukti dalam Garis Panduan; jadual backendnya dikekalkan. Papan Pemuka lama kini beralih ke halaman utama peranan: `#/users` (Admin Sistem), `#/hr` (HR) atau `#/kp` (pensyarah). Admin dan HR tidak memasukkan rekod bukti; pensyarah memasukkannya sendiri.

## Laluan gred yang dilindungi

DS11 → DS13 → DS14 → VK7 → VK6 → VK5. (Laluan Guru Bahasa dan Pensyarah Perubatan "time-based" tidak dilaksanakan.)

## Tetingkap aktiviti (apa yang dikira)

| Ke gred | Aktiviti dikira |
|---|---|
| DS13 | hanya ketika di Gred DS11 (`grade_since`) |
| DS14, VK7 | kumulatif sejak lantikan di UPNM (`appointed_on`) |
| VK6, VK5 | kumulatif sejak di Gred VK7 (`vk7_since`) |

Hanya penerbitan berstatus *Diterbitkan*, penyelidikan / perundingan yang *berdaftar di PPI*, dan penyeliaan yang *bergraduat* dikira. Kesetaraan Perenggan 6.7 (1 bab = 1 SCOPUS, 1 buku = 3, 1 WoS = 2; 1 Sarjana Penyelidikan = 3 Kerja Kursus) dan penggabungan tempoh tatatertib (2.3.5–2.3.8) dilaksanakan dalam `engine.js` dan diuji.

## Aliran kerja permohonan

`draf → fakulti → pendaftar → saringan → [penilai]* → pemilih → lpu → [syarahan]** → berjaya`, dengan cabang `tidak_berjaya → rayuan (≤ 30 hari) → rayuan_berjaya | rayuan_ditolak` dan `ditarik_balik`.
\* hanya DS14 ke atas (3 Penilai Luar). \*\* hanya jawatan Profesor.

Jadual peralihan sah berada di `js/promotion/workflow.js` **dan** disalin dalam `backend/Code.gs` (kemas kini kedua-duanya serentak). Peraturan dikuatkuasakan di pelayan: pensyarah hanya boleh mencipta / menghantar / merayu permohonan sendiri; pentadbir "bertindak sebagai" jawatankuasa berkenaan dan setiap tindakan direkodkan dalam garis masa (`promotion_events`); sekurang-kurangnya 3 laporan Penilai Luar diperlukan sebelum meninggalkan langkah `penilai`; rayuan hanya dalam 30 hari.

## Peranan dan kebenaran

Tiga peranan (nilai users.role): `admin` = **Admin Sistem**, `hr` = **Pegawai KP (HR)**, `lecturer` = **Pensyarah**. Peranan tak boleh ditukar selepas akaun dicipta. Semua kebenaran dikuatkuasakan di pelayan (`js/local-server.js` dan `backend/Code.gs`), bukan di UI sahaja.

| | Admin Sistem | Pegawai KP (HR) | Pensyarah |
|---|---|---|---|
| Akaun (cipta, import CSV, kata laluan, padam) dan kategori | ✔ | ✘ | ✘ |
| Data KP, LPPT, tatatertib, maklumat perkhidmatan | ✘ (tidak dihantar dalam `snapshot`) | ✔ (tulis: LPPT, tatatertib, penilai luar, maklumat perkhidmatan, `staff_id`, semua tindakan `promo*`) | baca sendiri sahaja |
| Rekod bukti (aktiviti, penyelidikan, penerbitan, konsultansi, pencapaian, dokumen) | ✘ | **baca/muat turun sahaja** | tulis rekod sendiri |
| Dashboard HR (`#/hr`) | ✘ | ✔ | ✘ |
| Cipta draf / hantar bagi pihak calon | ✘ | ✔ | permohonan sendiri |

- Pensyarah: baca-sahaja pada `lppt_scores`, `disciplinary`, `promotion_assessors`; **tidak boleh** menulis maklumat perkhidmatan (`SERVICE_FIELDS`) kecuali `scopus_h_index`.
- HR: hanya mengemas kini No. Staf dan Maklumat Perkhidmatan pada profil pensyarah (butang *Kemas Kini Maklumat Perkhidmatan*); profil peribadi dikemas kini oleh pensyarah sendiri.
- `promotion_applications` / `promotion_events`: tiada CRUD generik, hanya tindakan `promo*`.
- Akaun HR pertama dicipta oleh Admin Sistem melalui *Urus Pengguna → Tambah Pengguna → Peranan "Pegawai KP (HR)"*. Sandbox `?backend=local` mempunyai akaun `admin`/`admin` dan `hr`/`hr` (sandbox sahaja).

## Dashboard HR (`#/hr`)

Jubin ringkasan (dalam proses, tertunggak > 14 hari, rayuan, berjaya/tidak berjaya tahun ini, calon berpotensi); saluran permohonan mengikut peringkat dan senarai menunggu tindakan; amaran (rayuan tamat ≤ 7 hari, tertunggak, disekat tatatertib, maklumat perkhidmatan tidak lengkap, tiada markah LPPT); calon berpotensi dengan penapis jabatan/gred sasaran dan butang *Cipta draf*; statistik keputusan mengikut tahun, jabatan dan gred sasaran dengan **Eksport CSV** dan **Cetak**. Fail: `js/views/hrDashboard.js` (menggunakan semula `quickReadiness`, `disciplineBlocks` dan `appealInfo`).

## Modul pensyarah: senarai semak, rekod dikira dan panduan bukti

- **Senarai Semak Kriteria** (`#/kp/kriteria`, `js/views/kpKriteria.js`): setiap kriteria bagi gred sasaran dengan status hidup, kod Lampiran, jurang dan pautan **Tambah rekod** yang membuka borang dengan nilai awal yang betul (cth. penerbitan SCOPUS: status *Diterbitkan*, Penulis Utama). Pilih gred lebih tinggi untuk **pratonton** (tidak boleh dimohon) dan bidang (S&T / Sains Sosial / Klinikal).
- **Rekod saya** di bawah setiap bahagian (`explainRecords()` dalam `engine.js`): setiap rekod ditanda *Dikira* atau *Tidak dikira* beserta sebab (belum Diterbitkan, belum didaftarkan di PPI, status Dirancang, pelajar belum bergraduat, bukan Penyelia Utama, di luar tetingkap tahun, jenis perundingan tidak dikira, dll.), dan penunjuk *Bukti* (ada dokumen atau tidak). Pautan ikon pensil membuka rekod (`?edit=<id>`).
- **Bila saya layak?** (`eligibility()`): tarikh pengesahan, tamat tempoh tatatertib, tempoh perkhidmatan DS13 (12 tahun tanpa PhD / 10 tahun dengan kelayakan profesional / PhD), LPPT 3 tahun, dan tetingkap aktiviti.
- **Panduan bukti Lampiran** (`js/promotion/lampiran-data.js`): dalam borang rekod, kotak "Bukti yang diperlukan" menyenaraikan maklumat Lampiran 1 bagi jenis yang dipilih dan dokumen yang disyorkan. Disusun mengikut jenis rekod kerana jadual Lampiran dalam teks tidak sejajar dengan tepat antara kod dan nama baris; kod rujukan kekal yang dipakai `ACTIVITY_KINDS`.
- **Permohonan**: kesediaan dikira semula pada setiap langkah; jika kriteria belum dipenuhi, pensyarah **diberi amaran dan boleh menghantar juga** (keputusan oleh Fakulti / jawatankuasa; tiada sekatan di pelayan). Borang Lampiran 1 hanya menyenaraikan rekod yang dikira; rekod lain disenaraikan berasingan dengan sebab.

### Pembetulan enjin mengikut teks Garis Panduan (disahkan)
- VK7 Klinikal: 3 pemeriksa luar tesis **atau** 3 pemeriksa klinikal luar (Perenggan 6.4).
- VK5 (semua bidang): 15 penilai jurnal berindeks **dan 5 daripadanya SCOPUS** (jenis aktiviti baharu *Penilai artikel jurnal SCOPUS*, tanpa lajur Sheet baharu).
- VK6 Sains Sosial / Klinikal: penerbitan setara hanya sebagai Penulis Utama (S&T membenarkan penulis bersama) (Perenggan 6.5).
- Perundingan berstatus *Dirancang* tidak dikira (seperti penyelidikan).
- DS13 tiada lajur Klinikal dalam Garis Panduan: nilai Sains Sosial digunakan dan dinyatakan pada nota tetingkap.
- Tidak diubah (disemak, bukan percanggahan): Sarjana Klinikal dan Diploma Pascasiswazah (Perenggan 6.7.3 hanya menetapkan kesetaraan; tiada gred yang memerlukannya).

## Fail

| Fail | Peranan |
|---|---|
| `js/promotion/guideline.js` | Garis Panduan sebagai data (RULES, STEPS, FAQ, jawatankuasa, kod Lampiran) |
| `js/promotion/engine.js` | `evaluate()`, `disciplineBlocks()`, `compileLampiran()`, `quickReadiness()` — tulen, tanpa DOM |
| `js/promotion/workflow.js` | jadual peralihan, label butang, tempoh rayuan |
| `js/help.js` | daftar bantuan "?" dan bantuan halaman |
| `js/views/kp*.js`, `panduan.js`, `lampiran.js` | skrin |
| `js/promotion/lampiran-data.js` | panduan bukti mengikut jenis rekod (Lampiran 1) |
| `js/views/kpKriteria.js` | senarai semak kriteria, rekod dikira, tarikh kelayakan |
| `tools/test-engine.mjs` | 39 ujian unit yang memetik perenggan Garis Panduan (gred DS13–VK5, kesetaraan, tatatertib, `explainRecords`, `eligibility`) |

Jalankan ujian: `node tools/test-engine.mjs`.

## Had dan andaian (jujur)

- Belum diuji dengan pensyarah / pegawai sebenar (UAT dirancang).
- Laluan Guru Bahasa dan Pensyarah Perubatan "time-based" tidak dilaksanakan.
- Pengajaran: beban jam kredit, "3 tahun terkini" dan markah penilaian pelajar belum dimodelkan (hanya semester + kursus teradun). Lampiran 2 (penilaian Jawatankuasa Kesepakaran) tidak dijana.
- Kriteria "dalam bidang kepakaran" bagi penerbitan, perundingan dan penyeliaan disahkan oleh jawatankuasa, bukan oleh sistem.
- Andaian: pengajaran DS13 = sekurang-kurangnya 1 semester + 1 kursus teradun; "kategori kecil" pengiktirafan dipermudah; bendera Syarahan Perdana / Monograf (VK6, VK5) direkodkan pada rekod pensyarah oleh Pejabat Pendaftar.
- Semakan sistem hanyalah panduan: keputusan sebenar dibuat oleh Fakulti, Pejabat Pendaftar dan jawatankuasa.

## Pemasangan di Apps Script

Tampal `backend/Code.gs` yang baharu, jalankan fungsi `setup()` (mencipta 6 helaian baharu dan lajur tambahan), kemudian **Deploy → Manage deployments → New version**.
