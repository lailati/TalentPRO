// Panduan bukti mengikut Lampiran 1 (Garis Panduan Kenaikan Pangkat UPNM 2025): "Maklumat Diperlukan" bagi setiap jenis rekod.
// Disusun mengikut jenis rekod (bukan kod mentah) kerana jadual Lampiran dalam teks tidak sejajar dengan tepat antara kod dan nama baris; kod rujukan
// kekal yang dipakai oleh ACTIVITY_KINDS / lampiranPublication / lampiranResearch / lampiranConsult.
import { ACTIVITY_KINDS, lampiranPublication, lampiranResearch, lampiranConsult } from './guideline.js';

const STUDENT = ['Nama pelajar dan No. Matrik', 'Program pengajian', 'Tajuk tesis / projek', 'Tahun daftar', 'Tahun graduat'];
const COMMITTEE = ['Nama jawatankuasa', 'Tempoh / tahun lantikan', 'Peranan'];

const ACTIVITY = {
  ajar_semester: { needs: ['Nama dan kod kursus', 'Nama program', 'Jam kredit', 'Semester / sesi mengajar', 'Markah penilaian pengajaran (jika ada)'], proof: 'Jadual / surat beban tugas pengajaran; bukti penggunaan platform teradun (blended) bagi sekurang-kurangnya satu kursus.' },
  sv_phd: { needs: STUDENT, proof: 'Surat lantikan penyelia / senarai penyeliaan daripada Pusat Pengajian Siswazah; bukti tarikh bergraduat.' },
  sv_msc_res: { needs: STUDENT, proof: 'Surat lantikan penyelia; bukti tarikh bergraduat.' },
  sv_msc_kk: { needs: STUDENT.filter((n) => !n.startsWith('Tajuk tesis')).concat(['Tajuk projek / tesis (jika ada)']), proof: 'Senarai penyeliaan atau surat lantikan; bukti tarikh bergraduat.' },
  sv_msc_klin: { needs: STUDENT, proof: 'Surat lantikan penyelia; bukti tarikh bergraduat.' },
  sv_psm: { needs: ['Nama pelajar dan No. Matrik', 'Program pengajian', 'Tajuk projek', 'Tahun daftar', 'Tahun graduat'], proof: 'Senarai penyeliaan Projek Sarjana Muda daripada Fakulti; bukti pelajar telah selesai.' },
  sv_postdoc: { needs: ['Nama pelajar', 'Tempoh / tahun', 'Peranan'], proof: 'Surat lantikan penyelia utama Post-Doktoral.' },
  ik_editor: { needs: ['Nama editorial board / jurnal', 'Institusi yang melantik', 'Tempoh / tahun lantikan', 'Peranan'], proof: 'Surat lantikan editor atau tangkapan skrin laman web editorial board.' },
  ik_editor_scopus: { needs: ['Nama editorial board / jurnal (SCOPUS)', 'Institusi yang melantik', 'Tempoh / tahun lantikan', 'Peranan'], proof: 'Surat lantikan editor dan bukti jurnal berindeks SCOPUS.' },
  ik_penilai_jurnal: { needs: ['Tajuk artikel / buku / bab buku', 'Nama penulis', 'Tahun menilai', 'Peranan'], proof: 'Surat jemputan / e-mel penghargaan penilai atau sijil penilai.' },
  ik_penilai_jurnal_scopus: { needs: ['Tajuk artikel', 'Nama penulis', 'Tahun menilai', 'Peranan'], proof: 'Surat jemputan / e-mel penghargaan penilai dan bukti jurnal berindeks SCOPUS.' },
  ik_penilai_buku: { needs: ['Tajuk buku / bab buku', 'Nama penulis', 'Tahun menilai', 'Peranan'], proof: 'Surat jemputan / penghargaan penilai manuskrip.' },
  ik_penilai_kp: { needs: ['Nama institusi yang melantik', 'Peringkat', 'Tempoh / tahun', 'Nama calon yang telah dinilai'], proof: 'Surat lantikan sebagai penilai luar kenaikan pangkat.' },
  ik_tesis: { needs: ['Nama pelajar', 'Tajuk tesis', 'Program pengajian', 'Nama universiti', 'Tahun menilai'], proof: 'Surat lantikan pemeriksa luar tesis.' },
  ik_klinikal: { needs: ['Jenis kertas / peperiksaan', 'Institusi yang melantik', 'Tahun', 'Peranan'], proof: 'Surat lantikan pemeriksa klinikal luar.' },
  ik_ucaptama: { needs: ['Tajuk ucap utama', 'Tempat', 'Tarikh', 'Peringkat (kebangsaan / antarabangsa)'], proof: 'Surat jemputan ucap utama, atur cara program atau sijil.' },
  ik_mooc: { needs: ['Tajuk', 'Program pengajian', 'Tahun diterbitkan'], proof: 'Pautan / bukti MOOC dan bukti penggunaannya dalam pengajaran, dengan anda sebagai ketua.' },
  ik_micro: { needs: ['Tajuk', 'Program pengajian', 'Tahun diterbitkan'], proof: 'Bukti micro-credential dan bukti penggunaannya dalam pengajaran, dengan anda sebagai ketua.' },
  kp_ajk: { needs: COMMITTEE, proof: 'Surat lantikan jawatankuasa (nyatakan peringkat: antarabangsa / kebangsaan / negeri / universiti / fakulti).' },
  kp_pengerusi: { needs: COMMITTEE, proof: 'Surat lantikan sebagai pengerusi jawatankuasa.' },
  kp_pentadbiran: { needs: ['Nama jawatan', 'Tempoh / tarikh lantikan', 'Peranan'], proof: 'Surat lantikan jawatan pentadbiran yang menerima elaun; nyatakan bilangan penggal.' },
  kp_pelajar: { needs: ['Nama program', 'Peranan', 'Tarikh', 'Pencapaian'], proof: 'Laporan program, surat lantikan sebagai ketua dan bukti pencapaian pelajar.' },
};

