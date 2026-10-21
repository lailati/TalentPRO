// Dashboard Pegawai Kenaikan Pangkat (HR): saluran permohonan, calon berpotensi, amaran dan statistik keputusan.
import * as api from '../api.js';
import { store, lecturerOf } from '../api.js';
import { html, mount, $, $$, icon, toast, avatar, fmtDate, download, toCsv, barChart, donut } from '../util.js';
import { pageHead, dataTable } from './_ui.js';
import { quickReadiness, disciplineBlocks } from '../promotion/engine.js';
import { NEXT_GRADE, GRADE, GRADES, STATUS_LABEL } from '../promotion/guideline.js';
import { ACTIVE_STATUSES, appealInfo } from '../promotion/workflow.js';
import { statusBadge, verdictTone } from './kpShared.js';

const STAGES = ['fakulti', 'pendaftar', 'saringan', 'penilai', 'pemilih', 'lpu', 'syarahan', 'rayuan'];
const SHORT = { fakulti: 'Fakulti', pendaftar: 'Pendaftar', saringan: 'Saringan', penilai: 'Penilai', pemilih: 'Pemilih', lpu: 'LPU', syarahan: 'Syarahan', rayuan: 'Rayuan' };
const STALE_DAYS = 14;      // melebihi ini di satu langkah = tertunggak
const APPEAL_WARN_DAYS = 7; // amaran apabila tempoh rayuan hampir tamat
const OK = ['berjaya', 'rayuan_berjaya'], NO = ['tidak_berjaya', 'rayuan_ditolak'];
const SERVICE_REQ = [['grade', 'Gred'], ['grade_since', 'Tarikh masuk gred'], ['appointed_on', 'Tarikh lantikan'], ['confirmed_on', 'Tarikh pengesahan'], ['field', 'Bidang']];

const daysAt = (a) => Math.max(0, Math.floor((Date.now() - new Date(a.step_since || a.updated_at)) / 864e5));
const gShort = (c) => (GRADE[c] ? GRADE[c].short : c || '—');
const yearOf = (a) => String(a.decision_date || a.submitted_at || a.created_at || '').slice(0, 4);
const deptOf = (a) => (lecturerOf(a.lecturer_id) || {}).department || '—';
const nameOf = (id) => (lecturerOf(id) || {}).full_name || '—';

const person = (l, href) => html`<a class="row" style="gap:8px;flex-wrap:nowrap;color:inherit;white-space:nowrap" href="${href}">${avatar(l, 28)}<span>${l.full_name}</span></a>`;

