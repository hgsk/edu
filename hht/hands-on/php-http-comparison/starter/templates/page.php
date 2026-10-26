<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>店舗案内：HTTP配信の比較</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main>
    <h1>NORTH LIGHT COFFEE</h1>
    <p><?= e($data['notice']) ?></p>
    <p id="render"><?= e($mode) ?> ／ 生成ID：<?= e($renderId) ?></p>
    <h2>店舗一覧</h2>
    <ul>
      <?php foreach ($data['branches'] as $branch): ?>
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