export const evidenceGuide = {
  activity: (kind) => (ACTIVITY[kind] ? { ...ACTIVITY[kind], code: (ACTIVITY_KINDS[kind] || {}).lampiran, title: (ACTIVITY_KINDS[kind] || {}).label } : null),
  research: (r = {}) => {
    const led = r.role === 'Ketua Penyelidik';
    return { code: lampiranResearch({ role: r.role, grant_source: r.grant_source }), title: `Geran penyelidikan${r.role ? ` (${r.role})` : ''}`, needs: ['Tajuk projek', 'Nilai geran (mata wang seperti dalam surat tawaran)', 'Tempoh / tahun penyelidikan', ...(r.grant_source && !r.grant_source.startsWith('Universiti') ? ['Nama pemberi dana'] : []), ...(led ? ['Nama ahli projek yang lain'] : [])], proof: 'Surat tawaran geran dan bukti pendaftaran projek di PPI (Pusat Pengurusan Penyelidikan dan Inovasi).' };
  },
  publication: (p = {}) => {
    const t = p.type; const co = p.author_role === 'Penulis Bersama';
    const base = t === 'Artikel Jurnal' ? ['Nama artikel / jurnal', 'Tahun terbit', 'Muka surat / issue / volume', 'Kategori / kuartil (Q1–Q4, jika berindeks)', 'Nama indeks', 'Penerbit', 'Peranan']
      : t === 'Buku' ? ['Judul buku', 'Tahun terbit', 'Penerbit'] : t === 'Bab dalam Buku' ? ['Judul bab', 'Nama buku', 'Tahun terbit', 'Muka surat', 'Penerbit']
        : t === 'Prosiding Persidangan' ? ['Tajuk kertas persidangan', 'Nama persidangan', 'Tarikh dan tempat persidangan', 'Muka surat', 'Penerbit', 'Nama indeks (jika ada)']
          : ['Tajuk', 'Tahun / tarikh terbitan', 'Penerbit / media'];
    return { code: lampiranPublication({ type: t, indexing: p.indexing, author_role: p.author_role }), title: t || 'Penerbitan', needs: co ? [...base, 'Nama penulis lain'] : base, proof: 'Salinan penerbitan (halaman tajuk) dan bukti indeks / penerbit bertauliah. Hanya penerbitan berstatus "Diterbitkan" dikira.' };
  },
  consultancy: (c = {}) => ({ code: lampiranConsult({ amount: c.amount, role: c.role }), title: `Perundingan${c.role ? ` (${c.role})` : ''}`, needs: ['Nama rundingan', 'Nama institusi yang melantik', 'Tempoh / tahun lantikan', ...(Number(c.amount) > 0 ? ['Jumlah dana'] : []), ...(c.role === 'Perunding Bersama' ? ['Nama perunding lain'] : [])], proof: 'Surat lantikan / perjanjian perundingan dan bukti pendaftaran di PPI. Hanya perundingan dalam bidang kepakaran yang dikira (Perenggan 2.1(v)).' }),
  hindex: () => ({ code: 'C33', title: 'H-indeks SCOPUS', needs: ['Bukti H-indeks SCOPUS'], proof: 'Tangkapan skrin profil SCOPUS yang menunjukkan H-indeks.' }),
};
