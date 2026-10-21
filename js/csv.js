// Import pengguna secara pukal melalui CSV. Fungsi tulen (tiada DOM) supaya mudah diuji.
import { POSITIONS } from './schema.js';
import { GRADES, FIELDS } from './promotion/guideline.js';

const GRADE_CODES = GRADES.map((g) => g.code);

// Lajur templat. `aliases` = tajuk lain yang diterima (huruf besar/kecil dan jarak diabaikan).
export const USER_COLUMNS = [
  { key: 'full_name', label: 'nama_penuh', aliases: ['full_name', 'nama', 'name'], required: true, eg: 'Dr. Aminah binti Yusof' },
  { key: 'username', label: 'nama_pengguna', aliases: ['username', 'user', 'id_pengguna'], required: true, eg: 'aminah.yusof' },
  { key: 'email', label: 'emel', aliases: ['email', 'e-mel', 'e_mel'], required: true, eg: 'aminah@upnm.edu.my' },
  { key: 'department', label: 'jabatan', aliases: ['department'], eg: 'Sains Komputer' },
  { key: 'position', label: 'jawatan', aliases: ['position'], eg: 'Pensyarah Kanan' },
  { key: 'staff_id', label: 'no_staf', aliases: ['staff_id', 'no_pekerja'], eg: 'UPNM101' },
  { key: 'grade', label: 'gred', aliases: ['grade'], eg: 'DS13' },
  { key: 'grade_since', label: 'tarikh_masuk_gred', aliases: ['grade_since'], eg: '2020-03-01' },
  { key: 'appointed_on', label: 'tarikh_lantikan', aliases: ['appointed_on'], eg: '2015-07-15' },
  { key: 'confirmed_on', label: 'tarikh_pengesahan', aliases: ['confirmed_on'], eg: '2017-07-15' },
  { key: 'vk7_since', label: 'tarikh_masuk_vk7', aliases: ['vk7_since'], eg: '' },
  { key: 'field', label: 'bidang', aliases: ['field'], eg: 'Sains & Teknologi' },
  { key: 'has_phd', label: 'phd', aliases: ['has_phd'], eg: 'Ya' },
  { key: 'has_prof_qual', label: 'kelayakan_profesional', aliases: ['has_prof_qual'], eg: 'Tidak' },
  { key: 'password', label: 'kata_laluan', aliases: ['password', 'katalaluan'], eg: '' },
];
export const MAX_BULK_ROWS = 500;

const label = (key) => (USER_COLUMNS.find((c) => c.key === key) || {}).label || key;
const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
const HEADER_MAP = new Map(USER_COLUMNS.flatMap((c) => [c.label, ...c.aliases].map((a) => [norm(a), c.key])));

