<?php
/**
 * Písmo do STL – seznam fontů ve složce fonts/
 * Created by Julius Andy Antoš
 *
 * Vrací JSON pole názvů souborů .ttf, .otf a .woff, které leží ve stejné složce.
 * Nic nezapisuje a nevypisuje žádné jiné soubory.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache');
header('X-Content-Type-Options: nosniff');

$files = [];
foreach (scandir(__DIR__) as $f) {
    if (preg_match('/\.(ttf|otf|woff)$/i', $f) && is_file(__DIR__ . DIRECTORY_SEPARATOR . $f)) {
        $files[] = $f;
    }
}
natcasesort($files);
echo json_encode(array_values($files), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
