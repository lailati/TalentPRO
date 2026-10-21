# TalentPro — Sistem Kenaikan Pangkat FSTP

Sistem web untuk merekod bukti, menyemak kesediaan dan menjejak permohonan **Kenaikan Pangkat staf akademik** Fakulti Sains dan Teknologi Pertahanan (FSTP), UPNM, berdasarkan *Garis Panduan Kenaikan Pangkat Staf Akademik UPNM (LPU 28 Ogos 2025)*.
Projek Sarjana Muda (TSK 3306), Sesi 2026/2027.

Live: <https://lailati.github.io/TalentPRO/>

## Jalankan secara tempatan
```bash
python -m http.server 5173
```
Buka <http://localhost:5173/?backend=local> (sandbox kosong, `admin` / `admin`).

## Dokumentasi
- [PROJECT.md](PROJECT.md) — spesifikasi penuh, kontrak backend, gotchas, tertib pembinaan
- [docs/KENAIKAN-PANGKAT.md](docs/KENAIKAN-PANGKAT.md) — reka bentuk modul Kenaikan Pangkat
- [CLAUDE.md](CLAUDE.md) — peraturan untuk AI (vibe coding)

## Struktur
```
index.html      shell
css/            gaya
js/             modul ES (api, schema, promotion, views, three)
backend/        Google Apps Script (fasa 1)
docs/           skema SQL (fasa 2) dan nota KP
tools/          ujian enjin KP dan skrip bantuan
Rujukan/        Garis Panduan (PDF, tidak di-commit)
```

> Jangan commit dokumen peribadi (PDF, imej, `.pptx`) atau kata laluan.
