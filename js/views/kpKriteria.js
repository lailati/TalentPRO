// Senarai semak kriteria (pensyarah): setiap kriteria bagi gred sasaran dengan status hidup, rekod yang dikira / tidak dikira beserta sebab,
// kod Lampiran bukti, dan bila pensyarah layak. Pilih gred sasaran lain untuk pratonton (tidak boleh dimohon).
import { store, myLecturer } from '../api.js';
import { html, mount, $, icon, fmtDate } from '../util.js';
import { pageHead } from './_ui.js';
import { helpBtn } from '../help.js';
import { evaluate, explainRecords, eligibility } from '../promotion/engine.js';
import { GRADES, NEXT_GRADE, FIELDS, gradeLabel } from '../promotion/guideline.js';
import { ring, ladder, generalList, suggestHref, verdictTone } from './kpShared.js';

const num = (v) => Number(v) || 0;

function leaf(n) {
  return html`<li><span class="m ${n.met ? 'y' : 'n'}">${n.met ? icon('check', 13) : ''}</span><span>${n.label}<span class="d">${n.detail}</span>${(n.codes || []).length ? html`<span class="d">Lampiran: ${n.codes.map((c) => html`<span class="badge mute">${c}</span> `)}</span>` : ''}${!n.met && n.gap ? html`<span class="g">Perlu: ${n.gap}${n.suggest ? html` · <a href="${suggestHref(n.suggest)}">${n.suggest.text}</a>` : ''}</span>` : ''}</span></li>`;
}
function tree(n) {
  if (n.type === 'leaf') return html`<ul class="crit">${leaf(n)}</ul>`;
  if (n.type === 'all') return html`${n.kids.map((k) => tree(k))}`;
  return html`<div class="or-box"><b>${n.label || 'Pilih satu'}${n.met ? ' — dipenuhi' : ' — pilih satu cara'}${helpBtn('or_branch')}</b>${n.kids.map((k) => html`<div class="alt-branch">${k === n.best ? html`<span class="badge info">Paling hampir</span>` : ''}${tree(k)}</div>`)}</div>`;
}

function recTable(rows) {
  if (!rows.length) return html`<p class="muted small">Belum ada rekod dalam bahagian ini. Gunakan butang "Tambah rekod" pada kriteria di atas.</p>`;
  const sorted = [...rows].sort((a, b) => (b.counted - a.counted) || (num(b.year) - num(a.year)));
  return html`<div class="tbl-wrap"><table><thead><tr><th>Rekod saya</th><th>Tahun</th><th>Lampiran</th><th>Status</th><th>Bukti</th><th></th></tr></thead><tbody>${sorted.map((r) => html`<tr class="${r.counted ? '' : 'dim'}"><td>${r.title}${r.reasons.length ? html`<br><small class="faint">${r.reasons.join(' · ')}</small>` : ''}${r.notes.length ? html`<br><small class="muted">${r.notes.join(' · ')}</small>` : ''}</td><td>${r.year || '—'}</td><td>${r.code ? html`<span class="badge mute">${r.code}</span>` : '—'}</td><td>${r.counted ? html`<span class="badge ok">Dikira</span>` : html`<span class="badge warn">Tidak dikira</span>`}</td><td>${r.hasEvidence ? html`<span class="badge ok">Ada</span>` : html`<span class="badge mute">Tiada</span>`}</td><td><a class="icon-btn" href="#/${r.table}?edit=${r.id}" aria-label="Sunting rekod ${r.title}" title="Sunting rekod">${icon('edit', 18)}</a></td></tr>`)}</tbody></table></div>`;
}

