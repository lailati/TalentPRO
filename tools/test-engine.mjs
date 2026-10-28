// Ujian unit enjin kenaikan pangkat: node tools/test-engine.mjs
// Setiap ujian merujuk perenggan Garis Panduan yang diuji.
import { evaluate, disciplineBlocks, iso, addMonths, explainRecords, eligibility, quickReadiness } from '../js/promotion/engine.js';
import { RULES, stepsFor, nextStepId } from '../js/promotion/guideline.js';

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('  ok  ', name); } catch (e) { fail++; console.log('  GAGAL', name, '\n       ', e.message); } };
const eq = (a, b, m) => { if (a !== b) throw new Error(`${m || ''} dijangka ${b}, dapat ${a}`); };
const ok = (c, m) => { if (!c) throw new Error(m || 'dijangka benar'); };

const ID = 'L1';
const lec = (o = {}) => ({ id: ID, grade: 'DS13', grade_since: '2018-01-01', appointed_on: '2012-01-01', confirmed_on: '2013-01-01', field: 'Sains & Teknologi', has_phd: 'Ya', employment: 'Tetap', scopus_h_index: 3, ...o });
let n = 0; const id = () => 'r' + ++n;
const rows = (arr, extra = {}) => arr.map((r) => ({ id: id(), lecturer_id: ID, ...extra, ...r }));
const act = (kind, o = {}) => ({ kind, year: 2023, ...o });
const pub = (o = {}) => ({ type: 'Artikel Jurnal', indexing: 'SCOPUS', author_role: 'Penulis Utama / Corresponding', status: 'Diterbitkan', year: 2023, venue: 'X', ...o });
const grant = (o = {}) => ({ role: 'Ketua Penyelidik', grant_source: 'Industri', amount: 150000, registered_ppi: 'Ya', status: 'Selesai', year: 2022, ...o });
const lppt = rows([{ year: 2023, score: 85 }, { year: 2022, score: 82 }, { year: 2021, score: 81 }]);

console.log('Tatatertib (§2.3.5–2.3.8)');
t('contoh Garis Panduan: amaran 20 Jan 2009 + turun gaji 4 Feb 2009 → tidak layak hingga 3 Feb 2012', () => {
  const b = disciplineBlocks([{ id: 'a', case_no: 'K1', penalty: 'Amaran', date: '2009-01-20' }, { id: 'b', case_no: 'K2', penalty: 'Turun Gaji', date: '2009-02-04' }], new Date('2010-06-01'));
  eq(b.periods.length, 1, 'bilangan tempoh'); eq(iso(b.periods[0].from), '2009-01-20'); eq(iso(b.periods[0].to), '2012-02-03'); ok(b.blockedNow, 'sedang tidak layak pada 2010-06');
});
t('amaran sahaja: 12 bulan berakhir 19 Jan 2010', () => { const b = disciplineBlocks([{ id: 'a', penalty: 'Amaran', date: '2009-01-20' }], new Date('2010-01-20')); eq(iso(b.periods[0].to), '2010-01-19'); ok(!b.blockedNow); });
t('satu pertuduhan: amaran + denda → ambil yang lebih berat (denda 18 bulan) (§2.3.7)', () => {
  const b = disciplineBlocks([{ id: 'a', case_no: 'K1', penalty: 'Amaran', date: '2020-03-01' }, { id: 'b', case_no: 'K1', penalty: 'Denda', date: '2020-03-01' }], new Date('2020-04-01'));
  eq(iso(b.periods[0].to), '2021-08-31');
});
t('akhir bulan: 31 Ogos + 6 bulan tidak melimpah', () => eq(iso(addMonths('2020-08-31', 6)), '2021-02-28'));

