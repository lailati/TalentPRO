<?php
declare(strict_types=1);

/**
 * Ujian integrasi API pengesahan terhadap pelayan sebenar dan pangkalan data sebenar.
 *
 *   php -S 127.0.0.1:8090 -t backend-php/public          (terminal 1)
 *   php backend-php/tests/ujian-auth.php [http://127.0.0.1:8090]   (terminal 2)
 *
 * Ujian mencipta pengguna sementara (awalan ujian_) dengan kata laluan rawak, dan memadamnya
 * selepas selesai. Akaun admin sebenar tidak digunakan.
 */

use TalentPro\Db;

require __DIR__ . '/../src/bootstrap.php';

$base = rtrim($argv[1] ?? 'http://127.0.0.1:8090', '/');
$pdo = Db::pdo();
$lulus = 0;
$gagal = 0;

function semak(string $nama, bool $syarat, string $butiran = ''): void
{
    global $lulus, $gagal;
    if ($syarat) {
        $lulus++;
        echo "  LULUS  $nama\n";
    } else {
        $gagal++;
        echo "  GAGAL  $nama" . ($butiran !== '' ? "  -> $butiran" : '') . "\n";
    }
}

/** @return array{0:int,1:array,2:array} [status HTTP, badan JSON, pengepala] */
function panggil(string $base, ?array $body, string $kaedah = 'POST', array $pengepala = [], ?string $mentah = null): array
{
    $h = array_merge(['Content-Type: text/plain;charset=utf-8'], $pengepala);
    $ctx = stream_context_create(['http' => [
        'method' => $kaedah, 'header' => implode("\r\n", $h),
        'content' => $mentah ?? ($body !== null ? json_encode($body) : ''), 'ignore_errors' => true, 'timeout' => 20,
    ]]);
    $r = @file_get_contents($base . '/', false, $ctx);
    $status = 0;
    $hdr = [];
    foreach ($http_response_header ?? [] as $line) {
        if (preg_match('#^HTTP/\S+ (\d{3})#', $line, $m)) {
            $status = (int) $m[1];
        } elseif (str_contains($line, ':')) {
            [$k, $v] = explode(':', $line, 2);
            $hdr[strtolower(trim($k))] = trim($v);
        }
    }
    return [$status, (array) json_decode((string) $r, true), $hdr];
}

function pengguna(PDO $pdo, string $nama, string $kata, string $status = 'Active', string $peranan = 'lecturer'): string
{
    $id = Db::newId('ujian');
    $pdo->prepare('INSERT INTO users (id, username, email, full_name, role, status, salt, password_hash)
                   VALUES (:id, :u, :e, :n, :r, :s, :salt, :h)')->execute([
        'id' => $id, 'u' => $nama, 'e' => $nama . '@ujian.test', 'n' => 'Pengguna Ujian', 'r' => $peranan, 's' => $status,
        'salt' => 'x', 'h' => password_hash($kata, PASSWORD_BCRYPT, ['cost' => 4]),
    ]);
    return $id;
}

$sufiks = bin2hex(random_bytes(3));
$nama = "ujian_$sufiks";
$kata = bin2hex(random_bytes(10));
$idAktif = pengguna($pdo, $nama, $kata);
$idTidakAktif = pengguna($pdo, "ujian_off_$sufiks", $kata, 'Inactive');
$idKunci = pengguna($pdo, "ujian_kunci_$sufiks", $kata);

