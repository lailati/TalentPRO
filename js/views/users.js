import * as api from '../api.js';
import { store } from '../api.js';
import { html, mount, $, icon, toast, openDrawer, confirmDialog, fmtDate, download } from '../util.js';
import { parseCsv, validateUserRows, templateCsv, credentialsCsv, USER_COLUMNS, MAX_BULK_ROWS } from '../csv.js';
import { DEPARTMENTS, ROLE_LABEL } from '../schema.js';
import { fieldHtml, readForm, busy, dataTable, pageHead, searchBox, cell, debounce } from './_ui.js';

const OFFICE_DEPTS = [...DEPARTMENTS, 'Pejabat Fakulti', 'Pejabat Pendaftar'];
const strongPw = (p) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

export async function render(root) {
  mount(root, html`${pageHead('Urus Pengguna', 'Cipta, kemas kini dan nyahaktifkan akaun sistem.', html`<button class="btn ghost" id="bulk">${icon('plus', 18)} Import CSV</button><button class="btn primary" id="add">${icon('plus', 18)} Tambah Pengguna</button>`)}<div class="toolbar">${searchBox('q', 'Cari pengguna…')}</div><div id="t"></div>`);
  const t = dataTable($('#t', root), {
    rows: () => store.users, searchText: (u) => [u.full_name, u.username, u.email, u.role, u.department].join(' '),
    columns: [
      { label: 'Nama', key: 'full_name', render: (u) => html`<b>${u.full_name}</b>` }, { label: 'Nama Pengguna', key: 'username' }, { label: 'E-mel', key: 'email' },
      { label: 'Peranan', key: 'role', render: (u) => html`<span class="badge ${u.role === 'admin' ? 'info' : u.role === 'hr' ? 'warn' : 'mute'}">${ROLE_LABEL[u.role] || u.role}</span>` },
      { label: 'Jabatan', key: 'department' }, { label: 'Status', key: 'status', fmt: 'status' },
      { label: 'Log masuk terakhir', key: 'last_login', render: (u) => (u.last_login ? fmtDate(u.last_login) : html`<span class="faint">Tidak pernah</span>`) },
    ],
    actions: (u) => html`<button class="icon-btn" data-edit="${u.id}" aria-label="Kemas kini ${u.full_name}" title="Kemas kini">${icon('edit', 18)}</button><button class="icon-btn" data-pw="${u.id}" aria-label="Tetap semula kata laluan untuk ${u.full_name}" title="Tetap semula kata laluan">${icon('key', 18)}</button>${u.id !== store.me.id ? html`<button class="icon-btn del" data-del="${u.id}" aria-label="Padam ${u.full_name}" title="Padam">${icon('trash', 18)}</button>` : ''}`,
  });
  $('#q', root).oninput = debounce((e) => t.search(e.target.value));

  const userForm = (u) => {
    const F = [
      { name: 'full_name', label: 'Nama Penuh', type: 'text', required: true }, { name: 'username', label: 'Nama Pengguna', type: 'text', required: true, readonly: !!u, autocomplete: 'off' },
      { name: 'email', label: 'E-mel', type: 'email', required: true }, { name: 'role', label: 'Peranan', type: 'select', options: [['lecturer', 'Pensyarah'], ['hr', 'Pegawai KP (HR)'], ['admin', 'Admin Sistem']], required: true, help: 'users_role' },
      { name: 'department', label: 'Jabatan', type: 'select', options: [...OFFICE_DEPTS, ...(u && !OFFICE_DEPTS.includes(u.department) && u.department ? [u.department] : [])], required: true }, { name: 'status', label: 'Status', type: 'select', options: [['Active', 'Aktif'], ['Inactive', 'Tidak Aktif']], required: true },
      ...(u ? [] : [{ name: 'password', label: 'Kata Laluan Awal', type: 'password', required: true, minlen: 8, autocomplete: 'new-password' }]),
    ];
    openDrawer({
      title: u ? 'Kemas Kini Pengguna' : 'Tambah Akaun Pengguna',
      body: html`<form class="form" id="uf" novalidate>${F.map((f) => fieldHtml(f, u ? u[f.name] ?? '' : f.name === 'status' ? 'Active' : f.name === 'role' ? 'lecturer' : ''))}${u ? html`<p class="small muted">Peranan tidak boleh ditukar selepas akaun dicipta. Gunakan “tetap semula kata laluan” untuk menetapkan kata laluan baharu.</p>` : html`<p class="small muted">Minimum 8 aksara, dengan huruf dan nombor. Minta pengguna menukarnya selepas log masuk pertama.</p>`}<div class="form-actions"><button type="button" class="btn ghost" data-cancel>Batal</button><button class="btn primary" id="sv" type="submit">Simpan Pengguna</button></div></form>`,
      onMount: (el, close) => {
        if (u) $('#f_role', el).disabled = true;
        $('[data-cancel]', el).onclick = close;
        $('#uf', el).onsubmit = async (ev) => {
          ev.preventDefault(); const { values, ok } = readForm(ev.target, F); if (!ok) return;
          if (!u && !strongPw(values.password)) { const e = $('#f_password_e', el); e.textContent = 'Gunakan sekurang-kurangnya 8 aksara termasuk huruf dan nombor.'; e.hidden = false; $('#f_password', el).focus(); return; }
          const b = $('#sv', el); busy(b, true);
          try { if (u) await api.updateUser(u.id, values); else await api.createUser(values); toast('Pengguna berjaya disimpan.'); close(); t.refresh(); } catch (e) { toast(e.message, 'err'); busy(b, false, 'Simpan Pengguna'); }
        };
      },
    });
  };
  const pwForm = (u) => openDrawer({
    title: 'Tetap Semula Kata Laluan',
    body: html`<form class="form" id="pf" novalidate><p class="muted">Tetapkan kata laluan baharu untuk <b>${u.full_name}</b>.</p>${fieldHtml({ name: 'password', label: 'Kata Laluan Baharu', type: 'password', required: true, minlen: 8, autocomplete: 'new-password' })}<div class="form-actions"><button type="button" class="btn ghost" data-cancel>Batal</button><button class="btn primary" id="sv" type="submit">Tetap Semula Kata Laluan</button></div></form>`,
    onMount: (el, close) => {
      $('[data-cancel]', el).onclick = close;
      $('#pf', el).onsubmit = async (ev) => { ev.preventDefault(); const { values, ok } = readForm(ev.target, [{ name: 'password', label: 'x', type: 'password', required: true, minlen: 8 }]); if (!ok) return; if (!strongPw(values.password)) { const e = $('#f_password_e', el); e.textContent = 'Gunakan sekurang-kurangnya 8 aksara termasuk huruf dan nombor.'; e.hidden = false; return; } const b = $('#sv', el); busy(b, true); try { await api.resetPassword(u.id, values.password); toast('Kata laluan telah ditetapkan semula.'); close(); } catch (e) { toast(e.message, 'err'); busy(b, false, 'Tetap Semula Kata Laluan'); } };
    },
  });
  // ---- import pukal melalui CSV: pilih fail → pratonton + semakan → import → muat turun senarai kata laluan ----
  const bulkForm = () => openDrawer({
    title: 'Import Pengguna daripada CSV', wide: true,
    body: html`<div id="bk"></div>`,
    onMount: (el, close) => {
      const box = $('#bk', el);
      const existing = () => ({ usernames: new Set(store.users.map((u) => u.username.toLowerCase())), emails: new Set(store.users.map((u) => u.email.toLowerCase())), staffIds: new Set(store.lecturers.map((l) => String(l.staff_id).toLowerCase())) });
      const pick = (msg = '') => {
        mount(box, html`
          <p class="muted">Cipta banyak akaun <b>pensyarah</b> sekali gus. Maksimum ${MAX_BULK_ROWS} baris setiap import. Akaun Pegawai KP (HR) dan Admin Sistem dicipta satu demi satu melalui “Tambah Pengguna”.</p>
          <p class="small muted"><b>Lajur wajib:</b> ${USER_COLUMNS.filter((c) => c.required).map((c) => c.label).join(', ')}. <b>Pilihan:</b> ${USER_COLUMNS.filter((c) => !c.required).map((c) => c.label).join(', ')}. Jika <code>kata_laluan</code> kosong, sistem menjana kata laluan awal secara rawak. Tarikh: YYYY-MM-DD atau DD/MM/YYYY.</p>
          ${msg ? html`<div class="err-box" role="alert">${msg}</div>` : ''}
          <div class="row" style="margin:14px 0"><button type="button" class="btn ghost" id="tpl">${icon('report', 18)} Muat turun templat CSV</button></div>
          <div class="fld"><label for="csvf">Fail CSV</label><input class="input" id="csvf" type="file" accept=".csv,text/csv"></div>`);
        $('#tpl', box).onclick = () => download('templat-pengguna.csv', templateCsv());
        $('#csvf', box).onchange = async (e) => {
          const f = e.target.files[0]; if (!f) return;
          if (f.size > 2 * 1024 * 1024) return pick('Fail terlalu besar (maksimum 2 MB).');
          let res; try { res = validateUserRows(parseCsv(await f.text()), existing()); } catch { return pick('Fail tidak dapat dibaca. Pastikan ia fail CSV.'); }
          if (res.error) return pick(res.error);
          preview(res);
        };
      };
      const preview = (res) => {
        const good = res.rows.filter((r) => !r.errors.length), bad = res.rows.length - good.length;
        mount(box, html`
          <div class="row" style="gap:10px;flex-wrap:wrap;margin-bottom:10px"><span class="badge ok">${good.length} baris sah</span><span class="badge ${bad ? 'danger' : 'mute'}">${bad} baris bermasalah</span>${res.ignored.length ? html`<span class="small muted">Lajur diabaikan: ${res.ignored.join(', ')}</span>` : ''}</div>
          ${bad ? html`<p class="small muted">Hanya baris yang sah akan diimport. Baiki baris bermasalah dalam fail dan import semula jika perlu.</p>` : ''}
          <div class="tbl-wrap" style="max-height:48vh;overflow:auto"><table><thead><tr><th>Baris</th><th>Nama</th><th>Pengguna</th><th>E-mel</th><th>Gred</th><th>Semakan</th></tr></thead><tbody>${res.rows.map((r) => html`<tr><td>${r.line}</td><td>${r.data.full_name}</td><td>${r.data.username}</td><td>${r.data.email}</td><td>${r.data.grade || '—'}</td><td>${r.errors.length ? html`<span class="badge danger">Ralat</span> <small>${r.errors.join(' ')}</small>` : html`<span class="badge ok">Sah</span>${r.generated ? html` <small class="faint">kata laluan dijana</small>` : ''}`}</td></tr>`)}</tbody></table></div>
          <div class="form-actions"><button type="button" class="btn ghost" id="back">Pilih fail lain</button><button type="button" class="btn primary" id="go" ${good.length ? '' : 'disabled'}>Import ${good.length} pengguna</button></div>`);
        $('#back', box).onclick = () => pick();
        $('#go', box).onclick = async () => {
          const b = $('#go', box); busy(b, true);
          try { result(good, await api.createUsers(good.map((r) => r.data))); t.refresh(); }
          catch (e) { toast(e.message, 'err'); busy(b, false, `Import ${good.length} pengguna`); }
        };
      };
      const result = (sent, out) => {
        const made = out.created.map((c) => ({ ...c, password: sent[c.index].data.password })), failed = out.errors.map((e) => ({ line: sent[e.index].line, name: sent[e.index].data.full_name, message: e.message }));
        mount(box, html`
          <div class="row" style="gap:10px;flex-wrap:wrap;margin-bottom:12px"><span class="badge ok">${made.length} akaun dicipta</span><span class="badge ${failed.length ? 'danger' : 'mute'}">${failed.length} gagal</span></div>
          ${made.length ? html`<div class="card" style="margin-bottom:14px"><h3>${icon('key', 18)} Senarai kata laluan awal</h3><p class="small muted">Kata laluan <b>hanya dipaparkan sekali</b> dan tidak boleh dilihat semula kemudian. Muat turun fail ini, edarkan kepada pengguna dengan selamat, kemudian padamnya. Minta pengguna menukar kata laluan selepas log masuk pertama.</p><button type="button" class="btn primary" id="cred">${icon('report', 18)} Muat turun senarai akaun (CSV)</button></div>` : ''}
          ${failed.length ? html`<div class="tbl-wrap"><table><thead><tr><th>Baris</th><th>Nama</th><th>Sebab</th></tr></thead><tbody>${failed.map((f) => html`<tr><td>${f.line}</td><td>${f.name}</td><td>${f.message}</td></tr>`)}</tbody></table></div>` : ''}
          <div class="form-actions"><button type="button" class="btn ghost" id="done">Selesai</button></div>`);
        const c = $('#cred', box); if (c) c.onclick = () => download('akaun-pengguna-baharu.csv', credentialsCsv(made));
        $('#done', box).onclick = close;
      };
      pick();
    },
  });
  $('#bulk', root).onclick = bulkForm;
  $('#add', root).onclick = () => userForm(null);
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.edit) return userForm(store.users.find((u) => u.id === b.dataset.edit));
    if (b.dataset.pw) return pwForm(store.users.find((u) => u.id === b.dataset.pw));
    if (b.dataset.del) {
      const u = store.users.find((x) => x.id === b.dataset.del);
      if (await confirmDialog({ title: 'Padam pengguna?', message: `${u.full_name}${u.role === 'lecturer' ? ' beserta SEMUA rekod bukti (aktiviti, penyelidikan, penerbitan, dokumen) dan permohonan kenaikan pangkat' : ''} akan dipadam secara kekal. Pertimbangkan untuk menetapkan akaun kepada Tidak Aktif sebaliknya.` })) {
        try { await api.deleteUser(u.id); toast('Pengguna telah dipadam.'); t.refresh(); } catch (er) { toast(er.message, 'err'); }
      }
    }
  });
}
