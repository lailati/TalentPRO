import { store } from '../api.js';
import { html, mount, $, icon, avatar } from '../util.js';
import { DEPARTMENTS } from '../schema.js';
import { dataTable, pageHead, searchBox, debounce } from './_ui.js';

export async function render(root) {
  const st = { dept: '' };
  mount(root, html`${pageHead('Pensyarah', 'Direktori semua pensyarah FSTP.', html`<a class="btn primary" href="#/users">${icon('plus', 18)} Tambah akaun pensyarah</a>`)}
    <div class="toolbar">${searchBox('q', 'Cari nama, no. staf atau e-mel…')}<select class="input" id="d" style="max-width:240px" aria-label="Jabatan"><option value="">Semua jabatan</option>${DEPARTMENTS.map((d) => html`<option>${d}</option>`)}</select></div><div id="t"></div>`);
  const EVIDENCE = ['activities', 'research', 'publications', 'consultancy'];   // rekod bukti yang dibaca enjin Kenaikan Pangkat
  const evidence = (l) => EVIDENCE.reduce((n, k) => n + store[k].filter((r) => r.lecturer_id === l.id).length, 0);
  const t = dataTable($('#t', root), {
    rows: () => store.lecturers.filter((l) => !st.dept || l.department === st.dept),
    searchText: (l) => [l.full_name, l.staff_id, l.email, l.position].join(' '),
    columns: [
      { label: 'Pensyarah', sort: (l) => l.full_name, render: (l) => html`<a class="row" style="flex-wrap:nowrap;gap:10px;color:inherit" href="#/lecturer/${l.id}">${avatar(l, 34)}<span><b>${l.full_name}</b><br><small class="faint">${l.staff_id} · ${l.email}</small></span></a>` },
      { label: 'Jabatan', key: 'department' }, { label: 'Jawatan', key: 'position' },
      { label: 'Gred', sort: (l) => l.grade || '', render: (l) => (l.grade ? html`<span class="badge">${l.grade}</span>` : html`<span class="faint">Belum ditetapkan</span>`) },
      { label: 'Rekod bukti', sort: evidence, render: evidence },
    ],
    actions: (l) => html`<a class="icon-btn" href="#/lecturer/${l.id}" aria-label="Lihat ${l.full_name}" title="Lihat profil">${icon('eye', 18)}</a>`,
  });
  $('#q', root).oninput = debounce((e) => t.search(e.target.value));
  $('#d', root).onchange = (e) => { st.dept = e.target.value; t.refresh(); };
}
