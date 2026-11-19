<?php
declare(strict_types=1);

namespace TalentPro;

/**
 * Sesi sebelah pelayan dalam fail (storage/sessions). Tiada jadual tambahan
 * dalam pangkalan data supaya skema kekal 10 jadual seperti kamus data tesis.
 * Nama fail ialah SHA-256 bagi token, jadi kandungan folder tidak mendedahkan token.
 */
final class Sessions
{
    private static function dir(): string
    {
        $d = STORAGE . '/sessions';
        if (!is_dir($d) && !@mkdir($d, 0775, true) && !is_dir($d)) {
            throw new \RuntimeException('Tidak dapat mencipta folder sesi.');
        }
        return $d;
    }

    private static function path(string $token): string
    {
        return self::dir() . '/' . hash('sha256', $token) . '.json';
    }

    public static function validFormat(string $token): bool
    {
        return (bool) preg_match('/^[a-f0-9]{64}$/', $token);
    }

    /** Keluarkan token baharu bagi pengguna. */
    public static function issue(string $userId): string
    {
        $token = bin2hex(random_bytes(32));
        $data = ['uid' => $userId, 'created' => time(), 'exp' => time() + (int) Config::get('session_ttl', 43200)];
        $tmp = self::path($token) . '.tmp' . bin2hex(random_bytes(4));
        file_put_contents($tmp, json_encode($data), LOCK_EX);
        rename($tmp, self::path($token));
        if (random_int(1, 50) === 1) {
            self::gc();
        }
        return $token;
    }

    /** @return string|null id pengguna jika token sah dan belum tamat */
    public static function userId(string $token): ?string
    {
        if (!self::validFormat($token)) {
            return null;
        }
        $f = self::path($token);
        if (!is_file($f)) {
            return null;
        }
        $d = json_decode((string) @file_get_contents($f), true);
        if (!is_array($d) || ($d['exp'] ?? 0) < time()) {
            @unlink($f);
            return null;
        }
        return (string) $d['uid'];
    }

    public static function destroy(string $token): void
    {
        if (self::validFormat($token)) {
            @unlink(self::path($token));
        }
    }

    /** Batalkan semua sesi pengguna kecuali satu token (cth. selepas tukar kata laluan). */
    public static function destroyAllOf(string $userId, ?string $exceptToken = null): void
    {
        $keep = $exceptToken !== null ? self::path($exceptToken) : null;
        foreach (glob(self::dir() . '/*.json') ?: [] as $f) {
            if ($f === $keep) {
                continue;
            }
            $d = json_decode((string) @file_get_contents($f), true);
            if (is_array($d) && ($d['uid'] ?? null) === $userId) {
                @unlink($f);
            }
        }
    }

    private static function gc(): void
    {
        foreach (glob(self::dir() . '/*.json') ?: [] as $f) {
            $d = json_decode((string) @file_get_contents($f), true);
            if (!is_array($d) || ($d['exp'] ?? 0) < time()) {
                @unlink($f);
            }
        }
    }
}
