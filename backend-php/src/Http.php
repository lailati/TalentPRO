<?php
declare(strict_types=1);

namespace TalentPro;

/**
 * Penghala API. Sampul permintaan/respons sama dengan kontrak Apps Script:
 *   POST  {action, payload, token}  ->  {ok:true,data} atau {ok:false,error,code}
 *   GET   -> pemeriksaan kesihatan
 */
final class Http
{
    private const MAX_BODY = 1048576;   // 1 MB

    public static function handle(): void
    {
        self::cors();
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');

        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        if ($method === 'OPTIONS') {
            http_response_code(204);
            return;
        }
        try {
            if ($method === 'GET') {
                self::send(self::health());
                return;
            }
            if ($method !== 'POST') {
                throw new HttpError('Kaedah tidak dibenarkan.', 405);
            }
            self::send(self::dispatch(self::readBody()));
        } catch (HttpError $e) {
            self::fail($e->getMessage(), $e->kod);
        }
    }

    private static function cors(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        header('Vary: Origin');
        if ($origin !== '' && in_array($origin, (array) Config::get('allowed_origins', []), true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type');
            header('Access-Control-Max-Age: 600');
        }
    }

    private static function readBody(): array
    {
        $raw = (string) file_get_contents('php://input', false, null, 0, self::MAX_BODY + 1);
        if (strlen($raw) > self::MAX_BODY) {
            throw new HttpError('Permintaan terlalu besar.', 413);
        }
        $body = json_decode($raw, true);
        if (!is_array($body)) {
            throw new HttpError('Permintaan tidak sah.', 400);
        }
        return $body;
    }

    private static function dispatch(array $body): mixed
    {
        $action = $body['action'] ?? '';
        $payload = is_array($body['payload'] ?? null) ? $body['payload'] : [];
        $token = is_string($body['token'] ?? null) ? $body['token'] : '';
        if (!is_string($action) || !preg_match('/^[A-Za-z]{2,30}$/', $action)) {
            throw new HttpError('Tindakan tidak sah.', 400);
        }

        if ($action === 'login') {
            return Auth::login($payload, $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
        }

        $known = ['logout', 'me', 'changePassword'];
        if (!in_array($action, $known, true)) {
            throw new HttpError('Tindakan tidak dikenali.', 404);
        }
        $user = Auth::requireUser($token);

        return match ($action) {
            'logout' => (function () use ($token) { Sessions::destroy($token); return true; })(),
            'me' => ['user' => Auth::publicUser($user)],
            'changePassword' => Auth::changePassword($user, $payload, $token),
        };
    }

    private static function health(): array
    {
        $n = (int) Db::pdo()->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'")->fetchColumn();
        return ['service' => 'TalentPro PHP', 'status' => 'ok', 'tables' => $n];
    }

    private static function send(mixed $data): void
    {
        echo json_encode(['ok' => true, 'data' => $data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    private static function fail(string $mesej, int $kod): void
    {
        http_response_code($kod);
        echo json_encode(['ok' => false, 'error' => $mesej, 'code' => $kod], JSON_UNESCAPED_UNICODE);
    }
}
