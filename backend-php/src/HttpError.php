<?php
declare(strict_types=1);

namespace TalentPro;

/** Ralat yang mesejnya (Bahasa Melayu) boleh dipaparkan kepada pengguna. */
final class HttpError extends \RuntimeException
{
    public function __construct(string $mesej, public readonly int $kod = 400)
    {
        parent::__construct($mesej, $kod);
    }
}