export async function render(root, { to, field }) {
  const lec = myLecturer();
  if (!lec) { mount(root, html`<div class="empty card">${icon('alert', 36)}<h3>Profil pensyarah tidak ditemui</h3></div>`); return; }
  const fi = GRADES.findIndex((g) => g.code === lec.grade);
  const targets = fi >= 0 ? GRADES.slice(fi + 1) : [];
  const next = NEXT_GRADE[lec.grade];
  const back = html`<a class="btn ghost" href="#/kp">${icon('back', 18)} Kenaikan Pangkat Saya</a>`;
  if (!next) {
    mount(root, html`${pageHead('Senarai Semak Kriteria', 'Kriteria Garis Panduan bagi gred sasaran anda.', back, '', 'kp_kriteria')}<div class="card empty">${icon('info', 40)}<h3>${lec.grade ? 'Anda sudah di gred tertinggi' : 'Gred anda belum ditetapkan'}</h3><p>Gred, tarikh lantikan dan pengesahan ialah data Pejabat Pendaftar yang dimasukkan oleh Pegawai KP (HR).</p></div>`);
    return;
  }
  const target = targets.some((g) => g.code === to) ? to : next;
  const fld = FIELDS.includes(field) ? field : (lec.field || FIELDS[0]);
  const preview = target !== next;
  const today = new Date();
  const ev = evaluate(lec, store, { today, to: target, field: fld });
  if (!ev.ok) { mount(root, html`${pageHead('Senarai Semak Kriteria', '', back, '', 'kp_kriteria')}<div class="card empty">${icon('info', 40)}<h3>${ev.message}</h3></div>`); return; }
  const recs = explainRecords(lec, store, target, { field: fld });
  const elig = eligibility(lec, store, target, today);
  const s = ev.summary;
  const counted = recs.filter((r) => r.counted), noProof = counted.filter((r) => !r.hasEvidence);

  mount(root, html`
    ${pageHead('Senarai Semak Kriteria', `${gradeLabel(ev.from)} → ${gradeLabel(ev.to)}${preview ? ' (pratonton)' : ''}`, back, '', 'kp_kriteria')}
    <section class="card" style="margin-bottom:16px"><div class="toolbar" style="margin:0">
      <label class="small" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span>Gred sasaran</span><select class="input" id="to" style="max-width:300px">${targets.map((g) => html`<option value="${g.code}" ${g.code === target ? 'selected' : ''}>${g.name} (${g.short})${g.code === next ? ' — gred seterusnya' : ' — pratonton'}</option>`)}</select></label>
      <label class="small" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span>Bidang</span><select class="input" id="fld" style="max-width:240px">${FIELDS.map((f) => html`<option ${f === fld ? 'selected' : ''}>${f}</option>`)}</select></label>
      ${helpBtn('kp_target')}
    </div>${preview ? html`<p class="small" style="margin-top:10px"><span class="badge info">Pratonton</span> Anda sedang melihat kriteria gred yang lebih tinggi daripada gred seterusnya. Ia tidak boleh dimohon; permohonan hanya bagi gred ${gradeLabel(next)}.</p>` : ''}</section>
    ${ladder(ev.from, ev.to)}
    <section class="kp-hero" aria-label="Ringkasan kesediaan">${ring(s.pct, 'kesediaan')}<div class="stack" style="gap:10px;position:relative;z-index:1"><div><h2>${s.verdictText}</h2><p>${s.metCount} daripada ${s.total} bahagian dipenuhi. ${counted.length} rekod dikira daripada ${recs.length}.${noProof.length ? ` ${noProof.length} rekod yang dikira belum mempunyai dokumen bukti.` : ''}</p></div><p class="small" style="opacity:.8">${ev.window.note || ''}${ev.window.start ? ` (mulai ${ev.window.start})` : ''} ${helpBtn('window')}</p>${ev.after ? html`<p class="small" style="opacity:.8">${ev.after}</p>` : ''}</div></section>

    <section class="card" style="margin-top:18px"><h3>${icon('target', 18)} Bila saya layak? ${helpBtn('kp_eligibility')}</h3><div>${elig.map((e) => html`<div class="gc"><span class="si ${e.status === 'ok' ? 'ok' : e.status === 'wait' ? 'fail' : 'info'}">${icon(e.status === 'ok' ? 'check' : e.status === 'wait' ? 'x' : 'info', 15)}</span><div><b>${e.label}${e.date ? html` <span class="badge ${e.status === 'ok' ? 'ok' : 'warn'}">${fmtDate(e.date)}</span>` : ''}</b><small>${e.note}</small></div></div>`)}</div></section>

    ${ev.components.map((c) => {
      const tone = { met: 'ok', partial: 'warn', unmet: 'danger' }[c.status], txt = { met: 'Dipenuhi', partial: 'Sebahagian', unmet: 'Belum' }[c.status];
      const rows = recs.filter((r) => r.comp === c.key);
      return html`<section class="card" style="margin-top:18px" id="c-${c.key}" aria-label="${c.label}"><div class="comp-head"><span class="ci ${c.status}">${icon(c.icon || 'file', 22)}</span><h3 style="margin:0">${c.label}${c.help ? helpBtn(c.help, c.label) : ''}</h3><span class="badge ${tone}">${txt}</span></div><div class="bar-mini ${c.status === 'met' ? 'ok' : ''}" style="margin:10px 0" role="progressbar" aria-valuenow="${Math.round(c.pct * 100)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.round(c.pct * 100)}%"></i></div>${tree(c.node)}${c.key !== 'syarahan' ? html`<h4 style="margin:16px 0 6px">Rekod saya bagi bahagian ini ${helpBtn('kp_records_why')}</h4>${recTable(rows)}` : ''}</section>`;
    })}

    <section class="card" style="margin-top:18px"><h3>Syarat umum</h3><p class="small muted" style="margin:-6px 0 8px">Markah LPPT, tatatertib dan maklumat perkhidmatan dimasukkan oleh Pegawai KP (HR); yang lain disahkan oleh Pejabat Pendaftar / Fakulti semasa permohonan.</p>${generalList(ev.general)}</section>`);

  const go = () => { location.hash = '#/kp/kriteria?' + new URLSearchParams({ to: $('#to', root).value, field: $('#fld', root).value }); };
  $('#to', root).onchange = go; $('#fld', root).onchange = go;
}
