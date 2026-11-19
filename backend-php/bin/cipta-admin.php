<?php
declare(strict_types=1);

/**
 * Mencipta akaun Admin pertama.
 *
 *   php backend-php/bin/cipta-admin.php --username=admin --email=admin@contoh.test --nama="Admin TalentPro"
 *       [--kata-laluan-ke-fail=backend-php/storage/admin-awal.txt]   (lalai jika kata laluan tidak diberi)
 *       [--kata-laluan=...]                                          (elak; kekal dalam sejarah shell)
 *       [--set-semula]                                               (tetapkan semula kata laluan admin sedia ada)
 *
 * Jika kata laluan tidak diberi, satu kata laluan rawak dijana dan ditulis ke fail (di dalam
 * storage/, diabaikan oleh Git). Kata laluan tidak dipaparkan di terminal. Tukar selepas log masuk pertama.
 */

use TalentPro\Auth;
use TalentPro\Db;

if (PHP_SAPI !== 'cli') {
    exit("Skrip ini hanya untuk baris perintah.\n");
}
require __DIR__ . '/../src/bootstrap.php';

$o = [];
foreach (array_slice($argv, 1) as $a) {
    if (preg_match('/^--([a-z-]+)(?:=(.*))?$/s', $a, $m)) {
        $o[$m[1]] = $m[2] ?? '1';
    }
}
$username = trim($o['username'] ?? 'admin');
$email = trim($o['email'] ?? '');
$nama = trim($o['nama'] ?? 'Admin TalentPro');
$reset = isset($o['set-semula']);

if (!preg_match('/^[A-Za-z0-9._-]{3,60}$/', $username)) {
    exit("Nama pengguna tidak sah (3-60 aksara: huruf, nombor, titik, garis bawah, sempang).\n");
}
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 120) {
    exit("Sila beri --email yang sah.\n");
}

$password = $o['kata-laluan'] ?? null;
$generated = false;
if ($password === null) {
    $password = rtrim(strtr(base64_encode(random_bytes(15)), '+/', 'Aa'), '=');   // 20 aksara
    $generated = true;
}
try {
    Auth::validateNewPassword($password);
} catch (TalentPro\HttpError $e) {
    exit($e->getMessage() . "\n");
}

$pdo = Db::pdo();
$st = $pdo->prepare('SELECT id, role FROM users WHERE LOWER(username) = LOWER(:u) OR LOWER(email) = LOWER(:e) LIMIT 1');   // :u dan :e berbeza (tiada pengulangan)
$st->execute(['u' => $username, 'e' => $email]);
$ada = $st->fetch();

if ($ada) {
    if (!$reset || $ada['role'] !== 'admin') {
        exit("Pengguna atau e-mel itu sudah wujud" . ($ada['role'] !== 'admin' ? ' (bukan admin)' : '') . ". Guna --set-semula untuk menetapkan semula kata laluan admin sedia ada.\n");
    }
    Auth::setPassword((string) $ada['id'], $password);
    $pdo->prepare('UPDATE users SET status = \'Active\' WHERE id = :id')->execute(['id' => $ada['id']]);
    TalentPro\Sessions::destroyAllOf((string) $ada['id']);
    $hasil = "Kata laluan admin '$username' ditetapkan semula.";
} else {
    $pdo->prepare('INSERT INTO users (id, username, email, full_name, role, department, status, salt, password_hash)
                   VALUES (:id, :u, :e, :n, \'admin\', \'Pejabat Fakulti\', \'Active\', :salt, :h)')
        ->execute([
            'id' => Db::newId('usr'), 'u' => $username, 'e' => $email, 'n' => $nama,
            'salt' => bin2hex(random_bytes(16)),   // lajur mengikut kamus data; bcrypt telah membenamkan garam sendiri
            'h' => password_hash($password, PASSWORD_BCRYPT, ['cost' => (int) TalentPro\Config::get('bcrypt_cost', 12)]),
        ]);
    $hasil = "Akaun admin '$username' dicipta.";
}
echo $hasil . "\n";

if ($generated) {
    $fail = $o['kata-laluan-ke-fail'] ?? (TalentPro\STORAGE . '/admin-awal.txt');
    $isi = "TalentPro: kata laluan awal admin (tukar selepas log masuk pertama, kemudian padam fail ini)\n"
         . "Nama pengguna: $username\nKata laluan: $password\nDijana: " . date('c') . "\n";
    file_put_contents($fail, $isi, LOCK_EX);
    echo "Kata laluan awal ditulis ke: " . realpath($fail) . "\n";
}
