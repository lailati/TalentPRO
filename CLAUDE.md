# CLAUDE.md — Peta Bakat FSTP

Spesifikasi penuh projek ada dalam **[PROJECT.md](PROJECT.md)**. Baca bahagian berkaitan sebelum mengubah kod. Jika PROJECT.md dan kod berbeza, **kod yang menang** — kemas kini PROJECT.md.

## Ringkasan
Sistem **Kenaikan Pangkat** staf akademik FSTP (UPNM), projek PSM, berdasarkan Garis Panduan Kenaikan Pangkat UPNM 2025 (`Rujukan/`, tidak di-commit). Frontend HTML/CSS/JS (ES modules, **tiada build step**) + Three.js (CDN, hanya latar log masuk). Backend fasa 1: Google Apps Script + Sheets; fasa 2: PHP + MySQL. Mod sandbox: `?backend=local` (bermula kosong).

**Fokus:** UI hanya memaparkan KP dan rekod buktinya (lihat bahagian "Fokus semasa" dalam PROJECT.md). Ciri pemetaan bakat (kepakaran, kategori, galaksi 3D, statistik, laporan) telah dibuang daripada UI; jadual backendnya sengaja dikekalkan.

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

## Peranan (tiga) dan kebenaran
- `admin` = Admin Sistem (akaun/import CSV/kategori; **tiada** data KP), `hr` = Pegawai KP (urusan KP; tulis LPPT, tatatertib, penilai luar, maklumat perkhidmatan, tindakan `promo*`), `lecturer` = pensyarah (satu-satunya yang menulis rekod bukti, miliknya sendiri). HR hanya baca rekod bukti.
- Kebenaran dikuatkuasakan di **kedua-dua** backend (`js/local-server.js` dan `backend/Code.gs`) dan mesti sama; UI hanya menyembunyikan butang. Jadual penuh: `docs/KENAIKAN-PANGKAT.md`.

## Apabila `backend/Code.gs` berubah (wajib)
Pengguna menampal `Code.gs` ke Apps Script sendiri, jadi **setiap kali Code.gs diubah, nyatakan dengan jelas dalam jawapan akhir** apa yang perlu dibuat:
1. **Salin** kandungan `backend/Code.gs` yang baharu ke Apps Script (Ctrl+A, Ctrl+V, Ctrl+S). Boleh salin ke clipboard untuk pengguna (`Get-Content backend\Code.gs -Raw -Encoding UTF8 | Set-Clipboard`).
2. **Fungsi yang perlu dijalankan dari editor** (pilih dalam dropdown, klik Run), atau nyatakan "tiada fungsi perlu dijalankan". Contoh: `setup()` hanya jika ada jadual/lajur baharu; `buangDataContoh()`, `resetAdminPassword()`, `terjemahDataKeBM()` hanya jika berkaitan.
3. **Deploy versi baharu**: Deploy → Manage deployments → Edit → Version: New version → Deploy (tanpa ini `/exec` masih guna kod lama).
4. Senaraikan **tindakan/fungsi baharu atau berubah** dan apa yang tak berfungsi sebelum deploy.
Jangan anggap pengguna tahu langkah ini; ulang setiap kali.

## Larangan
- Jangan commit PDF, imej mockup, `.pptx`, kata laluan, token atau data sebenar.
- Auto commit + push ke `origin/main` dibenarkan oleh pengguna (hook Stop → `tools/autopush.ps1`). Repo ini **awam**: jangan letak rahsia di mana-mana fail. Selain itu, jangan cipta projek awan atau jadikan sesuatu awam tanpa kebenaran pengguna; jangan force-push.
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
