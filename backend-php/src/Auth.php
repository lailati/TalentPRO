<?php
declare(strict_types=1);

namespace TalentPro;

/**
 * Pengesahan identiti: log masuk, log keluar, sesi semasa dan tukar kata laluan.
 * Mesej ralat (Bahasa Melayu) sama dengan kontrak dalam PROJECT.md bahagian 5.
 */
final class Auth
{
    /** Cincangan bcrypt sah untuk menyeragamkan masa semakan apabila pengguna tidak wujud. */
    private const DUMMY_HASH = '$2y$12$CazLVQ229nQqBWgkzBezBuqXvNPqYUb0ung0CQPMlc1/7oLNbSlwu';

    private const USER_COLS = 'id, username, email, full_name, role, department, status, last_login, created_at, updated_at';

    private static function iso(?string $dt): string
    {
        if ($dt === null || $dt === '') {
            return '';
        }
        return (new \DateTimeImmutable($dt, new \DateTimeZone('+08:00')))->format('Y-m-d\TH:i:sP');
    }

    /** Pengguna yang selamat dihantar kepada klien: tanpa salt dan password_hash. */
    public static function publicUser(array $r): array
    {
        return [
            'id' => $r['id'],
            'username' => $r['username'],
            'email' => $r['email'],
            'full_name' => $r['full_name'],
            'role' => $r['role'],
            'department' => (string) ($r['department'] ?? ''),
            'status' => $r['status'],
            'last_login' => self::iso($r['last_login'] ?? null),
            'created_at' => self::iso($r['created_at'] ?? null),
            'updated_at' => self::iso($r['updated_at'] ?? null),
        ];
    }

    /** @return array{token:string,user:array} */
    public static function login(array $p, string $ip): array
    {
        $username = trim((string) ($p['username'] ?? ''));
        $password = (string) ($p['password'] ?? '');
        if ($username === '' || $password === '' || mb_strlen($username) > 120 || strlen($password) > 1024) {
            throw new HttpError('Nama pengguna atau kata laluan tidak sah.', 401);
        }
        $key = mb_strtolower($username) . '|' . $ip;
        $wait = RateLimit::lockedFor($key);
        if ($wait > 0) {
            throw new HttpError('Terlalu banyak percubaan gagal. Cuba lagi selepas ' . (int) ceil($wait / 60) . ' minit.', 429);
        }

        // Dua parameter bernama berbeza: PDO tanpa emulasi tidak membenarkan nama yang sama digunakan dua kali.
        $st = Db::pdo()->prepare('SELECT * FROM users WHERE LOWER(username) = :u1 OR LOWER(email) = :u2 LIMIT 1');
        $st->execute(['u1' => mb_strtolower($username), 'u2' => mb_strtolower($username)]);
        $u = $st->fetch();

        $ok = password_verify($password, $u ? (string) $u['password_hash'] : self::DUMMY_HASH);
        if (!$u || !$ok) {
            RateLimit::fail($key);
            throw new HttpError('Nama pengguna atau kata laluan tidak sah.', 401);
        }
        if ($u['status'] !== 'Active') {
            throw new HttpError('Akaun ini tidak aktif. Sila hubungi pentadbir.', 403);
        }
        RateLimit::clear($key);

        if (password_needs_rehash((string) $u['password_hash'], PASSWORD_BCRYPT, ['cost' => (int) Config::get('bcrypt_cost', 12)])) {
            self::setPassword((string) $u['id'], $password);
        }
        Db::pdo()->prepare('UPDATE users SET last_login = NOW() WHERE id = :id')->execute(['id' => $u['id']]);
        $fresh = self::findById((string) $u['id']);
        return ['token' => Sessions::issue((string) $u['id']), 'user' => self::publicUser($fresh)];
    }

    public static function findById(string $id): ?array
    {
        $st = Db::pdo()->prepare('SELECT ' . self::USER_COLS . ' FROM users WHERE id = :id');
        $st->execute(['id' => $id]);
        return $st->fetch() ?: null;
    }

    /** Pengguna bagi token yang sah; melontar 401 jika tiada atau tidak aktif. */
    public static function requireUser(string $token): array
    {
        $uid = Sessions::userId($token);
        if ($uid === null) {
            throw new HttpError('Sesi tamat. Sila log masuk semula.', 401);
        }
        $u = self::findById($uid);
        if (!$u || $u['status'] !== 'Active') {
            Sessions::destroy($token);
            throw new HttpError('Akaun tidak aktif.', 401);
        }
        return $u;
    }

    public static function setPassword(string $userId, string $password): void
    {
        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => (int) Config::get('bcrypt_cost', 12)]);
        Db::pdo()->prepare('UPDATE users SET password_hash = :h WHERE id = :id')->execute(['h' => $hash, 'id' => $userId]);
    }

    public static function validateNewPassword(string $password): void
    {
        if (mb_strlen($password) < 8) {
            throw new HttpError('Kata laluan mestilah sekurang-kurangnya 8 aksara.');
        }
        if (strlen($password) > 72) {   // bcrypt hanya menggunakan 72 bait pertama
            throw new HttpError('Kata laluan terlalu panjang (maksimum 72 bait).');
        }
    }

    public static function changePassword(array $user, array $p, string $token): bool
    {
        $current = (string) ($p['current'] ?? '');
        $new = (string) ($p['password'] ?? '');
        self::validateNewPassword($new);
        $st = Db::pdo()->prepare('SELECT password_hash FROM users WHERE id = :id');
        $st->execute(['id' => $user['id']]);
        $hash = (string) $st->fetchColumn();
        if (!password_verify($current, $hash)) {
            throw new HttpError('Kata laluan semasa tidak betul.');
        }
        self::setPassword((string) $user['id'], $new);
        Sessions::destroyAllOf((string) $user['id'], $token);   // sesi lain dibatalkan
        return true;
    }
}
