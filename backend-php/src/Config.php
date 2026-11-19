<?php
declare(strict_types=1);

namespace TalentPro;

final class Config
{
    private static ?array $data = null;

    private static function load(): array
    {
        if (self::$data === null) {
            $local = ROOT . '/config.local.php';
            $file = is_file($local) ? $local : ROOT . '/config.example.php';
            $cfg = require $file;
            if (!is_array($cfg)) {
                throw new \RuntimeException('Konfigurasi tidak sah: ' . basename($file));
            }
            self::$data = $cfg;
        }
        return self::$data;
    }

    /** Ambil nilai dengan kunci bertitik, contohnya "db.host". */
    public static function get(string $key, mixed $default = null): mixed
    {
        $v = self::load();
        foreach (explode('.', $key) as $part) {
            if (!is_array($v) || !array_key_exists($part, $v)) {
                return $default;
            }
            $v = $v[$part];
        }
        return $v;
    }
}
