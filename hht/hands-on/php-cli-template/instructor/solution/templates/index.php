<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>店舗案内</title>
</head>
<body>
  <main>
    <h1><?= e($shop['name']) ?></h1>
    <p id="notice"><?= e($shop['notice']) ?></p>
    <h2>店舗一覧</h2>
    <ul id="branches">
      <?php foreach ($branches as $branch): ?>
      <li>
        <h3><?= e($branch['name']) ?></h3>
        <?php if ($branch['closed']): ?>
        <p>本日休業</p>
        <?php else: ?>
        <p>営業時間：<?= e($branch['hours']) ?></p>
        <?php endif; ?>
      </li>
      <?php endforeach; ?>
    </ul>
  </main>
</body>
</html>