console.log('Syarat wajib DS13 (§6.2)');
const ds13 = () => ({
  activities: rows([act('ajar_semester', { semester: '2022/23 S1', workload_met: 'Ya', blended: 'Ya' }), act('sv_psm', { graduated: 'Ya' }), act('sv_psm', { graduated: 'Ya' }), act('sv_psm', { graduated: 'Ya' }), act('sv_psm', { graduated: 'Ya' }), act('sv_psm', { graduated: 'Ya' }), act('kp_ajk', { level: 'Universiti' }), act('kp_ajk', { level: 'Fakulti / Pusat / Akademi' }), act('kp_ajk', { level: 'Kebangsaan' })]),
  research: rows([grant({ amount: 10000 })]), publications: rows([pub()]), lppt_scores: lppt, disciplinary: [],
});
t('semua kriteria DS13 dipenuhi → bersedia', () => { const r = evaluate(lec(), ds13(), { today: new Date('2025-01-01') }); ok(r.ok); eq(r.to, 'DS14', 'gred sasaran DS13 → DS14'); });
t('DS13 (dari DS11): semua dipenuhi', () => { const r = evaluate(lec({ grade: 'DS11' }), ds13(), { today: new Date('2025-01-01') }); eq(r.to, 'DS13'); eq(r.summary.metCount, r.summary.total, 'komponen dipenuhi'); ok(r.summary.ready, 'bersedia'); });
t('grant RM7,000 (S&T) lawan RM5,000 (Sosial)', () => {
  const T = ds13(); T.research = rows([grant({ amount: 6000 })]);
  const st = evaluate(lec({ grade: 'DS11' }), T, { today: new Date('2025-01-01') }); const ss = evaluate(lec({ grade: 'DS11', field: 'Sains Sosial' }), T, { today: new Date('2025-01-01') });
  eq(st.components.find((c) => c.key === 'penyelidikan').status === 'met', false, 'S&T RM6,000 < RM7,000'); eq(ss.components.find((c) => c.key === 'penyelidikan').status, 'met', 'Sosial RM6,000 ≥ RM5,000');
});
t('aktiviti sebelum tetingkap (sebelum masuk DS11) tidak dikira (§6.2 nota b)', () => {
  const T = ds13(); T.publications = rows([pub({ year: 2015 })]);
  const r = evaluate(lec({ grade: 'DS11', grade_since: '2018-01-01' }), T, { today: new Date('2025-01-01') });
  eq(r.components.find((c) => c.key === 'penerbitan').status === 'met', false);
});
t('tanpa PhD: perlu 12 tahun di DS11 (§6.2 nota c); dengan kelayakan profesional 10 tahun (nota e)', () => {
  const a = evaluate(lec({ grade: 'DS11', has_phd: 'Tidak', grade_since: '2018-01-01' }), ds13(), { today: new Date('2025-01-01') }); eq(a.general.find((g) => g.key === 'service').status, 'fail');
  const b = evaluate(lec({ grade: 'DS11', has_phd: 'Tidak', grade_since: '2010-01-01' }), ds13(), { today: new Date('2025-01-01') }); eq(b.general.find((g) => g.key === 'service').status, 'ok');
  const c = evaluate(lec({ grade: 'DS11', has_phd: 'Tidak', has_prof_qual: 'Ya', appointed_on: '2013-01-01' }), ds13(), { today: new Date('2025-01-01') }); eq(c.general.find((g) => g.key === 'service').status, 'ok');
});