/** Menghuraikan teks CSV (RFC 4180). Pembatas (, atau ;) dikesan daripada baris pertama; BOM dibuang. */
export function parseCsv(text) {
  const src = String(text).replace(/^﻿/, '');
  const first = src.split(/\r?\n/, 1)[0] || '';
  const delim = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) { if (ch === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && src[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}

export function templateCsv() {
  const q = (s) => (/[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);
  return '﻿' + [USER_COLUMNS.map((c) => c.label), USER_COLUMNS.map((c) => c.eg)].map((r) => r.map(q).join(',')).join('\r\n') + '\r\n';
}

const isoDate = (v) => {
  const s = String(v ?? '').trim(); if (!s) return '';
  let y, m, d, x;
  if ((x = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) [y, m, d] = [x[1], x[2], x[3]];
  else if ((x = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) [d, m, y] = [x[1], x[2], x[3]];
  else return null;
  const dt = new Date(Date.UTC(+y, +m - 1, +d));
  if (dt.getUTCFullYear() !== +y || dt.getUTCMonth() !== +m - 1 || dt.getUTCDate() !== +d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};
const yesNo = (v) => { const s = String(v ?? '').trim().toLowerCase(); if (!s) return ''; if (['ya', 'y', 'yes', '1', 'true'].includes(s)) return 'Ya'; if (['tidak', 't', 'no', 'n', '0', 'false'].includes(s)) return 'Tidak'; return null; };
const pickOf = (v, list) => { const s = String(v ?? '').trim(); if (!s) return ''; return list.find((x) => x.toLowerCase() === s.toLowerCase()) ?? null; };

/** Kata laluan rawak 10 aksara (huruf + nombor, tanpa aksara mengelirukan). */
export function generatePassword(len = 10) {
  const L = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', N = '23456789', all = L + N;
  const rnd = (n) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
  const out = [L[rnd(L.length)], N[rnd(N.length)]];
  while (out.length < len) out.push(all[rnd(all.length)]);
  for (let i = out.length - 1; i > 0; i--) { const j = rnd(i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out.join('');
}
export const strongPassword = (p) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

/**
 * Menyemak fail yang telah dihuraikan.
 * @returns {{ error?: string, rows: Array<{ line: number, data: object, errors: string[], generated: boolean }>, ignored: string[] }}
 * `existing` = { usernames:Set, emails:Set, staffIds:Set } (huruf kecil) daripada pangkalan data semasa.
 */
export function validateUserRows(matrix, existing) {
  if (!matrix.length) return { error: 'Fail kosong.', rows: [], ignored: [] };
  const head = matrix[0].map((h) => HEADER_MAP.get(norm(h)) || null);
  const ignored = matrix[0].filter((_, i) => !head[i]).map((h) => String(h).trim()).filter(Boolean);
  const missing = USER_COLUMNS.filter((c) => c.required && !head.includes(c.key)).map((c) => c.label);
  if (missing.length) return { error: `Lajur wajib tiada: ${missing.join(', ')}. Muat turun templat untuk format yang betul.`, rows: [], ignored };
  const body = matrix.slice(1);
  if (!body.length) return { error: 'Fail hanya mengandungi tajuk lajur, tiada data.', rows: [], ignored };
  if (body.length > MAX_BULK_ROWS) return { error: `Terlalu banyak baris (${body.length}). Maksimum ${MAX_BULK_ROWS} baris setiap import.`, rows: [], ignored };

  const seenU = new Set(), seenE = new Set(), seenS = new Set();
  const rows = body.map((cells, idx) => {
    const raw = {}; head.forEach((k, i) => { if (k) raw[k] = String(cells[i] ?? '').trim(); });
    const errors = []; const d = { role: 'lecturer', status: 'Active' };
    d.full_name = raw.full_name || ''; d.username = raw.username || ''; d.email = raw.email || '';
    if (!d.full_name) errors.push('Nama penuh wajib.');
    if (!d.username) errors.push('Nama pengguna wajib.'); else if (!/^[A-Za-z0-9._-]{3,40}$/.test(d.username)) errors.push('Nama pengguna: 3-40 aksara (huruf, nombor, . _ -).');
    if (!d.email) errors.push('E-mel wajib.'); else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) errors.push('Format e-mel tidak sah.');
    const u = d.username.toLowerCase(), e = d.email.toLowerCase();
    if (u && (existing.usernames.has(u) || seenU.has(u))) errors.push('Nama pengguna sudah digunakan.');
    if (e && (existing.emails.has(e) || seenE.has(e))) errors.push('E-mel sudah didaftarkan.');
    if (u) seenU.add(u); if (e) seenE.add(e);
    d.department = raw.department || '';
    const pos = pickOf(raw.position, POSITIONS); if (pos === null) errors.push(`Jawatan tidak sah (pilih: ${POSITIONS.join(', ')}).`); else d.position = pos;
    d.staff_id = raw.staff_id || '';
    if (d.staff_id) { const s = d.staff_id.toLowerCase(); if (existing.staffIds.has(s) || seenS.has(s)) errors.push('No. staf sudah digunakan.'); seenS.add(s); }
    const g = pickOf(raw.grade, GRADE_CODES); if (g === null) errors.push(`Gred tidak sah (pilih: ${GRADE_CODES.join(', ')}).`); else d.grade = g;
    for (const k of ['grade_since', 'appointed_on', 'confirmed_on', 'vk7_since']) { const v = isoDate(raw[k]); if (v === null) errors.push(`${label(k)}: tarikh tidak sah (guna YYYY-MM-DD atau DD/MM/YYYY).`); else d[k] = v; }
    const f = pickOf(raw.field, FIELDS); if (f === null) errors.push(`Bidang tidak sah (pilih: ${FIELDS.join(', ')}).`); else d.field = f;
    for (const k of ['has_phd', 'has_prof_qual']) { const v = yesNo(raw[k]); if (v === null) errors.push(`${label(k)}: guna Ya atau Tidak.`); else d[k] = v; }
    let generated = false;
    if (raw.password) { if (!strongPassword(raw.password)) errors.push('Kata laluan: minimum 8 aksara dengan huruf dan nombor.'); d.password = raw.password; }
    else { d.password = generatePassword(); generated = true; }
    return { line: idx + 2, data: d, errors, generated };
  });
  return { rows, ignored };
}

/** CSV senarai akaun yang berjaya dicipta (untuk diedarkan kepada pengguna). */
export function credentialsCsv(created) {
  const q = (s) => { s = String(s ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return '﻿' + [['nama_penuh', 'nama_pengguna', 'emel', 'kata_laluan_awal'], ...created.map((u) => [u.full_name, u.username, u.email, u.password])].map((r) => r.map(q).join(',')).join('\r\n') + '\r\n';
}
