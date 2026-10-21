import * as api from '../api.js';
import { store } from '../api.js';
import { html, mount, $, toast, icon } from '../util.js';
import { fieldHtml, readForm, busy, pageHead } from './_ui.js';
import { ROLE_LABEL } from '../schema.js';

export async function render(root) {
  const F = [
    { name: 'current', label: 'Kata Laluan Semasa', type: 'password', required: true, autocomplete: 'current-password' },
    { name: 'password', label: 'Kata Laluan Baharu', type: 'password', required: true, minlen: 8, autocomplete: 'new-password' },
    { name: 'confirm', label: 'Sahkan Kata Laluan Baharu', type: 'password', required: true, autocomplete: 'new-password' },
  ];
  mount(root, html`${pageHead('Akaun & Kata Laluan', `Log masuk sebagai ${store.me.username} (${ROLE_LABEL[store.me.role]}).`)}
    <section class="card" style="max-width:520px"><h3>${icon('lock', 18)} Tukar kata laluan</h3><form class="form" id="f" novalidate>${F.map((f) => fieldHtml(f))}<div class="form-actions"><button class="btn primary" id="sv" type="submit">Kemas Kini Kata Laluan</button></div></form></section>
  `);
  $('#f', root).onsubmit = async (e) => {
    e.preventDefault(); const { values, ok } = readForm(e.target, F); if (!ok) return;
    const err = (n, m) => { const x = $('#f_' + n + '_e', root); x.textContent = m; x.hidden = false; $('#f_' + n, root).focus(); };
    if (!/[A-Za-z]/.test(values.password) || !/\d/.test(values.password)) return err('password', 'Sertakan sekurang-kurangnya satu huruf dan satu nombor.');
    if (values.password !== values.confirm) return err('confirm', 'Kata laluan tidak sepadan.');
    const b = $('#sv', root); busy(b, true);
    try { await api.changePassword(values.current, values.password); toast('Kata laluan dikemas kini.'); e.target.reset(); } catch (x) { toast(x.message, 'err'); }
    busy(b, false, 'Kemas Kini Kata Laluan');
  };
}
