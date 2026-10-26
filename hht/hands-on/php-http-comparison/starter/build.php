<?php
declare(strict_types=1);
require __DIR__ . '/render.php';
$data = require __DIR__ . '/data.php';
$html = render_page($data, 'Python：生成済みHTMLを配信', bin2hex(random_bytes(6)));
$directory = __DIR__ . '/output';
if (!is_dir($directory) && !mkdir($directory, 0777, true)) {
    throw new RuntimeException('Cannot create output');
}
if (file_put_contents($directory . '/index.html', $html) === false
    || !copy(__DIR__ . '/public/style.css', $directory . '/style.css')) {
    throw new RuntimeException('Cannot save generated files');
}
echo "Generated: output/index.html + style.css (UTF-8)\n";