console.log('Syarat wajib DS14 (§6.3) — penyeliaan, kesetaraan, penerbitan');
const base14 = () => ({ activities: [], research: [], publications: [], consultancy: [], lppt_scores: lppt, disciplinary: [] });
t('penyeliaan: 1 Sarjana Penyelidikan + 3 Kerja Kursus dipenuhi dengan 2 Sarjana Penyelidikan (1 = 3 KK, §6.7.3)', () => {
  const T = base14(); T.activities = rows([act('sv_msc_res', { role: 'Penyelia Utama', graduated: 'Ya' }), act('sv_msc_res', { role: 'Penyelia Utama', graduated: 'Ya' })]);
  const r = evaluate(lec({ grade: 'DS13' }), T, { today: new Date('2025-01-01') }); eq(r.components.find((c) => c.key === 'penyeliaan').status, 'met');
});
t('penyeliaan: 3 Kerja Kursus TIDAK boleh menggantikan Sarjana Penyelidikan (tidak boleh sebaliknya)', () => {
  const T = base14(); T.activities = rows([...Array(6)].map(() => act('sv_msc_kk', { role: 'Penyelia Utama', graduated: 'Ya' })));
  const r = evaluate(lec({ grade: 'DS13' }), T, { today: new Date('2025-01-01') }); ok(r.components.find((c) => c.key === 'penyeliaan').status !== 'met');
});
t('penyeliaan: 1 PhD (utama) sahaja memenuhi DS14', () => { const T = base14(); T.activities = rows([act('sv_phd', { role: 'Penyelia Utama', graduated: 'Ya' })]); eq(evaluate(lec(), T, { today: new Date('2025-01-01') }).components.find((c) => c.key === 'penyeliaan').status, 'met'); });
t('penyeliaan: pelajar belum bergraduat tidak dikira (DS14)', () => { const T = base14(); T.activities = rows([act('sv_phd', { role: 'Penyelia Utama', graduated: 'Tidak' })]); ok(evaluate(lec(), T, { today: new Date('2025-01-01') }).components.find((c) => c.key === 'penyeliaan').status !== 'met'); });
t('penerbitan DS14 S&T: 10 SCOPUS ATAU 6 + 4 setara', () => {
  const T = base14(); T.publications = rows([...Array(6)].map(() => pub()));
  let r = evaluate(lec({ scopus_h_index: 3 }), T, { today: new Date('2025-01-01') }); ok(r.components.find((c) => c.key === 'penerbitan').status !== 'met', '6 SCOPUS sahaja tidak cukup');
  T.publications.push(...rows([{ type: 'Buku', author_role: 'Penulis Utama / Corresponding', status: 'Diterbitkan', year: 2023 }, { type: 'Bab dalam Buku', author_role: 'Penulis Utama / Corresponding', status: 'Diterbitkan', year: 2023 }, { type: 'Bab dalam Buku', author_role: 'Penulis Utama / Corresponding', status: 'Diterbitkan', year: 2023 }, { type: 'Bab dalam Buku', author_role: 'Penulis Utama / Corresponding', status: 'Diterbitkan', year: 2023 }]));
  r = evaluate(lec({ scopus_h_index: 3 }), T, { today: new Date('2025-01-01') }); eq(r.components.find((c) => c.key === 'penerbitan').status, 'met', '6 SCOPUS + 4 setara');
});
t('penerbitan: 1 buku = 3 SCOPUS membantu mencapai 10', () => {
  const T = base14(); T.publications = rows([...Array(7)].map(() => pub()).concat([{ type: 'Buku', author_role: 'Penulis Utama / Corresponding', status: 'Diterbitkan', year: 2023 }]));
  eq(evaluate(lec({ scopus_h_index: 3 }), T, { today: new Date('2025-01-01') }).components.find((c) => c.key === 'penerbitan').status, 'met');
});
t('penerbitan: H-indeks tidak mencukupi menggagalkan komponen walau artikel banyak', () => {
  const T = base14(); T.publications = rows([...Array(12)].map(() => pub()));
  ok(evaluate(lec({ scopus_h_index: 1 }), T, { today: new Date('2025-01-01') }).components.find((c) => c.key === 'penerbitan').status !== 'met');
});
t('perundingan: tidak dikira jika jenis dikecualikan atau tidak berdaftar PPI (§2.1(v))', () => {
  const T = base14(); const c = (o) => ({ project: 'P', role: 'Perunding Utama', kind: 'Perundingan dalam bidang kepakaran', registered_ppi: 'Ya', amount: 30000, year: 2023, ...o });
  T.consultancy = rows([c({}), c({ kind: 'Penceramah jemputan / kursus dalaman UPNM (tidak dikira)' }), c({ registered_ppi: 'Tidak' })]);
  const r = evaluate(lec(), T, { today: new Date('2025-01-01') }); const node = r.components.find((x) => x.key === 'kepimpinan').node;
  const consult = node.kids.find((k) => k.type === 'any' && k.kids.some((x) => x.kind === 'consultValue' || x.label?.includes('perundingan')));
  ok(consult, 'nod perundingan'); ok(consult.kids.find((k) => k.label.includes('Perunding Utama bernilai')).met, '1 projek utama ≥ RM20,000 dikira (hanya 1 sah)');
});

