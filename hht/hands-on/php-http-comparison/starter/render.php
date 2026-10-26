<?php
declare(strict_types=1);
function e(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
function render_page(array $data, string $mode, string $renderId): string {
    ob_start();
    try {
        require __DIR__ . '/templates/page.php';
        return ob_get_contents();
    } finally {
        ob_end_clean();
    }
}
