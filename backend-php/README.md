# Backend PHP TalentPro (peringkat 1: sambungan dan pengesahan)

Lapisan PHP + MySQL/MariaDB untuk PSM II. Peringkat ini menyediakan **sambungan pangkalan data, log masuk, sesi, tukar kata laluan dan akaun Admin**. Tindakan data (profil, rekod kriteria, semakan KP) belum dibina.

Sampul permintaan dan respons **sama dengan kontrak** dalam `PROJECT.md` bahagian 5, supaya `js/api.js` boleh ditambah transport `php` kemudian tanpa mengubah paparan:

```
POST  {"action":"login","payload":{...},"token":"..."}   ->  {"ok":true,"data":...}  |  {"ok":false,"error":"<mesej BM>","code":401}
GET   ->  {"ok":true,"data":{"service":"TalentPro PHP","status":"ok","tables":10}}
```

Tidak seperti Apps Script, kod HTTP sebenar turut dihantar (401, 403, 429...) selain `code` dalam badan.

## Tindakan yang tersedia

| Tindakan | Pengesahan | Muatan | Keputusan |
|---|---|---|---|
| `login` | tiada | `{username, password}` (nama pengguna atau e-mel, tidak peka huruf) | `{token, user}`. 401 jika salah; 403 jika akaun tidak aktif; 429 jika dikunci |
| `logout` | token | | `true` |
| `me` | token | | `{user}` |
| `changePassword` | token | `{current, password}` | `true`. Sesi lain pengguna itu dibatalkan |

Tindakan lain dalam kontrak (`snapshot`, `create`, `createUser`, ...) mengembalikan 404 "Tindakan tidak dikenali." sehingga dibina.

## Menyediakan (sekali sahaja)

1. Mulakan MySQL/MariaDB (XAMPP) dan import skema:
   ```powershell
   C:\xampp\mysql\bin\mysql.exe -u root --default-character-set=utf8mb4 < docs\talentpro_mysql.sql
   ```
2. Cipta pengguna pangkalan data khas (hak SELECT, INSERT, UPDATE, DELETE sahaja) dan `config.local.php`:
   ```powershell
   php backend-php\bin\sedia-sambungan.php
   ```
   Kata laluan dijana rawak, ditulis hanya dalam `config.local.php` (diabaikan Git), dan tidak dipaparkan.
3. Cipta akaun Admin pertama:
   ```powershell
   php backend-php\bin\cipta-admin.php --username=admin --email=admin@contoh.test --nama="Admin TalentPro"
   ```
   Kata laluan awal dijana rawak dan ditulis ke `backend-php\storage\admin-awal.txt` (diabaikan Git). **Tukar selepas log masuk pertama, kemudian padam fail itu.** Guna `--set-semula` untuk menetapkan semula kata laluan admin yang sedia ada.

## Menjalankan

```powershell
php -S 127.0.0.1:8090 -t backend-php\public
```

Atau letakkan `backend-php\public` sebagai *document root* Apache (jangan dedahkan `src/`, `bin/`, `storage/` dan `config.local.php`). Asal pelayar yang dibenarkan (CORS) ditetapkan dalam `allowed_origins` pada konfigurasi; lalai `http://localhost:5173` untuk `python -m http.server 5173`.

## Ujian

```powershell
php -S 127.0.0.1:8090 -t backend-php\public          # terminal 1
php backend-php\tests\ujian-auth.php                  # terminal 2: 34 semakan
```

Ujian mencipta pengguna sementara (`ujian_*`) dengan kata laluan rawak dan memadamnya selepas selesai.

## Keselamatan: ringkasan keputusan reka bentuk

- Kata laluan: bcrypt kos 12 (`password_hash`), dicincang semula secara automatik jika kos berubah. Maksimum 72 bait kerana had bcrypt. Lajur `salt` dikekalkan mengikut kamus data tesis dan diisi rentetan rawak (bcrypt membenamkan garam sendiri).
- Mesej "Nama pengguna atau kata laluan tidak sah." sama untuk pengguna tiada dan kata laluan salah, dan masa semakan diseragamkan, supaya akaun tidak dapat diteka.
- Had percubaan: 5 kegagalan setiap (nama pengguna + IP) dalam 15 minit, kemudian dikunci (429).
- Sesi: token rawak 256-bit, disimpan di `storage/sessions` sebagai fail bernama SHA-256 token (bukan token sebenar), tamat dalam 12 jam. Tiada jadual sesi tambahan, jadi skema kekal 10 jadual seperti dalam tesis.
- Mod SQL ketat dipaksa pada setiap sambungan (lalai XAMPP menerima nilai ENUM yang salah senyap-senyap).
- Ralat dalaman ditulis ke `storage/log/ralat.log` dan tidak dihantar kepada klien.
- Pengguna pangkalan data aplikasi tidak mempunyai hak DDL.

## Had yang diketahui

- `storage/` perlu boleh ditulis oleh pelayan web. Di pelayan pengeluaran, pindahkan ke luar *document root*.
- Had percubaan bergantung pada `REMOTE_ADDR`; di belakang proksi terbalik, tetapkan pengepala IP yang dipercayai.
- Tiada pengesahan e-mel atau pemulihan kata laluan sendiri; Admin menetapkan semula kata laluan (tindakan `resetPassword` belum dibina).
