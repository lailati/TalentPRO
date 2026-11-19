<?php
declare(strict_types=1);

namespace TalentPro;

const ROOT = __DIR__ . '/..';
const STORAGE = ROOT . '/storage';

date_default_timezone_set('Asia/Kuala_Lumpur');
mb_internal_encoding('UTF-8');
ini_set('display_errors', '0');          // jangan dedahkan butiran ralat kepada klien
ini_set('log_errors', '1');

spl_autoload_register(static function (string $class): void {
    if (strncmp($class, __NAMESPACE__ . '\\', strlen(__NAMESPACE__) + 1) !== 0) {
        return;
    }
    $file = __DIR__ . '/' . substr($class, strlen(__NAMESPACE__) + 1) . '.php';
    if (is_file($file)) {
        require $file;
    }
});

/** Tulis ralat dalaman ke storage/log/ralat.log (tidak pernah dihantar kepada klien). */
function logRalat(string $mesej): void
{
    $dir = STORAGE . '/log';
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    @file_put_contents($dir . '/ralat.log', '[' . date('c') . '] ' . $mesej . PHP_EOL, FILE_APPEND | LOCK_EX);
}

set_exception_handler(static function (\Throwable $e): void {
    logRalat(get_class($e) . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode(['ok' => false, 'error' => 'Ralat pelayan. Sila cuba sebentar lagi.', 'code' => 500], JSON_UNESCAPED_UNICODE);
});
