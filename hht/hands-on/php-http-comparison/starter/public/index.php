<?php
declare(strict_types=1);
// Built-in server may fall back to index.php for an unknown URL. Allow only this page.
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (!in_array($path, ['/', '/index.php'], true)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=UTF-8');
    echo "Not found\n";
    exit;
}
require __DIR__ . '/../render.php';
$data = require __DIR__ . '/../data.php';
header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-store');
echo render_page($data, 'PHP：リクエスト時に実行', bin2hex(random_bytes(6)));