console.log('Laluan & proses (§5)');
t('DS13 melangkau Penilai Luar; DS14 tidak', () => { ok(!stepsFor('DS13').some((s) => s.id === 'penilai')); ok(stepsFor('DS14').some((s) => s.id === 'penilai')); });
t('Syarahan hanya untuk jawatan Profesor (VK7/VK6/VK5)', () => { ok(!stepsFor('DS14').some((s) => s.id === 'syarahan')); ok(stepsFor('VK7').some((s) => s.id === 'syarahan')); });
t('turutan langkah DS13', () => { eq(nextStepId('DS13', 'saringan'), 'pemilih'); eq(nextStepId('DS14', 'saringan'), 'penilai'); eq(nextStepId('VK7', 'lpu'), 'syarahan'); eq(nextStepId('DS14', 'lpu'), 'berjaya'); });
t('semua peraturan gred x bidang boleh dibina', () => { for (const g of Object.keys(RULES)) for (const f of [0, 1, 2]) { const r = RULES[g](f); ok(Object.keys(r.components).length >= 5, `${g}/${f}`); } });

// ---------- Gred Profesor (VK7/VK6/VK5), pembetulan mengikut teks Garis Panduan, penjelasan rekod ----------
const TODAY = new Date('2025-01-01');
const comp = (r, key) => r.components.find((c) => c.key === key);
const N = (k, f) => [...Array(k)].map((_, i) => f(i));
const consult = (o = {}) => ({ project: 'P', role: 'Perunding Utama', kind: 'Perundingan dalam bidang kepakaran', registered_ppi: 'Ya', amount: 20000, year: 2023, status: 'Selesai', ...o });
const vkBase = () => ({ activities: [], research: [], publications: [], consultancy: [], lppt_scores: lppt, disciplinary: [] });

console.log('VK7 (§6.4) — penuh dan pembetulan Klinikal');
const vk7Full = (extra = {}) => {
  const T = vkBase();
  T.activities = rows([...N(6, (i) => act('ajar_semester', { semester: `S${i}`, workload_met: 'Ya', blended: 'Ya' })), act('sv_phd', { role: 'Penyelia Utama', graduated: 'Ya' }), ...N(2, () => act('sv_msc_res', { role: 'Penyelia Utama', graduated: 'Ya' })),
    act('ik_ucaptama', { level: 'Kebangsaan' }), act('ik_ucaptama', { level: 'Antarabangsa' }), act('kp_pengerusi', { level: 'Kebangsaan' })]);
  T.research = rows(N(5, (i) => grant({ amount: 50000, grant_source: i < 3 ? 'Industri' : 'Universiti (Geran Dalam)' })));
  T.publications = rows(N(30, () => pub()));
  T.consultancy = rows([consult({ amount: 20000 }), consult({ amount: 20000 }), consult({ amount: 20000 }), consult({ role: 'Perunding Bersama' }), consult({ role: 'Perunding Bersama' })]);
  return { ...T, ...extra };
};
const ds14 = (o = {}) => lec({ grade: 'DS14', grade_since: '2018-01-01', appointed_on: '2012-01-01', scopus_h_index: 6, ...o });
t('VK7 S&T: semua kriteria dipenuhi → bersedia', () => { const r = evaluate(ds14(), vk7Full(), { today: TODAY }); eq(r.to, 'VK7'); r.components.forEach((c) => eq(c.status, 'met', c.key)); ok(r.summary.ready, 'bersedia'); });
t('VK7: H-indeks 5 (perlu 6 S&T) menggagalkan penerbitan', () => { const r = evaluate(ds14({ scopus_h_index: 5 }), vk7Full(), { today: TODAY }); ok(comp(r, 'penerbitan').status !== 'met'); });
t('VK7: geran luar kurang daripada 3 menggagalkan penyelidikan (§6.4)', () => { const T = vk7Full(); T.research = rows(N(5, (i) => grant({ amount: 50000, grant_source: i < 2 ? 'Industri' : 'Universiti (Geran Dalam)' }))); ok(comp(evaluate(ds14(), T, { today: TODAY }), 'penyelidikan').status !== 'met'); });
t('VK7 Klinikal: 3 pemeriksa luar tesis ATAU 3 pemeriksa klinikal luar (pembetulan §6.4)', () => {
  const base = vk7Full(); base.activities = base.activities.filter((a) => a.kind !== 'ik_ucaptama');
  const tesis = { ...base, activities: [...base.activities, ...rows(N(3, () => act('ik_tesis', { student: 'X', title: 'T', level: 'Kebangsaan' })))] };
  const klin = { ...base, activities: [...base.activities, ...rows(N(3, () => act('ik_klinikal', { title: 'K', level: 'Kebangsaan' })))] };
  const L = ds14({ field: 'Klinikal' });
  eq(comp(evaluate(L, tesis, { today: TODAY }), 'pengiktirafan').status, 'met', '3 pemeriksa tesis');
  eq(comp(evaluate(L, klin, { today: TODAY }), 'pengiktirafan').status, 'met', '3 pemeriksa klinikal');
  ok(comp(evaluate(ds14({ field: 'Sains Sosial' }), klin, { today: TODAY }), 'pengiktirafan').status !== 'met', 'pemeriksa klinikal tak dikira di luar bidang Klinikal');
});
t('VK7: perundingan berstatus "Dirancang" tidak dikira', () => {
  const T = vk7Full(); T.consultancy = rows([consult({ amount: 20000 }), consult({ amount: 20000 }), consult({ amount: 20000, status: 'Dirancang' }), consult({ role: 'Perunding Bersama' }), consult({ role: 'Perunding Bersama' })]);
  ok(comp(evaluate(ds14(), T, { today: TODAY }), 'kepimpinan').status !== 'met', '2 projek utama sahaja yang sah (perlu 3)');
});

