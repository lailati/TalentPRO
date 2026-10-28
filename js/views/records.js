// Generic CRUD page driven by ENTITIES (expertise, research, publications, ... documents).
import * as api from '../api.js';
import { store, lecturerOf, myLecturer } from '../api.js';
import { html, mount, $, icon, toast, openDrawer, confirmDialog, download, toCsv, avatar } from '../util.js';
import { ENTITIES } from '../schema.js';
import { fieldHtml, readForm, busy, dataTable, pageHead, searchBox, cell, saveDownload, debounce, formFields, wireShow } from './_ui.js';
import { helpBtn } from '../help.js';
import { evidenceGuide } from '../promotion/lampiran-data.js';

export async function render(root, { entity, lecturer: lecFilter, add, edit, ...query }) {
  // `admin` di sini = pegawai HR (melihat semua pensyarah). Rekod bukti ialah baca sahaja bagi HR; hanya jadual `adminWrite` (LPPT, tatatertib) boleh disunting.
  const E = ENTITIES[entity]; const admin = store.me.role === 'hr'; const canWrite = !admin || !!E.adminWrite;
  const me = myLecturer();
  const state = { lec: '' };
  const rowsFn = () => store[E.table].filter((r) => !state.lec || r.lecturer_id === state.lec);
  const lecCol = admin ? [{ label: 'Pensyarah', render: (r) => { const l = lecturerOf(r.lecturer_id); return l ? html`<a class="row" style="gap:8px;flex-wrap:nowrap;color:inherit;white-space:nowrap" href="#/lecturer/${l.id}">${avatar(l, 26)}<span>${l.full_name}</span></a>` : '—'; }, sort: (r) => (lecturerOf(r.lecturer_id) || {}).full_name || '' }] : [];
  // lajur 'Bukti': rekod yang dikira sebaiknya mempunyai dokumen sokongan (Lampiran 1)
  const proofCol = E.fields.some((f) => f.name === 'document_id') && entity !== 'documents' ? [{ label: 'Bukti', render: (r) => (r.document_id ? html`<span class="badge ok">Ada</span>` : html`<span class="badge mute">Tiada</span>`), sort: (r) => (r.document_id ? 1 : 0) }] : [];
  const columns = [...lecCol, ...E.columns, ...proofCol];
  const docBtn = (r) => {
    const d = entity === 'documents' ? r : api.docOf(r.document_id);
    return d ? html`<button class="icon-btn" data-dl="${d.id}" aria-label="Muat turun fail untuk ${E.title(r)}" title="Muat turun">${icon('download', 18)}</button>` : '';
  };

  mount(root, html`
    ${pageHead(admin ? E.plural : E.mine, admin ? `Rekod ${E.plural.toLowerCase()} semua pensyarah${canWrite ? '.' : ' (paparan sahaja; pensyarah memasukkan rekod ini sendiri).'}` : `Urus rekod ${E.plural.toLowerCase()} anda.`,
      html`<button class="btn ghost" id="exp">${icon('download', 18)} Eksport CSV</button>${canWrite ? html`<button class="btn primary" id="add">${icon('plus', 18)} Tambah ${E.singular}</button>` : ''}`, '', E.helpKey || 'records')}
    <div class="toolbar">${searchBox('q', `Cari ${E.plural.toLowerCase()}…`)}${admin ? html`<select class="input" id="lf" style="max-width:260px" aria-label="Tapis mengikut pensyarah"><option value="">Semua pensyarah</option>${[...store.lecturers].sort((a, b) => a.full_name.localeCompare(b.full_name)).map((l) => html`<option value="${l.id}">${l.full_name}</option>`)}</select>` : ''}</div>
    <div id="tbl"></div>`);

  const tbl = dataTable($('#tbl', root), {
    columns, rows: rowsFn,
    searchText: (r) => [E.title(r), ...E.columns.map((c) => (c.fmt === 'category' ? (api.categoryOf(r[c.key]) || {}).name : r[c.key])), (lecturerOf(r.lecturer_id) || {}).full_name].join(' '),
    actions: (r) => html`${docBtn(r)}${canWrite ? html`<button class="icon-btn" data-edit="${r.id}" aria-label="Kemas kini ${E.title(r)}" title="Kemas kini">${icon('edit', 18)}</button><button class="icon-btn del" data-del="${r.id}" aria-label="Padam ${E.title(r)}" title="Padam">${icon('trash', 18)}</button>` : ''}`,
    empty: canWrite ? { title: `Belum ada rekod ${E.plural.toLowerCase()}`, text: `Tambah rekod ${E.singular.toLowerCase()} pertama anda untuk bermula.`, cta: html`<button class="btn primary" data-empty-add style="margin-top:14px">${icon('plus', 18)} Tambah ${E.singular}</button>` } : { title: `Belum ada rekod ${E.plural.toLowerCase()}`, text: 'Pensyarah akan memasukkan rekod ini sendiri.' },
  });
  $('#q', root).oninput = debounce((e) => tbl.search(e.target.value));
  const lf = $('#lf', root); if (lf) { if (lecFilter) { lf.value = lecFilter; state.lec = lecFilter; tbl.refresh(); } lf.onchange = () => { state.lec = lf.value; tbl.refresh(); }; }

  // Panduan bukti Lampiran 1: berubah mengikut jenis / peranan yang dipilih dalam borang (lihat js/promotion/lampiran-data.js)
  const wireGuide = (el, fields) => {
    const formEl = $('#rf', el);
    const pick = { activities: (v) => evidenceGuide.activity(v.kind), research: (v) => evidenceGuide.research(v), publications: (v) => evidenceGuide.publication(v), consultancy: (v) => evidenceGuide.consultancy(v) }[entity];
    if (!formEl || !pick) return;
    formEl.insertAdjacentHTML('afterbegin', '<div id="evg" class="evg" aria-live="polite"></div>');
    const host = $('#evg', formEl);
    const draw = () => {
      const v = Object.fromEntries(fields.map((f) => { const i = $('#f_' + f.name, formEl); return [f.name, i ? i.value : '']; }));
      const g = pick(v);
      host.innerHTML = g ? html`<b>Bukti yang diperlukan${g.title ? ' — ' + g.title : ''}${g.code ? html` <span class="badge mute">Lampiran ${g.code}</span>` : ''}</b><ul>${g.needs.map((n) => html`<li>${n}</li>`)}</ul><p class="small"><b>Dokumen disyorkan:</b> ${g.proof}</p>`.s : '';
    };
    formEl.addEventListener('input', draw); formEl.addEventListener('change', draw); draw();
  };

  const form = (row) => {
    const base = entity === 'documents' && row ? E.fields.filter((f) => f.name !== 'file') : E.fields; // editing a document only changes its metadata
    const fields = admin && !row ? [{ name: 'lecturer_id', label: 'Pensyarah', type: 'lecturer', required: true }, ...base] : base;
    const valOf = (f) => (f.name === 'lecturer_id' ? state.lec : row ? row[f.name] ?? '' : query[f.name] ?? (f.name === 'year' ? new Date().getFullYear() : f.default ?? ''));
    const body = html`<form class="form" id="rf" novalidate>${formFields(fields, valOf)}<div class="form-actions"><button type="button" class="btn ghost" data-cancel>Batal</button><button class="btn primary" type="submit" id="sv">Simpan ${E.singular}</button></div></form>`;
    openDrawer({
      title: `${row ? 'Kemas Kini' : 'Tambah'} ${E.singular}`, body,
      onMount: (el, close) => {
        $('[data-cancel]', el).onclick = close; wireShow($('#rf', el), fields);
        wireGuide(el, fields);
        $('#rf', el).onsubmit = async (ev) => {
          ev.preventDefault();
          const { values, files, ok } = readForm(ev.target, fields); if (!ok) return;
          const btn = $('#sv', el); busy(btn, true);
          try {
            const lid = values.lecturer_id || (row && row.lecturer_id) || (me && me.id);
            if (entity === 'documents') {
              if (row) await api.update('documents', row.id, { title: values.title, doc_type: values.doc_type });
              else await api.upload(files.file, { lecturer_id: lid, doc_type: values.doc_type, title: values.title });
            } else {
              for (const f of fields.filter((x) => x.type === 'file')) {
                if (files[f.name]) { const d = await api.upload(files[f.name], { lecturer_id: lid, doc_type: f.docType || 'Other', title: E.title(values) || files[f.name].name }); values[f.name] = d.id; } else delete values[f.name];
              }
              if (row) await api.update(E.table, row.id, values); else await api.create(E.table, values);
            }
            toast(`${E.singular} berjaya disimpan.`); close(); tbl.refresh();
          } catch (e) { toast(e.message, 'err'); busy(btn, false, `Simpan ${E.singular}`); }
        };
      },
    });
  };
  const addBtn = $('#add', root); if (addBtn) addBtn.onclick = () => form(null);
  if (add && canWrite) setTimeout(() => form(null), 60);
  if (edit && canWrite) { const row = store[E.table].find((r) => r.id === edit); if (row) setTimeout(() => form(row), 60); }   // pautan terus dari senarai semak kriteria // pautan terus dari halaman Kenaikan Pangkat: borang terbuka dengan jenis yang betul
  $('#exp', root).onclick = () => {
    const rows = rowsFn(); const head = [...(admin ? ['Pensyarah', 'No. Staf'] : []), ...E.columns.map((c) => c.label)];
    download(`${entity}.csv`, toCsv(head, rows.map((r) => [...(admin ? [(lecturerOf(r.lecturer_id) || {}).full_name, (lecturerOf(r.lecturer_id) || {}).staff_id] : []), ...E.columns.map((c) => (c.fmt === 'category' ? (api.categoryOf(r[c.key]) || {}).name : r[c.key]))])));
  };
  root.addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.hasAttribute('data-empty-add')) return form(null);
    if (t.dataset.edit) return form(store[E.table].find((r) => r.id === t.dataset.edit));
    if (t.dataset.dl) return saveDownload(t.dataset.dl);
    if (t.dataset.del) {
      const r = store[E.table].find((x) => x.id === t.dataset.del);
      if (await confirmDialog({ title: `Padam ${E.singular.toLowerCase()}?`, message: `“${E.title(r)}” akan dipadam secara kekal.` })) {
        try { await api.remove(E.table, r.id); toast(`${E.singular} telah dipadam.`); tbl.refresh(); } catch (er) { toast(er.message, 'err'); }
      }
    }
  });
}
