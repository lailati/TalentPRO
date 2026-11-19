<?php
declare(strict_types=1);

// Titik masuk tunggal API TalentPro. Hanya folder public/ patut didedahkan oleh pelayan web.
require __DIR__ . '/../src/bootstrap.php';

\TalentPro\Http::handle();