console.log('VK6 (§6.5) — penerbitan setara Penulis Utama sahaja untuk Sosial / Klinikal');
const vk6 = (o = {}) => lec({ grade: 'VK7', grade_since: '2020-01-01', vk7_since: '2020-01-01', appointed_on: '2012-01-01', scopus_h_index: 10, ...o });
const withPubs = (arr) => { const T = vkBase(); T.publications = rows(arr); return T; };
t('VK6 S&T: 23 SCOPUS + 22 penerbitan setara/penulis bersama dikira', () => {
  const T = withPubs([...N(23, () => pub()), ...N(22, () => pub({ author_role: 'Penulis Bersama' }))]);
  eq(comp(evaluate(vk6(), T, { today: TODAY }), 'penerbitan').status, 'met');
});
t('VK6 Sosial: 23 SCOPUS + 12 sebagai Penulis Bersama TIDAK dikira; sebagai Penulis Utama (bab buku) dikira', () => {
  const co = withPubs([...N(23, () => pub()), ...N(12, () => pub({ author_role: 'Penulis Bersama' }))]);
  ok(comp(evaluate(vk6({ field: 'Sains Sosial', scopus_h_index: 7 }), co, { today: TODAY }), 'penerbitan').status !== 'met', 'penulis bersama tak dikira');
  const main = withPubs([...N(23, () => pub()), ...N(12, () => pub({ type: 'Bab dalam Buku', indexing: '' }))]);
  eq(comp(evaluate(vk6({ field: 'Sains Sosial', scopus_h_index: 7 }), main, { today: TODAY }), 'penerbitan').status, 'met');
});
t('VK6 Klinikal: 18 SCOPUS + 5 setara (Penulis Utama) dikira', () => {
  const T = withPubs([...N(18, () => pub()), ...N(5, () => pub({ type: 'Buku', indexing: '' }))]);
  eq(comp(evaluate(vk6({ field: 'Klinikal' }), T, { today: TODAY }), 'penerbitan').status, 'met');
});

