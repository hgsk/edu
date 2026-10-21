<?php
declare(strict_types=1);

function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function render_page(array $data): string
{
    $shop = $data['shop'];
    $branches = $data['branches'];
    ob_start();
    try {
        // 固定した手元のファイルだけを読み込む。入力値をincludeのパスに使わない。
        include __DIR__ . '/templates/index.php';
        return ob_get_contents();
    } finally {
        ob_end_clean();
    }
}
