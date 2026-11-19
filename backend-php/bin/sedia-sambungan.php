<?php
declare(strict_types=1);

/**
 * Menyediakan pengguna pangkalan data khas aplikasi (hak minimum) dan menjana config.local.php.
 *
 *   php backend-php/bin/sedia-sambungan.php [--root-user=root] [--root-pass=] [--host=127.0.0.1] [--port=3306] [--db=talentpro]
 *
 * Kata laluan pengguna aplikasi dijana secara rawak dan HANYA ditulis dalam config.local.php
 * (diabaikan oleh Git). Ia tidak dipaparkan di terminal.
 */

if (PHP_SAPI !== 'cli') {
    exit("Skrip ini hanya untuk baris perintah.\n");
}

$o = [];
foreach (array_slice($argv, 1) as $a) {
    if (preg_match('/^--([a-z-]+)=(.*)$/', $a, $m)) {
        $o[$m[1]] = $m[2];
    }
}
$host = $o['host'] ?? '127.0.0.1';
$port = (int) ($o['port'] ?? 3306);
$db = $o['db'] ?? 'talentpro';
$rootUser = $o['root-user'] ?? 'root';
$rootPass = $o['root-pass'] ?? '';
$appUser = 'talentpro_app';

if (!preg_match('/^[A-Za-z0-9_]{1,64}$/', $db)) {
    exit("Nama pangkalan data tidak sah.\n");
}
$target = dirname(__DIR__) . '/config.local.php';
if (is_file($target)) {
    exit("config.local.php sudah wujud. Padam fail itu dahulu jika mahu menjana semula (pengguna lama kekal).\n");
}

try {
    $pdo = new PDO("mysql:host=$host;port=$port;charset=utf8mb4", $rootUser, $rootPass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
} catch (PDOException $e) {
    exit("Tidak dapat menyambung sebagai $rootUser: " . $e->getMessage() . "\n");
}
$exists = $pdo->prepare('SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name = ?');
$exists->execute([$db]);
if (!(int) $exists->fetchColumn()) {
    exit("Pangkalan data $db belum wujud. Jalankan docs/talentpro_mysql.sql dahulu.\n");
}

$pass = rtrim(strtr(base64_encode(random_bytes(24)), '+/', '-_'), '=');   // 32 aksara rawak
foreach (['localhost', '127.0.0.1'] as $h) {
    $pdo->exec("CREATE USER IF NOT EXISTS '$appUser'@'$h' IDENTIFIED BY " . $pdo->quote($pass));
    // Jika pengguna sudah wujud, tetapkan kata laluan baharu supaya sepadan dengan config yang dijana.
    $pdo->exec("ALTER USER '$appUser'@'$h' IDENTIFIED BY " . $pdo->quote($pass));
    $pdo->exec("GRANT SELECT, INSERT, UPDATE, DELETE ON `$db`.* TO '$appUser'@'$h'");
}

$cfg = require dirname(__DIR__) . '/config.example.php';
$cfg['db'] = ['host' => $host, 'port' => $port, 'name' => $db, 'user' => $appUser, 'pass' => $pass];
file_put_contents($target, "<?php\n// Dijana oleh bin/sedia-sambungan.php. Fail ini RAHSIA dan diabaikan oleh Git.\nreturn " . var_export($cfg, true) . ";\n");
echo "Siap. Pengguna $appUser dicipta dengan hak SELECT, INSERT, UPDATE, DELETE pada $db.\n";
echo "Konfigurasi ditulis ke: $target\n";