console.log('VK5 (§6.6) — 15 penilai jurnal berindeks, 5 daripadanya SCOPUS');
const vk5Lec = (o = {}) => lec({ grade: 'VK6', grade_since: '2022-01-01', vk7_since: '2018-01-01', appointed_on: '2012-01-01', ...o });
t('VK5: 15 penilai jurnal berindeks tanpa SCOPUS tidak memadai; 10 + 5 SCOPUS memadai (pembetulan)', () => {
  const only = { ...vkBase(), activities: rows(N(15, () => act('ik_penilai_jurnal', { title: 'J', level: 'Kebangsaan' }))) };
  const mixed = { ...vkBase(), activities: rows([...N(10, () => act('ik_penilai_jurnal', { title: 'J', level: 'Kebangsaan' })), ...N(5, () => act('ik_penilai_jurnal_scopus', { title: 'J', level: 'Kebangsaan' }))]) };
  const only15 = comp(evaluate(vk5Lec(), only, { today: TODAY }), 'pengiktirafan'); const mix = comp(evaluate(vk5Lec(), mixed, { today: TODAY }), 'pengiktirafan');
  ok(only15.status !== 'met', 'tanpa SCOPUS'); eq(mix.status, 'met', '10 + 5 SCOPUS');
  ok(only15.gaps.some((g) => /SCOPUS/.test(g.text)), 'jurang menyebut SCOPUS');
});
t('VK5: 4 ucaptama dengan sekurang-kurangnya 2 antarabangsa', () => {
  const a = { ...vkBase(), activities: rows(N(4, () => act('ik_ucaptama', { level: 'Kebangsaan' }))) };
  const b = { ...vkBase(), activities: rows([...N(2, () => act('ik_ucaptama', { level: 'Kebangsaan' })), ...N(2, () => act('ik_ucaptama', { level: 'Antarabangsa' }))]) };
  ok(comp(evaluate(vk5Lec(), a, { today: TODAY }), 'pengiktirafan').status !== 'met', 'semua kebangsaan');
  eq(comp(evaluate(vk5Lec(), b, { today: TODAY }), 'pengiktirafan').status, 'met');
});
t('VK6: Syarahan Perdana dan Monograf ialah bendera HR', () => {
  const r0 = evaluate(vk6(), vkBase(), { today: TODAY }); ok(comp(r0, 'syarahan').status !== 'met');
  eq(comp(evaluate(vk6({ syarahan_perdana: 'Ya', monograf: 'Ya' }), vkBase(), { today: TODAY }), 'syarahan').status, 'met');
});

console.log('Syarat umum, ringkasan dan tarikh kelayakan');
t('LPPT: purata < 80% atau kurang 3 tahun gagal; tatatertib aktif gagal', () => {
  const T = ds13(); T.lppt_scores = rows([{ year: 2023, score: 70 }, { year: 2022, score: 75 }, { year: 2021, score: 80 }]);
  eq(evaluate(lec({ grade: 'DS11' }), T, { today: TODAY }).general.find((g) => g.key === 'lppt').status, 'fail');
  T.lppt_scores = rows([{ year: 2023, score: 90 }, { year: 2022, score: 90 }]);
  eq(evaluate(lec({ grade: 'DS11' }), T, { today: TODAY }).general.find((g) => g.key === 'lppt').status, 'fail', 'hanya 2 tahun');
  const D = ds13(); D.disciplinary = rows([{ case_no: 'K', penalty: 'Amaran', date: '2024-06-01' }]);
  eq(evaluate(lec({ grade: 'DS11' }), D, { today: TODAY }).general.find((g) => g.key === 'discipline').status, 'fail');
});
t('quickReadiness: ok=false tanpa gred; ok=true dengan pct dan verdict', () => {
  eq(quickReadiness(lec({ grade: '' }), ds13(), TODAY).ok, false);
  const q = quickReadiness(lec({ grade: 'DS11' }), ds13(), TODAY); ok(q.ok && q.verdict === 'ready' && q.to === 'DS13' && q.pct === 1, 'DS11→DS13 lengkap');
});
t('eligibility: tatatertib, perkhidmatan DS13 (12 tahun / 10 tahun / PhD), LPPT', () => {
  const D = ds13(); D.disciplinary = rows([{ case_no: 'K', penalty: 'Amaran', date: '2024-06-01' }]);
  const e = eligibility(lec({ grade: 'DS11', has_phd: 'Tidak', grade_since: '2018-01-01' }), D, 'DS13', TODAY);
  const by = (k) => e.find((x) => x.key === k);
  eq(by('discipline').status, 'wait'); eq(by('discipline').date, '2025-06-01', 'eligibleFrom = hari selepas 31 Mei 2025');
  eq(by('service').date, '2030-01-01', '12 tahun daripada 2018-01-01'); eq(by('service').status, 'wait');
  eq(eligibility(lec({ grade: 'DS11', has_phd: 'Tidak', has_prof_qual: 'Ya', appointed_on: '2012-01-01' }), ds13(), 'DS13', TODAY).find((x) => x.key === 'service').status, 'ok', '10 tahun sejak 2012');
  eq(eligibility(lec({ grade: 'DS11' }), ds13(), 'DS13', TODAY).find((x) => x.key === 'service').status, 'ok', 'PhD');
  const few = ds13(); few.lppt_scores = rows([{ year: 2023, score: 90 }]);
  ok(/2 tahun/.test(eligibility(lec({ grade: 'DS11' }), few, 'DS13', TODAY).find((x) => x.key === 'lppt').note), 'LPPT: perlu 2 tahun lagi');
});

