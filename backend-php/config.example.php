<?php
// Contoh konfigurasi. JANGAN isi rahsia di sini (fail ini di-commit).
// Salin sebagai config.local.php (diabaikan oleh Git) atau jalankan:
//   php backend-php/bin/sedia-sambungan.php
// supaya fail tempatan dijana dengan pengguna pangkalan data khas dan kata laluan rawak.
return [
    'db' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'name' => 'talentpro',
        'user' => 'talentpro_app',
        'pass' => '',
    ],
    // Asal (origin) pelayar yang dibenarkan memanggil API (CORS).
    'allowed_origins' => [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ],
    'session_ttl'  => 43200,   // 12 jam, selaras dengan backend tempatan
    'max_attempts' => 5,       // percubaan log masuk gagal sebelum dikunci
    'lock_seconds' => 900,     // 15 minit
    'bcrypt_cost'  => 12,
];
