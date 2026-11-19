<?php
declare(strict_types=1);

namespace TalentPro;

/** Had percubaan log masuk gagal (per nama pengguna dan alamat IP) untuk menyukarkan serangan teka kata laluan. */
final class RateLimit
{
    private static function file(string $key): string
    {
        $d = STORAGE . '/ratelimit';
        if (!is_dir($d) && !@mkdir($d, 0775, true) && !is_dir($d)) {
            throw new \RuntimeException('Tidak dapat mencipta folder had percubaan.');
        }
        return $d . '/' . hash('sha256', $key) . '.json';
    }

    private static function read(string $key): array
    {
        $d = json_decode((string) @file_get_contents(self::file($key)), true);
        $win = (int) Config::get('lock_seconds', 900);
        if (!is_array($d) || ($d['first'] ?? 0) + $win < time()) {
            return ['count' => 0, 'first' => time()];
        }
        return $d;
    }

    /** Saat yang tinggal sebelum boleh mencuba lagi; 0 jika tidak dikunci. */
    public static function lockedFor(string $key): int
    {
        $d = self::read($key);
        if ($d['count'] >= (int) Config::get('max_attempts', 5)) {
            return max(1, $d['first'] + (int) Config::get('lock_seconds', 900) - time());
        }
        return 0;
    }

    public static function fail(string $key): void
    {
        $d = self::read($key);
        $d['count']++;
        file_put_contents(self::file($key), json_encode($d), LOCK_EX);
    }

    public static function clear(string $key): void
    {
        @unlink(self::file($key));
    }
}