console.log('Penjelasan rekod (dikira / tidak dikira)');
t('penerbitan: Draf, penulis bersama, jenis tidak dikira, WoS = setara', () => {
  const T = vkBase(); T.publications = rows([pub(), pub({ status: 'Draf' }), pub({ author_role: 'Penulis Bersama' }), pub({ type: 'Laporan Teknikal', indexing: '' }), pub({ indexing: 'WoS / ISI' }), pub({ year: 2010 })]);
  const x = explainRecords(ds14(), T, 'VK7'); const g = (i) => x.filter((r) => r.table === 'publications')[i];
  ok(g(0).counted, 'SCOPUS utama'); ok(!g(1).counted && /Diterbitkan/.test(g(1).reasons[0]), 'Draf'); ok(g(2).counted && g(2).notes.length, 'penulis bersama dikira bersyarat');
  ok(!g(3).counted, 'laporan teknikal'); ok(g(4).counted && /WoS/.test(g(4).notes[0]), 'WoS'); ok(!g(5).counted && /tetingkap/.test(g(5).reasons[0]), 'luar tetingkap (sebelum 2012)');
});
t('penyelidikan dan perundingan: PPI, Dirancang, jenis dikecualikan', () => {
  const T = vkBase(); T.research = rows([grant(), grant({ registered_ppi: 'Tidak' }), grant({ status: 'Dirancang' })]);
  T.consultancy = rows([consult(), consult({ registered_ppi: 'Tidak' }), consult({ kind: 'Penceramah jemputan / kursus dalaman UPNM (tidak dikira)' }), consult({ status: 'Dirancang' })]);
  const x = explainRecords(ds14(), T, 'VK7'); const r = x.filter((q) => q.table === 'research'), c = x.filter((q) => q.table === 'consultancy');
  ok(r[0].counted && !r[1].counted && /PPI/.test(r[1].reasons.join()) && !r[2].counted, 'penyelidikan');
  ok(c[0].counted && !c[1].counted && !c[2].counted && /tidak dikira/.test(c[2].reasons.join()) && !c[3].counted, 'perundingan');
});
t('aktiviti: pelajar belum bergraduat, Penyelia Bersama Sarjana, DS13 "terlibat", beban tugas', () => {
  const T = vkBase(); T.activities = rows([act('sv_phd', { role: 'Penyelia Utama', graduated: 'Ya' }), act('sv_phd', { role: 'Penyelia Utama', graduated: 'Tidak' }), act('sv_msc_res', { role: 'Penyelia Bersama', graduated: 'Ya' }), act('ajar_semester', { workload_met: 'Tidak', blended: 'Ya' })]);
  const x = explainRecords(ds14(), T, 'VK7'); ok(x[0].counted && !x[1].counted && /bergraduat/.test(x[1].reasons[0]) && !x[2].counted && /Utama/.test(x[2].reasons[0]) && !x[3].counted, 'VK7');
  const d = explainRecords(lec({ grade: 'DS11' }), T, 'DS13'); ok(d[1].counted && /terlibat/.test(d[1].notes[0]), 'DS13: belum bergraduat dikira sebagai terlibat');
});
t('explainRecords selaras dengan evaluate: bilangan SCOPUS utama sama', () => {
  const T = vkBase(); T.publications = rows([...N(8, () => pub()), pub({ status: 'Draf' }), pub({ year: 2005 })]);
  const L = ds14({ scopus_h_index: 6 }); const ev = evaluate(L, T, { today: TODAY }); const ex = explainRecords(L, T, 'VK7').filter((r) => r.table === 'publications' && r.counted).length;
  eq(ex, 8); ok(/8 artikel SCOPUS/.test(JSON.stringify(ev.components.find((c) => c.key === 'penerbitan').node)), 'evaluate juga menghitung 8');
});

console.log(`\n${pass} lulus, ${fail} gagal`);
process.exit(fail ? 1 : 0);
