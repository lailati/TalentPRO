# Peta Bakat FSTP

Sistem pemetaan bakat berasaskan web untuk pensyarah Fakulti Sains dan Teknologi Pertahanan (FSTP), UPNM.
Projek Sarjana Muda (TSK 3306), Sesi 2026/2027.

## Jalankan secara tempatan
```bash
python -m http.server 5173
```
Buka <http://localhost:5173/?backend=local> (sandbox, `admin` / `admin`).

## Dokumentasi
- [PROJECT.md](PROJECT.md) — spesifikasi penuh, kontrak backend, gotchas, tertib pembinaan
- [CLAUDE.md](CLAUDE.md) — peraturan untuk AI (vibe coding)

## Struktur
```
index.html      shell
css/            gaya
js/             modul ES (api, schema, views, three)
backend/        Google Apps Script (fasa 1)
docs/           skema SQL (fasa 2)
tools/          skrip bantuan
```

> Jangan commit dokumen peribadi (proposal PDF, imej, `.pptx`) atau kata laluan.
