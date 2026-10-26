<?php
declare(strict_types=1);

// 修正済み8.4系だけを受け付ける。別系列・RC・旧版へ自動フォールバックしない。
if (PHP_MAJOR_VERSION !== 8 || PHP_MINOR_VERSION !== 4
    || version_compare(PHP_VERSION, '8.4.27', '<')
    || preg_match('/(?:RC|alpha|beta|dev)/i', PHP_VERSION)) {
    fwrite(STDERR, "BLOCKED: patched stable PHP 8.4.27+ (8.4 series) is required\n");
    exit(2);
}

require __DIR__ . '/render.php';
$data = require __DIR__ . '/data.php';
$html = render_page($data);
if (preg_match('//u', $html) !== 1) {
    throw new RuntimeException('Output must be valid UTF-8');
}

if ($argc === 2 && $argv[1] === '--stdout') {
    echo $html;
} elseif ($argc === 1) {
    $directory = __DIR__ . '/output';
    if (!is_dir($directory) && !mkdir($directory, 0777, true)) {
        throw new RuntimeException('Cannot create output directory');
    }
    if (file_put_contents($directory . '/index.html', $html) === false) {
        throw new RuntimeException('Cannot write output/index.html');
    }
    echo "Generated: output/index.html (UTF-8)\n";
} else {
    fwrite(STDERR, "Usage: php build.php [--stdout]\n");
    exit(2);
}