export async function render(root) {
  const apps = store.promotion_applications;
  const inProc = apps.filter((a) => STAGES.includes(a.status));
  const stale = inProc.filter((a) => daysAt(a) > STALE_DAYS);
  const year = String(new Date().getFullYear());
  const appealOpen = apps.filter((a) => a.status === 'rayuan' || (a.status === 'tidak_berjaya' && appealInfo(a).can));
  const k = { proc: inProc.length, stale: stale.length, appeal: appealOpen.length, ok: apps.filter((a) => OK.includes(a.status) && String(a.decision_date || '').startsWith(year)).length, no: apps.filter((a) => NO.includes(a.status) && String(a.decision_date || '').startsWith(year)).length };

  // calon berpotensi (dikira sekali; agak berat)
  const busy = new Set(apps.filter((a) => ACTIVE_STATUSES.includes(a.status)).map((a) => a.lecturer_id));
  const cands = store.lecturers.filter((l) => l.grade && NEXT_GRADE[l.grade] && !busy.has(l.id)).map((l) => ({ id: l.id, lecturer_id: l.id, l, q: quickReadiness(l, store, new Date()) })).filter((c) => c.q.ok && ['ready', 'conditions', 'near'].includes(c.q.verdict)).sort((a, b) => b.q.pct - a.q.pct);
  const depts = [...new Set(store.lecturers.map((l) => l.department).filter(Boolean))].sort();
  const cf = { dept: '', to: '' };

  // amaran
  const today = new Date();
  const appealSoon = apps.filter((a) => a.status === 'tidak_berjaya' && appealInfo(a).can && appealInfo(a).daysLeft <= APPEAL_WARN_DAYS).map((a) => ({ id: a.id, who: a.lecturer_id, text: `Rayuan tamat ${fmtDate(appealInfo(a).deadline)} (${appealInfo(a).daysLeft} hari lagi)`, href: '#/kp-admin/' + a.id }));
  const staleItems = stale.sort((a, b) => daysAt(b) - daysAt(a)).map((a) => ({ id: a.id, who: a.lecturer_id, text: `${STATUS_LABEL[a.status] || a.status}: ${daysAt(a)} hari di langkah ini`, href: '#/kp-admin/' + a.id }));
  const blocked = store.lecturers.map((l) => ({ l, d: disciplineBlocks(store.disciplinary.filter((r) => r.lecturer_id === l.id), today) })).filter((x) => x.d.blockedNow).map((x) => ({ id: x.l.id, who: x.l.id, text: `Tidak layak sehingga ${fmtDate(x.d.eligibleFrom instanceof Date ? x.d.eligibleFrom.toISOString() : x.d.eligibleFrom)}${busy.has(x.l.id) ? ' (ada permohonan aktif)' : ''}`, href: '#/lecturer/' + x.l.id }));
  const incomplete = store.lecturers.map((l) => ({ l, miss: SERVICE_REQ.filter(([f]) => !l[f]).map(([, t]) => t) })).filter((x) => x.miss.length).map((x) => ({ id: x.l.id, who: x.l.id, text: `Tiada: ${x.miss.join(', ')}`, href: '#/lecturer/' + x.l.id }));
  const noLppt = store.lecturers.filter((l) => l.grade && !store.lppt_scores.some((r) => r.lecturer_id === l.id)).map((l) => ({ id: l.id, who: l.id, text: 'Belum ada markah LPPT', href: '#/lppt_scores?lecturer=' + l.id }));
  const alerts = [['Rayuan hampir tamat', 'warn', appealSoon], ['Tertunggak di satu langkah', 'warn', staleItems], ['Disekat tatatertib', 'danger', blocked], ['Maklumat perkhidmatan tidak lengkap', 'info', incomplete], ['Belum ada markah LPPT', 'info', noLppt]];
  const alertCard = ([title, tone, items]) => html`<section class="card"><h3>${title} <span class="badge ${items.length ? tone : 'ok'}">${items.length}</span></h3>${items.length ? html`<ul class="act-list">${items.slice(0, 6).map((i) => html`<li><span><a href="${i.href}"><b>${nameOf(i.who)}</b></a><br><small class="faint">${i.text}</small></span></li>`)}</ul>${items.length > 6 ? html`<p class="small muted">dan ${items.length - 6} lagi.</p>` : ''}` : html`<p class="muted small">Tiada.</p>`}</section>`;

  const gradeOpts = GRADES.filter((g) => g.code !== 'DS11').map((g) => g.code);
  const stOpts = (key, vals) => [...new Set(vals)].filter(Boolean).sort();
  const years = stOpts('y', apps.map(yearOf));
  const sf = { year: '', dept: '', to: '' };

  mount(root, html`
    ${pageHead('Dashboard Pegawai Kenaikan Pangkat', 'Gambaran lengkap proses kenaikan pangkat staf akademik FSTP untuk tindakan seterusnya.', html`<a class="btn primary" href="#/kp-admin">${icon('target', 18)} Papan Kerja</a><button class="btn ghost" id="print">${icon('print', 18)} Cetak</button>`, '', 'hr_dashboard')}
    <div class="kpi-row">
      <div class="kpi ${k.proc ? 'hot' : ''}"><b>${k.proc}</b><span>Dalam proses</span></div>
      <div class="kpi ${k.stale ? 'hot' : ''}"><b>${k.stale}</b><span>Tertunggak (&gt; ${STALE_DAYS} hari)</span></div>
      <div class="kpi"><b>${k.appeal}</b><span>Rayuan (dalam tempoh / disemak)</span></div>
      <div class="kpi"><b>${k.ok}</b><span>Berjaya ${year}</span></div>
      <div class="kpi"><b>${k.no}</b><span>Tidak berjaya ${year}</span></div>
      <div class="kpi"><b>${cands.length}</b><span>Calon berpotensi</span></div>
    </div>

    <div class="grid g2">
      <section class="card"><h3>Saluran permohonan mengikut peringkat</h3>${barChart(STAGES.map((s) => ({ label: SHORT[s], value: apps.filter((a) => a.status === s).length })), { height: 220 })}<p class="small faint" style="margin-top:6px">Bilangan permohonan di setiap langkah (Draf: ${apps.filter((a) => a.status === 'draf').length}).</p></section>
      <section class="card"><h3>Menunggu tindakan <a class="small" href="#/kp-admin">Lihat semua →</a></h3>
        ${inProc.length ? html`<div class="tbl-wrap"><table><thead><tr><th>Calon</th><th>Laluan</th><th>Langkah</th><th>Hari</th><th></th></tr></thead><tbody>${[...inProc].sort((a, b) => daysAt(b) - daysAt(a)).slice(0, 8).map((a) => html`<tr><td>${nameOf(a.lecturer_id)}</td><td>${gShort(a.from_grade)} → <b>${gShort(a.to_grade)}</b></td><td>${statusBadge(a.status)}</td><td>${daysAt(a)}${daysAt(a) > STALE_DAYS ? html` <span class="badge warn">Lama</span>` : ''}</td><td><a class="btn primary sm" href="#/kp-admin/${a.id}">Tindakan</a></td></tr>`)}</tbody></table></div>` : html`<p class="muted">Tiada permohonan dalam proses.</p>`}
      </section>
    </div>

    <h2 class="sec-h" style="margin:22px 0 10px;font-size:18px;font-weight:800">Amaran dan tarikh akhir</h2>
    <div class="grid g3">${alerts.map(alertCard)}</div>

    <h2 class="sec-h" style="margin:22px 0 10px;font-size:18px;font-weight:800">Calon berpotensi dan kesediaan</h2>
    <div class="grid g-2-1" style="align-items:start">
      <section class="card"><div class="toolbar no-print" style="margin-bottom:10px"><select class="input" id="cd" style="max-width:220px" aria-label="Tapis jabatan"><option value="">Semua jabatan</option>${depts.map((d) => html`<option>${d}</option>`)}</select><select class="input" id="ct" style="max-width:220px" aria-label="Tapis gred sasaran"><option value="">Semua gred sasaran</option>${gradeOpts.map((g) => html`<option value="${g}">${gShort(g)}</option>`)}</select></div><div id="ctbl"></div></section>
      <section class="card"><h3>Calon mengikut jabatan</h3>${cands.length ? donut(depts.map((d) => ({ label: d, value: cands.filter((c) => c.l.department === d).length })).filter((x) => x.value), { center: cands.length, sub: 'Calon' }) : html`<p class="muted">Belum ada calon.</p>`}</section>
    </div>

    <h2 class="sec-h" style="margin:22px 0 10px;font-size:18px;font-weight:800">Statistik keputusan</h2>
    <div class="toolbar no-print"><select class="input" id="sy" style="max-width:160px" aria-label="Tahun"><option value="">Semua tahun</option>${years.map((y) => html`<option>${y}</option>`)}</select><select class="input" id="sd" style="max-width:220px" aria-label="Jabatan"><option value="">Semua jabatan</option>${depts.map((d) => html`<option>${d}</option>`)}</select><select class="input" id="sg" style="max-width:220px" aria-label="Gred sasaran"><option value="">Semua gred sasaran</option>${gradeOpts.map((g) => html`<option value="${g}">${gShort(g)}</option>`)}</select><button class="btn ghost" id="csv">${icon('download', 18)} Eksport CSV</button></div>
    <div id="stats"></div>`);

  // ---- calon berpotensi ----
  const candRows = () => cands.filter((c) => (!cf.dept || c.l.department === cf.dept) && (!cf.to || c.q.to === cf.to));
  const ct = dataTable($('#ctbl', root), {
    columns: [
      { label: 'Pensyarah', render: (r) => person(r.l, '#/lecturer/' + r.l.id), sort: (r) => r.l.full_name },
      { label: 'Jabatan', render: (r) => r.l.department || '—', sort: (r) => r.l.department || '' },
      { label: 'Laluan', render: (r) => html`${gShort(r.l.grade)} → <b>${gShort(r.q.to)}</b>`, sort: (r) => r.q.to },
      { label: 'Kesediaan', render: (r) => html`<div class="row" style="gap:8px;flex-wrap:nowrap"><div class="bar-mini ${r.q.verdict === 'ready' ? 'ok' : ''}" style="width:80px"><i style="width:${Math.round(r.q.pct * 100)}%"></i></div><b>${Math.round(r.q.pct * 100)}%</b></div>`, sort: (r) => r.q.pct },
      { label: 'Jurang / status', render: (r) => html`<span class="badge ${verdictTone[r.q.verdict]}">${r.q.text}</span>` },
    ],
    rows: candRows, searchText: (r) => r.l.full_name,
    actions: (r) => html`<button class="btn outline sm no-print" data-new="${r.lecturer_id}">${icon('plus', 15)} Cipta draf</button>`,
    empty: { title: 'Tiada calon hampir bersedia', text: 'Pensyarah yang memenuhi sekurang-kurangnya ~85% kriteria dipaparkan di sini. Pastikan maklumat perkhidmatan (gred, tarikh) lengkap.' },
  });
  $('#cd', root).onchange = (e) => { cf.dept = e.target.value; ct.refresh(); };
  $('#ct', root).onchange = (e) => { cf.to = e.target.value; ct.refresh(); };

  // ---- statistik keputusan ----
  const statApps = () => apps.filter((a) => a.status !== 'draf' && (!sf.year || yearOf(a) === sf.year) && (!sf.dept || deptOf(a) === sf.dept) && (!sf.to || a.to_grade === sf.to));
  const outcome = (a) => (OK.includes(a.status) ? 'Berjaya' : NO.includes(a.status) ? 'Tidak berjaya' : a.status === 'ditarik_balik' ? 'Ditarik balik' : 'Dalam proses');
  const drawStats = () => {
    const rows = statApps(); const cnt = (f) => rows.filter(f).length;
    const byYear = [...new Set(rows.map(yearOf))].sort().map((y) => { const r = rows.filter((a) => yearOf(a) === y); return { y, ok: r.filter((a) => OK.includes(a.status)).length, no: r.filter((a) => NO.includes(a.status)).length, wd: r.filter((a) => a.status === 'ditarik_balik').length, proc: r.filter((a) => STAGES.includes(a.status)).length, n: r.length }; });
    const dsel = [...new Set(rows.map(deptOf))].sort();
    mount($('#stats', root), html`
      <div class="grid g2">
        <section class="card"><h3>Keputusan</h3>${rows.length ? donut([{ label: 'Berjaya', value: cnt((a) => OK.includes(a.status)), color: 'var(--ok)' }, { label: 'Tidak berjaya', value: cnt((a) => NO.includes(a.status)), color: 'var(--danger)' }, { label: 'Ditarik balik', value: cnt((a) => a.status === 'ditarik_balik'), color: '#64748b' }, { label: 'Dalam proses', value: cnt((a) => STAGES.includes(a.status)), color: 'var(--blue)' }].filter((d) => d.value), { center: rows.length, sub: 'Permohonan' }) : html`<p class="muted">Tiada data untuk penapis ini.</p>`}</section>
        <section class="card"><h3>Berjaya mengikut jabatan</h3>${dsel.length ? barChart(dsel.map((d) => ({ label: d, value: rows.filter((a) => deptOf(a) === d && OK.includes(a.status)).length })), { height: 200 }) : html`<p class="muted">Tiada data.</p>`}</section>
      </div>
      <section class="card" style="margin-top:18px"><h3>Mengikut tahun</h3>${byYear.length ? html`<div class="tbl-wrap"><table><thead><tr><th>Tahun</th><th>Berjaya</th><th>Tidak berjaya</th><th>Ditarik balik</th><th>Dalam proses</th><th>Jumlah</th></tr></thead><tbody>${byYear.map((r) => html`<tr><td>${r.y}</td><td>${r.ok}</td><td>${r.no}</td><td>${r.wd}</td><td>${r.proc}</td><td><b>${r.n}</b></td></tr>`)}</tbody></table></div>` : html`<p class="muted">Tiada data.</p>`}</section>`);
  };
  drawStats();
  [['#sy', 'year'], ['#sd', 'dept'], ['#sg', 'to']].forEach(([id, key]) => ($(id, root).onchange = (e) => { sf[key] = e.target.value; drawStats(); }));
  $('#csv', root).onclick = () => {
    const rows = statApps();
    download('permohonan-kenaikan-pangkat.csv', toCsv(['Calon', 'No. Staf', 'Jabatan', 'Dari', 'Ke', 'Langkah/keputusan', 'Keputusan', 'Dihantar', 'Tarikh keputusan', 'Berkuat kuasa'], rows.map((a) => [nameOf(a.lecturer_id), (lecturerOf(a.lecturer_id) || {}).staff_id, deptOf(a), gShort(a.from_grade), gShort(a.to_grade), STATUS_LABEL[a.status] || a.status, outcome(a), a.submitted_at ? a.submitted_at.slice(0, 10) : '', a.decision_date || '', a.effective_date || ''])));
  };
  $('#print', root).onclick = () => window.print();

  const onClick = async (e) => {
    const b = e.target.closest('[data-new]'); if (!b) return; b.disabled = true;
    try { const a = await api.promoSave({ lecturer_id: b.dataset.new }); toast('Draf dicipta untuk calon.'); location.hash = '#/kp-admin/' + a.id; } catch (er) { toast(er.message, 'err'); b.disabled = false; }
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}
