# CLAUDE.md — Peta Bakat FSTP

Spesifikasi penuh projek ada dalam **[PROJECT.md](PROJECT.md)**. Baca bahagian berkaitan sebelum mengubah kod. Jika PROJECT.md dan kod berbeza, **kod yang menang** — kemas kini PROJECT.md.

## Ringkasan
Sistem pemetaan bakat pensyarah FSTP (UPNM), projek PSM. Frontend HTML/CSS/JS (ES modules, **tiada build step**) + Three.js (CDN). Backend fasa 1: Google Apps Script + Sheets; fasa 2: PHP + MySQL. Mod sandbox: `?backend=local`.

## Peraturan wajib
1. **Semua teks paparan pengguna dalam Bahasa Malaysia** (glosari di PROJECT.md §8). Komen kod boleh Inggeris.
2. **Semua data melalui `js/api.js`** sahaja. View tidak boleh panggil backend terus.
3. **Kontrak backend (PROJECT.md §5) mesti sama** dalam `backend/Code.gs` dan `js/local-server.js`. Ubah satu, ubah kedua-duanya.
4. **Kebenaran dikuatkuasa di server**, bukan UI sahaja.
5. Gunakan tag `html\`\`` untuk semua templat (escape XSS). Jangan guna `innerHTML` dengan data mentah.
6. Rekod baharu = tambah blok dalam `ENTITIES` (`js/schema.js`), bukan view baharu.
7. Nilai tersimpan dalam BM; kod logik (`admin`, `lecturer`, `Active`, `Inactive`) kekal Inggeris.
8. Tiada framework/build tool. Jangan tambah npm dependency tanpa bincang.
9. Laluan aset **relatif**; routing berasaskan hash.
10. Baca "Gotchas" (PROJECT.md §20) sebelum menyentuh Pages, Apps Script, Three.js atau drawer.

## Larangan
- Jangan commit PDF, imej mockup, `.pptx`, kata laluan, token atau data sebenar.
- Jangan `git push`, cipta projek awan atau jadikan sesuatu awam tanpa kebenaran pengguna.
- Jangan dakwa UAT telah dibuat (belum; dirancang PSM II).

## Jalankan
```bash
python -m http.server 5173
```
Buka http://localhost:5173/?backend=local (login `admin` / `admin`).

## Semak sebelum siap
Senarai penerimaan: PROJECT.md §19. Pengesahan deploy: §11.4.

## Gaya kerja
- Perubahan kecil dan fokus; satu commit bagi satu tujuan.
- Mesej commit ringkas, boleh dalam BM atau Inggeris.
- Selepas ubah UI, uji di `?backend=local` pada lebar desktop dan 390 px, mod cerah dan gelap.
