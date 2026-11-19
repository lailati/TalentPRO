<?php
declare(strict_types=1);

namespace TalentPro;

final class Db
{
    private static ?\PDO $pdo = null;

    /**
     * Sambungan PDO tunggal. Mod SQL ketat dipaksa kerana mod lalai XAMPP
     * menyimpan nilai ENUM yang salah sebagai kosong tanpa ralat.
     */
    public static function pdo(): \PDO
    {
        if (self::$pdo === null) {
            $dsn = sprintf(
                'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
                Config::get('db.host', '127.0.0.1'),
                (int) Config::get('db.port', 3306),
                Config::get('db.name', 'talentpro')
            );
            $pdo = new \PDO($dsn, (string) Config::get('db.user'), (string) Config::get('db.pass'), [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
                \PDO::ATTR_EMULATE_PREPARES => false,
                \PDO::ATTR_STRINGIFY_FETCHES => false,
            ]);
            $pdo->exec("SET SESSION sql_mode = 'STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");
            $pdo->exec("SET time_zone = '+08:00'");
            self::$pdo = $pdo;
        }
        return self::$pdo;
    }

    /** Pengecam rawak berawalan, contohnya usr_1a2b3c4d5e6f7a8b. */
    public static function newId(string $prefix): string
    {
        return $prefix . '_' . bin2hex(random_bytes(8));
    }
}