try {
    echo "Kesihatan dan penghala\n";
    [$s, $j] = panggil($base, null, 'GET');
    semak('GET memulangkan kesihatan', $s === 200 && ($j['ok'] ?? false) && ($j['data']['tables'] ?? 0) >= 10, json_encode($j));
    [$s, $j] = panggil($base, null, 'POST', [], '{bukan json');
    semak('JSON rosak ditolak 400', $s === 400 && ($j['ok'] ?? true) === false);
    [$s, $j] = panggil($base, ['action' => 'tiadaTindakan', 'token' => '']);
    semak('Tindakan tidak dikenali 404', $s === 404);
    [$s, $j] = panggil($base, ['action' => '../etc', 'token' => '']);
    semak('Nama tindakan tidak sah 400', $s === 400);
    [$s] = panggil($base, null, 'PUT');
    semak('Kaedah PUT ditolak 405', $s === 405);

    echo "Log masuk\n";
    [$s, $j] = panggil($base, ['action' => 'login', 'payload' => ['username' => $nama, 'password' => 'salah-salah']]);
    semak('Kata laluan salah 401', $s === 401 && $j['error'] === 'Nama pengguna atau kata laluan tidak sah.');
    [$s, $j] = panggil($base, ['action' => 'login', 'payload' => ['username' => 'tiada_pengguna_ini', 'password' => 'apa-apa-sahaja']]);
    semak('Pengguna tiada: mesej sama (tidak bocor)', $s === 401 && $j['error'] === 'Nama pengguna atau kata laluan tidak sah.');
    [$s, $j] = panggil($base, ['action' => 'login', 'payload' => ['username' => "ujian_off_$sufiks", 'password' => $kata]]);
    semak('Akaun tidak aktif 403', $s === 403 && str_contains($j['error'], 'tidak aktif'));
    [$s, $j] = panggil($base, ['action' => 'login', 'payload' => ['username' => '', 'password' => '']]);
    semak('Medan kosong 401', $s === 401);

    [$s, $j] = panggil($base, ['action' => 'login', 'payload' => ['username' => strtoupper($nama), 'password' => $kata]]);
    $token = $j['data']['token'] ?? '';
    semak('Log masuk berjaya (nama pengguna tidak peka huruf besar/kecil)', $s === 200 && preg_match('/^[a-f0-9]{64}$/', $token) === 1, json_encode($j));
    $u = $j['data']['user'] ?? [];
    semak('Pengguna tidak mengandungi salt atau password_hash', !array_key_exists('password_hash', $u) && !array_key_exists('salt', $u) && ($u['role'] ?? '') === 'lecturer');
    semak('last_login dikemas kini dan berformat ISO 8601', preg_match('/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\+08:00$/', $u['last_login'] ?? '') === 1, (string) ($u['last_login'] ?? ''));

    [$s, $j] = panggil($base, ['action' => 'login', 'payload' => ['username' => $nama . '@ujian.test', 'password' => $kata]]);
    semak('Log masuk dengan e-mel berjaya', $s === 200 && isset($j['data']['token']));

    echo "Sesi\n";
    [$s, $j] = panggil($base, ['action' => 'me', 'token' => $token]);
    semak('me memulangkan pengguna', $s === 200 && ($j['data']['user']['username'] ?? '') === $nama);
    [$s, $j] = panggil($base, ['action' => 'me', 'token' => '']);
    semak('me tanpa token 401', $s === 401 && $j['error'] === 'Sesi tamat. Sila log masuk semula.');
    [$s] = panggil($base, ['action' => 'me', 'token' => str_repeat('a', 64)]);
    semak('Token rekaan 401', $s === 401);
    [$s] = panggil($base, ['action' => 'me', 'token' => "../../x"]);
    semak('Token berformat salah 401', $s === 401);

    echo "Tukar kata laluan\n";
    [$s, $j] = panggil($base, ['action' => 'changePassword', 'token' => $token, 'payload' => ['current' => 'bukan-ini-woi', 'password' => 'KataBaharu12345']]);
    semak('Kata laluan semasa salah ditolak', $s === 400 && str_contains($j['error'], 'semasa tidak betul'));
    [$s, $j] = panggil($base, ['action' => 'changePassword', 'token' => $token, 'payload' => ['current' => $kata, 'password' => 'pendek']]);
    semak('Kata laluan baharu < 8 aksara ditolak', $s === 400 && str_contains($j['error'], 'sekurang-kurangnya 8'));
    [$s, $j] = panggil($base, ['action' => 'changePassword', 'token' => $token, 'payload' => ['current' => $kata, 'password' => str_repeat('a', 73)]]);
    semak('Kata laluan > 72 bait ditolak', $s === 400);
    // sesi kedua untuk membuktikan sesi lain dibatalkan
    [, $j2] = panggil($base, ['action' => 'login', 'payload' => ['username' => $nama, 'password' => $kata]]);
    $token2 = $j2['data']['token'] ?? '';
    $baharu = 'KataBaharu-' . bin2hex(random_bytes(4));
    [$s, $j] = panggil($base, ['action' => 'changePassword', 'token' => $token, 'payload' => ['current' => $kata, 'password' => $baharu]]);
    semak('Tukar kata laluan berjaya', $s === 200 && ($j['data'] ?? null) === true);
    [$s] = panggil($base, ['action' => 'me', 'token' => $token]);
    semak('Sesi semasa kekal sah', $s === 200);
    [$s] = panggil($base, ['action' => 'me', 'token' => $token2]);
    semak('Sesi lain dibatalkan', $s === 401);
    [$s] = panggil($base, ['action' => 'login', 'payload' => ['username' => $nama, 'password' => $kata]]);
    semak('Kata laluan lama tidak lagi sah', $s === 401);
    [$s, $j] = panggil($base, ['action' => 'login', 'payload' => ['username' => $nama, 'password' => $baharu]]);
    semak('Kata laluan baharu sah', $s === 200);
    $hash = (string) $pdo->query("SELECT password_hash FROM users WHERE id = '$idAktif'")->fetchColumn();
    semak('Cincangan disimpan sebagai bcrypt (60 aksara, muat lajur varchar(64))', strlen($hash) === 60 && str_starts_with($hash, '$2y$'));

    echo "Log keluar\n";
    [$s, $j] = panggil($base, ['action' => 'logout', 'token' => $token]);
    semak('Log keluar berjaya', $s === 200 && ($j['data'] ?? null) === true);
    [$s] = panggil($base, ['action' => 'me', 'token' => $token]);
    semak('Token tidak sah selepas log keluar', $s === 401);

    echo "Akaun dinyahaktifkan semasa sesi\n";
    [, $j] = panggil($base, ['action' => 'login', 'payload' => ['username' => $nama, 'password' => $baharu]]);
    $t3 = $j['data']['token'] ?? '';
    $pdo->exec("UPDATE users SET status = 'Inactive' WHERE id = '$idAktif'");
    [$s] = panggil($base, ['action' => 'me', 'token' => $t3]);
    semak('Sesi pengguna yang dinyahaktifkan ditolak', $s === 401);

    echo "Had percubaan log masuk\n";
    $maks = (int) \TalentPro\Config::get('max_attempts', 5);
    for ($i = 0; $i < $maks; $i++) {
        panggil($base, ['action' => 'login', 'payload' => ['username' => "ujian_kunci_$sufiks", 'password' => 'salah-' . $i . '-xxxx']]);
    }
    [$s, $j] = panggil($base, ['action' => 'login', 'payload' => ['username' => "ujian_kunci_$sufiks", 'password' => $kata]]);
    semak("Dikunci selepas $maks kegagalan (429), walaupun kata laluan betul", $s === 429 && str_contains($j['error'], 'Terlalu banyak'), (string) $s);

    echo "CORS\n";
    [, , $h] = panggil($base, null, 'GET', ['Origin: http://localhost:5173']);
    semak('Asal dibenarkan menerima pengepala CORS', ($h['access-control-allow-origin'] ?? '') === 'http://localhost:5173');
    [, , $h] = panggil($base, null, 'GET', ['Origin: http://jahat.example']);
    semak('Asal tidak dibenarkan tidak menerima pengepala CORS', !isset($h['access-control-allow-origin']));
    [$s, , $h] = panggil($base, null, 'OPTIONS', ['Origin: http://localhost:5173']);
    semak('OPTIONS dijawab 204', $s === 204);
    semak('Respons tidak boleh dicache', str_contains($h['cache-control'] ?? '', 'no-store'));
} finally {
    $pdo->prepare("DELETE FROM users WHERE id IN (?, ?, ?)")->execute([$idAktif, $idTidakAktif, $idKunci]);
    foreach (glob(\TalentPro\STORAGE . '/ratelimit/*.json') ?: [] as $f) {
        @unlink($f);
    }
    foreach (glob(\TalentPro\STORAGE . '/sessions/*.json') ?: [] as $f) {
        $d = json_decode((string) @file_get_contents($f), true);
        if (is_array($d) && str_starts_with((string) ($d['uid'] ?? ''), 'ujian_')) {
            @unlink($f);
        }
    }
}

echo "\nJumlah: $lulus lulus, $gagal gagal\n";
exit($gagal === 0 ? 0 : 1);
