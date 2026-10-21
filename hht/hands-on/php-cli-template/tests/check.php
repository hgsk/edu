<?php
declare(strict_types=1);

// Usage: php check.php /work/student-copy
if (PHP_MAJOR_VERSION !== 8 || PHP_MINOR_VERSION !== 4
    || version_compare(PHP_VERSION, '8.4.27', '<')
    || preg_match('/(?:RC|alpha|beta|dev)/i', PHP_VERSION)) {
    fwrite(STDERR, "BLOCKED: patched stable PHP 8.4.27+ is required\n");
    exit(2);
}
$source = realpath($argv[1] ?? '');
if (!$source || !is_file($source . '/build.php')) {
    fwrite(STDERR, "Usage: php check.php /work/student-copy\n");
    exit(2);
}

set_error_handler(static function (int $severity, string $message): never {
    throw new ErrorException($message, 0, $severity);
});
require $source . '/render.php';
$failures = 0;
$checks = 0;
function check(bool $condition, string $name): void
{
    global $failures, $checks;
    $checks++;
    echo ($condition ? 'PASS ' : 'FAIL ') . $name . "\n";
    if (!$condition) {
        $failures++;
    }
}
function check_page(array $data, string $label): string
{
    $html = render_page($data);
    check(str_contains($html, '<h1>' . e($data['shop']['name']) . '</h1>'), $label . ': shop');
    check(str_contains($html, '<p id="notice">' . e($data['shop']['notice']) . '</p>'), $label . ': notice');
    preg_match_all('~<li>\s*<h3>(.*?)</h3>\s*<p>(.*?)</p>\s*</li>~s', $html, $matches, PREG_SET_ORDER);
    $actual = array_map(static fn(array $m): array => [$m[1], $m[2]], $matches);
    $expected = array_map(static fn(array $b): array => [
        e($b['name']), $b['closed'] ? '本日休業' : '営業時間：' . e($b['hours']),
    ], $data['branches']);
    check($actual === $expected && substr_count($html, '<li>') === count($expected), $label . ': rows/order/conditions');
    check(preg_match('//u', $html) === 1 && !str_starts_with($html, "\xEF\xBB\xBF")
        && !str_starts_with($html, "\xFF\xFE") && str_contains($html, '<meta charset="utf-8">'), $label . ': UTF-8');
    check(!str_contains($html, '<?php') && !str_contains($html, '<?='), $label . ': no PHP markers');
    return $html;
}
function run_php(string $file, array $arguments = []): array
{
    $pipes = [];
    $process = proc_open([PHP_BINARY, $file, ...$arguments], [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, sys_get_temp_dir());
    if (!is_resource($process)) {
        throw new RuntimeException('Cannot start PHP child');
    }
    try {
        $stdout = stream_get_contents($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
    } finally {
        fclose($pipes[1]);
        fclose($pipes[2]);
    }
    $exit = proc_close($process);
    return [$exit, $stdout, $stderr];
}
function remove_test_copy(string $directory): void
{
    // 呼び出し側が作った一時フォルダーだけを消す。学生の作業場所は対象外。
    foreach (scandir($directory) as $name) {
        if ($name === '.' || $name === '..') {
            continue;
        }
        $path = $directory . '/' . $name;
        if (is_dir($path)) {
            remove_test_copy($path);
        } else {
            unlink($path);
        }
    }
    rmdir($directory);
}

$temp = sys_get_temp_dir() . '/hht-php-' . bin2hex(random_bytes(8));
mkdir($temp);
try {
    $expected = [
        'shop' => ['name' => 'NORTH LIGHT COFFEE', 'notice' => '<臨時案内> & 週末'],
        'branches' => [
            ['name' => '駅前店', 'hours' => '09:00〜19:00', 'closed' => false],
            ['name' => '公園店', 'hours' => '11:00〜18:00', 'closed' => true],
            ['name' => '港店', 'hours' => '12:00〜17:00', 'closed' => false],
        ],
    ];
    $data = require $source . '/data.php';
    check($data === $expected, 'assignment data');
    check_page($expected, 'normal');
    $changed = ['shop' => ['name' => '別の架空店', 'notice' => '切替確認'], 'branches' => [
        ['name' => 'A', 'hours' => '08:00〜09:00', 'closed' => true],
        ['name' => 'B', 'hours' => '20:00〜21:00', 'closed' => false],
        ['name' => 'C', 'hours' => '06:00〜07:00', 'closed' => true],
        ['name' => 'D', 'hours' => '14:00〜15:00', 'closed' => false],
    ]];
    check_page($changed, 'changed data');
    check_page(['shop' => $changed['shop'], 'branches' => []], 'empty list');
    $payload = '<script>alert("x")</script> & <img src=x onerror="alert(1)">';
    $html = check_page(['shop' => ['name' => $payload, 'notice' => $payload], 'branches' => [
        ['name' => $payload, 'hours' => $payload, 'closed' => false],
    ]], 'special characters');
    check(!str_contains($html, '<script') && !str_contains($html, '<img') && str_contains($html, '&amp;'), 'no injected tags');
    check(e("\"'&<>") === '&quot;&#039;&amp;&lt;&gt;', 'escape both quotes and HTML metacharacters');
    check(e("bad\xFF") === "bad\xEF\xBF\xBD", 'invalid UTF-8 substitution');

    foreach (['build.php', 'render.php', 'data.php', 'hello.php'] as $file) {
        copy($source . '/' . $file, $temp . '/' . $file);
    }
    mkdir($temp . '/templates');
    copy($source . '/templates/index.php', $temp . '/templates/index.php');
    [$exit, $stdout, $stderr] = run_php($temp . '/hello.php');
    check($exit === 0 && $stdout === "PHPでHTMLを作る\n" && $stderr === '', 'echo warmup');
    [$exit, $stdout, $stderr] = run_php($temp . '/build.php');
    check($exit === 0 && $stdout === "Generated: output/index.html (UTF-8)\n" && $stderr === '', 'file generation from another cwd');
    $file = $temp . '/output/index.html';
    $saved = is_file($file) ? file_get_contents($file) : '';
    check($saved === render_page($data), 'saved file bytes match rendered HTML');
    [$exit, $stdout, $stderr] = run_php($temp . '/build.php', ['--stdout']);
    check($exit === 0 && $stdout === $saved && $stderr === '', 'stdout equals file bytes');
    file_put_contents($file, 'MANUAL EDIT');
    run_php($temp . '/build.php');
    check(file_get_contents($file) === $saved, 'regeneration overwrites manual HTML edits');
} catch (Throwable $error) {
    $failures++;
    fwrite(STDERR, 'ERROR: ' . $error->getMessage() . "\n");
} finally {
    remove_test_copy($temp);
    echo "Temporary copy cleanup PASS\n";
}
echo "Checks: {$checks}; failures: {$failures}\n";
exit($failures === 0 ? 0 : 1);
