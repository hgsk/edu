"use strict";

const ITEMS = [
  { course: "words", target: "browser", reading: "ブラウザー", meaning: "Webページを見るためのソフト", example: "Google Chrome / Firefox", visual: 0 },
  { course: "words", target: "editor", reading: "エディター", meaning: "コードを書くためのソフト", example: "Visual Studio Code", visual: 1 },
  { course: "words", target: "header", reading: "ヘッダー", meaning: "ページ上部の共通エリア", example: "<header>...</header>", visual: 2 },
  { course: "words", target: "footer", reading: "フッター", meaning: "ページ下部の共通エリア", example: "<footer>...</footer>", visual: 3 },
  { course: "words", target: "main", reading: "メイン", meaning: "ページの中心となる内容", example: "<main>...</main>", visual: 4 },
  { course: "words", target: "section", reading: "セクション", meaning: "内容をテーマごとに分けたまとまり", example: "<section>...</section>", visual: 5 },
  { course: "words", target: "class", reading: "クラス", meaning: "複数の要素に使える名前", example: "class=\"menu-card\"", visual: 6 },
  { course: "words", target: "responsive", reading: "レスポンシブ", meaning: "画面幅に合わせて表示を変える設計", example: "@media (max-width: 600px)", visual: 7 },
  { course: "words", target: "deploy", reading: "デプロイ", meaning: "作ったファイルを利用できる場所へ配置すること", example: "staging → production", visual: 8 },
  { course: "words", target: "backup", reading: "バックアップ", meaning: "元に戻せるようデータを保存すること", example: "git commit", visual: 9 },
  { course: "html", target: "<h1>", reading: "エイチワン", meaning: "ページで最も大切な見出し", example: "<h1>お店の名前</h1>" },
  { course: "html", target: "<p>", reading: "ピー", meaning: "文章の段落", example: "<p>本文です。</p>" },
  { course: "html", target: "<a>", reading: "エー", meaning: "別の場所へ移動するリンク", example: "<a href=\"menu.html\">メニュー</a>" },
  { course: "html", target: "<img>", reading: "イメージ", meaning: "画像を表示する要素", example: "<img src=\"cafe.webp\" alt=\"店内\">" },
  { course: "html", target: "<ul>", reading: "ユーエル", meaning: "順番を持たないリスト", example: "<ul><li>コーヒー</li></ul>" },
  { course: "html", target: "<li>", reading: "エルアイ", meaning: "リストの一項目", example: "<li>カフェラテ</li>" },
  { course: "html", target: "<form>", reading: "フォーム", meaning: "入力内容をまとめる要素", example: "<form>...</form>" },
  { course: "html", target: "<label>", reading: "ラベル", meaning: "入力欄の名前を示す要素", example: "<label for=\"name\">お名前</label>" },
  { course: "html", target: "<input>", reading: "インプット", meaning: "一行の入力欄", example: "<input id=\"name\" type=\"text\">" },
  { course: "html", target: "<button>", reading: "ボタン", meaning: "クリックして操作する要素", example: "<button type=\"submit\">送信</button>" },
  { course: "css", target: "color", reading: "カラー", meaning: "文字の色を指定する", example: "color: #17233b;" },
  { course: "css", target: "background", reading: "バックグラウンド", meaning: "背景を指定する", example: "background: white;" },
  { course: "css", target: "margin", reading: "マージン", meaning: "要素の外側の余白", example: "margin: 20px;" },
  { course: "css", target: "padding", reading: "パディング", meaning: "要素の内側の余白", example: "padding: 16px;" },
  { course: "css", target: "border", reading: "ボーダー", meaning: "要素の境界線", example: "border: 1px solid #ccc;" },
  { course: "css", target: "display", reading: "ディスプレイ", meaning: "要素の表示・レイアウト方法", example: "display: flex;" },
  { course: "css", target: "flex", reading: "フレックス", meaning: "一方向に並べるレイアウト", example: "display: flex;" },
  { course: "css", target: "grid", reading: "グリッド", meaning: "行と列で並べるレイアウト", example: "display: grid;" },
  { course: "css", target: "position", reading: "ポジション", meaning: "要素の配置方法", example: "position: fixed;" },
  { course: "css", target: "transition", reading: "トランジション", meaning: "状態変化をなめらかに見せる", example: "transition: color .3s;" },
  { course: "symbols", target: ".card { }", meaning: "ドットと波かっこを使うclassセレクター", example: ".card { padding: 16px; }" },
  { course: "symbols", target: "#page-title { }", meaning: "ハッシュと波かっこを使うidセレクター", example: "#page-title { color: navy; }" },
  { course: "symbols", target: "color: #17233b;", meaning: "コロン・ハッシュ・セミコロンを使う色指定", example: "文字色を16進数で指定する" },
  { course: "symbols", target: ".button:hover", meaning: "コロンを使うhover疑似クラス", example: ".button:hover { opacity: .8; }" },
  { course: "symbols", target: "@media (max-width: 768px)", meaning: "アット・丸かっこ・コロンを使う画面幅の条件", example: "@media (max-width: 768px) { }" },
  { course: "symbols", target: "width: 100%;", meaning: "コロン・パーセント・セミコロンを使う幅指定", example: "親要素と同じ幅にする" },
  { course: "symbols", target: "var(--color-ink)", meaning: "丸かっことハイフンを使うCSS変数の参照", example: "color: var(--color-ink);" },
  { course: "symbols", target: "calc(100% - 32px)", meaning: "丸かっこ・パーセント・マイナスを使う計算", example: "width: calc(100% - 32px);" },
  { course: "symbols", target: "[hidden] { display: none; }", meaning: "角かっこで属性を選ぶCSS", example: "hidden属性の要素を非表示にする" },
  { course: "symbols", target: "* { box-sizing: border-box; }", meaning: "アスタリスクですべての要素を選ぶCSS", example: "全要素のサイズ計算を揃える" },
  { course: "sentences", target: "Web design connects people with information.", reading: "ウェブデザイン コネクツ ピープル ウィズ インフォメーション", meaning: "Webデザインは人と情報をつなぐ", example: "長文では単語間のスペースにも注目しよう" },
  { course: "sentences", target: "Check every page before you deploy the website.", reading: "チェック エブリ ページ ビフォア ユー デプロイ ザ ウェブサイト", meaning: "公開する前にすべてのページを確認する", example: "確認 → 公開の仕事の流れ" },
  { course: "sentences", target: "A clear heading helps users find information quickly.", reading: "ア クリア ヘディング ヘルプス ユーザーズ ファインド インフォメーション クイックリー", meaning: "明確な見出しは情報をすばやく見つける助けになる", example: "見出し階層とユーザビリティ" },
  { course: "sentences", target: "Responsive design works on phones, tablets, and computers.", reading: "レスポンシブ デザイン ワークス オン フォーンズ タブレッツ アンド コンピューターズ", meaning: "レスポンシブデザインは様々な画面で使える", example: "スマートフォン対応の基本" },
  { course: "sentences", target: "Save a backup before changing the production website.", reading: "セーブ ア バックアップ ビフォア チェンジング ザ プロダクション ウェブサイト", meaning: "本番サイトを変更する前にバックアップを保存する", example: "安全な更新作業の基本" },
  { course: "htmlCode", target: "<header class=\"site-header\">NORTH LIGHT COFFEE</header>", reading: "ヘッダー クラス サイトヘッダー", meaning: "クラス名を付けたヘッダーを作る", example: "開始タグ・内容・終了タグを正確に入力" },
  { course: "htmlCode", target: "<a class=\"button\" href=\"menu.html\">View menu</a>", reading: "エー クラス ボタン エイチレフ メニュードットエイチティーエムエル", meaning: "メニューページへ移動するリンクを作る", example: "属性の引用符とスペースに注意" },
  { course: "htmlCode", target: "<img src=\"images/cafe.webp\" alt=\"Cafe interior\">", reading: "イメージ ソース オルト", meaning: "代替テキスト付きの画像を表示する", example: "srcは画像の場所、altは画像の意味" },
  { course: "htmlCode", target: "<section class=\"menu\"><h2>Popular menu</h2></section>", reading: "セクション クラス メニュー エイチツー", meaning: "人気メニューを一つのセクションにまとめる", example: "要素の入れ子を確認しよう" },
  { course: "htmlCode", target: "<label for=\"email\">Email</label><input id=\"email\" type=\"email\">", reading: "ラベル フォー メール インプット アイディー メール", meaning: "ラベルとメール入力欄を関連付ける", example: "forとidを同じ値にする" },
  { course: "cssCode", target: ".button { color: white; background: blue; }", reading: "ドット ボタン カラー ホワイト バックグラウンド ブルー", meaning: "ボタンを白文字・青背景にする", example: "セレクタと宣言ブロック" },
  { course: "cssCode", target: ".menu { display: grid; gap: 24px; }", reading: "ドット メニュー ディスプレイ グリッド ギャップ", meaning: "メニューをグリッドで並べ、間隔を空ける", example: "Gridレイアウトの基本" },
  { course: "cssCode", target: ".site-header { position: sticky; top: 0; }", reading: "ドット サイトヘッダー ポジション スティッキー トップ ゼロ", meaning: "ヘッダーを画面上部に追従させる", example: "positionとtopを組み合わせる" },
  { course: "cssCode", target: "@media (max-width: 600px) { .menu { display: block; } }", reading: "アットメディア マックスウィズ ロッピャクピクセル", meaning: "600px以下でメニューを縦並びにする", example: "レスポンシブ対応のメディアクエリ" },
  { course: "cssCode", target: ".button:hover { transform: translateY(-2px); }", reading: "ドット ボタン ホバー トランスフォーム トランスレートワイ", meaning: "ボタンにマウスを重ねると少し上へ動かす", example: "疑似クラスとtransform" },
  { course: "recall", target: "<h1>", prompt: "ページで最も大切な見出しを作るHTMLタグは？", reading: "日本語の質問からコードを思い出そう", meaning: "開始タグだけを半角で入力します", example: "ヒント：見出しレベル1", canReveal: true },
  { course: "recall", target: "<a>", prompt: "別のページへ移動するリンクを作るHTMLタグは？", reading: "日本語の質問からコードを思い出そう", meaning: "開始タグだけを半角で入力します", example: "ヒント：anchorの頭文字", canReveal: true },
  { course: "recall", target: "color", prompt: "CSSで文字の色を指定するプロパティは？", reading: "日本語の質問から英単語を思い出そう", meaning: "プロパティ名だけを半角英字で入力します", example: "ヒント：色を表す英単語", canReveal: true },
  { course: "recall", target: "margin", prompt: "CSSで要素の外側の余白を指定するプロパティは？", reading: "日本語の質問から英単語を思い出そう", meaning: "プロパティ名だけを半角英字で入力します", example: "ヒント：内側の余白はpadding", canReveal: true },
  { course: "recall", target: ".class", prompt: "CSSでclass属性を選ぶときの書き方は？", reading: "日本語の質問から記号と単語を思い出そう", meaning: "ドットとclassを続けて入力します", example: "ヒント：先頭はピリオド", canReveal: true },
  ...window.EXTRA_ITEMS
];

ITEMS.forEach((item, index) => {
  const audioNumber = index + 1;
  const hasAudio = audioNumber <= 60 || (audioNumber >= 64 && audioNumber <= 143);
  item.audio = hasAudio ? `./audio/${String(audioNumber).padStart(3, "0")}.webm` : null;
});

const COURSES = [
  { id: "mix", icon: "⚡", name: "おまかせ", note: "全部ミックス" },
  { id: "words", icon: "Aa", name: "英単語", note: "仕事のことば" },
  { id: "html", icon: "<>", name: "HTML", note: "タグを練習" },
  { id: "css", icon: "{}", name: "CSS", note: "スタイルの単語" },
  { id: "symbols", icon: "#", name: "記号", note: "半角記号に強くなる" },
  { id: "sentences", icon: "¶", name: "長文", note: "仕事の英文" },
  { id: "htmlCode", icon: "</>", name: "HTMLコード", note: "一行を完成" },
  { id: "cssCode", icon: "CSS", name: "CSSコード", note: "宣言まで入力" },
  { id: "recall", icon: "?", name: "意味から入力", note: "日本語の質問" }
];

const els = Object.fromEntries([
  "courseList", "bestScore", "score", "combo", "remaining", "progressBar",
  "startView", "startButton", "questionView", "categoryBadge", "target",
  "reading", "typingInput", "feedback", "meaning", "example", "skipButton",
  "resultView", "resultTitle", "finalScore", "correctCount", "maxCombo",
  "resultMessage", "retryButton", "reviewButton", "soundButton", "playPanel",
  "redAlert", "confettiLayer", "keyboard", "keyHint", "completionRate",
  "completionBar", "masteredCount", "totalWords", "achievementCount",
  "achievementGrid", "achievementToast", "toastTitle", "elapsedTime", "clearTime",
  "meaningVisual", "voiceButton", "liveCorrect", "comboBurst",
  "comboBurstNumber", "scoreReel", "baseScoreResult", "comboBonusResult",
  "clearBonusResult", "totalScoreResult", "rankScore", "examMistakeCount",
  "rankNote", "rankStamp", "rankName"
].map(id => [id, document.getElementById(id)]));

let selectedCourse = "mix";
let queue = [];
let currentIndex = 0;
let score = 0;
let combo = 0;
let highestCombo = 0;
let correct = 0;
let baseScore = 0;
let comboBonusScore = 0;
let clearBonusScore = 0;
let examCorrectCharacters = 0;
let examMistakes = 0;
let mistakes = [];
let answerLocked = false;
let soundOn = true;
let audioContext;
let wrongInputActive = false;
let keyHelpTimer;
let toastTimer;
let elapsedTimer;
let gameStartedAt = 0;
let elapsedSeconds = 0;
let voiceEnabled = localStorage.getItem("code-type-quest-voice") !== "off";
let currentVoiceAudio;
const WORD_PROCESSING_RANKS = [
  { name: "初段", threshold: 800, penalty: 5 },
  { name: "1級", threshold: 700, penalty: 5 },
  { name: "準1級", threshold: 600, penalty: 5 },
  { name: "2級", threshold: 500, penalty: 3 },
  { name: "準2級", threshold: 400, penalty: 3 },
  { name: "3級", threshold: 300, penalty: 1 },
  { name: "4級", threshold: 200, penalty: 1 }
];

const PROGRESS_KEY = "code-type-quest-progress-v1";
const ACHIEVEMENTS = [
  { id: "first", icon: "🌱", title: "はじめの一歩", detail: "はじめて正解する", test: p => p.totalCorrect >= 1 },
  { id: "ten", icon: "✋", title: "ウォームアップ完了", detail: "合計10問正解する", test: p => p.totalCorrect >= 10 },
  { id: "twenty-five", icon: "⚡", title: "コードスプリンター", detail: "合計25問正解する", test: p => p.totalCorrect >= 25 },
  { id: "combo-five", icon: "🔥", title: "コンボマスター", detail: "5コンボを達成する", test: p => p.maxCombo >= 5 },
  { id: "perfect", icon: "💯", title: "ノーミスクリア", detail: "1コースを全問正解", test: p => p.perfectRuns >= 1 },
  { id: "words", icon: "Aa", title: "英単語ハンター", detail: "英単語コースを全問制覇", test: p => courseComplete(p, "words") },
  { id: "html", icon: "🏷️", title: "HTMLビルダー", detail: "HTMLコースを全問制覇", test: p => courseComplete(p, "html") },
  { id: "css", icon: "🎨", title: "CSSスタイリスト", detail: "CSSコースを全問制覇", test: p => courseComplete(p, "css") },
  { id: "symbols", icon: "#", title: "記号の達人", detail: "記号コースを全問制覇", test: p => courseComplete(p, "symbols") },
  { id: "complete", icon: "👑", title: "コードタイプ・キング", detail: "全問題をコンプリート", test: p => p.mastered.length === ITEMS.length }
];

let progress = loadProgress();

const KEYBOARD_ROWS = [
  [
    ["半/全", "lp"], ["1 !", "lp"], ["2 \"", "lr"], ["3 #", "lm"], ["4 $", "li"],
    ["5 %", "li"], ["6 &", "ri"], ["7 '", "ri"], ["8 (", "rm"], ["9 )", "rr"],
    ["0", "rp"], ["- =", "rp"], ["^ ~", "rp"], ["¥ |", "rp"], ["Back", "rp", "wide-15"]
  ],
  [
    ["Tab", "lp", "wide-125"], ["Q", "lp"], ["W", "lr"], ["E", "lm"], ["R", "li"],
    ["T", "li"], ["Y", "ri"], ["U", "ri"], ["I", "rm"], ["O", "rr"],
    ["P", "rp"], ["@ `", "rp"], ["[ {", "rp"]
  ],
  [
    ["Caps", "lp", "wide-15"], ["A", "lp", "", "home"], ["S", "lr", "", "home"],
    ["D", "lm", "", "home"], ["F", "li", "", "home"], ["G", "li"], ["H", "ri"],
    ["J", "ri", "", "home"], ["K", "rm", "", "home"], ["L", "rr", "", "home"],
    ["; +", "rp", "", "home"], [": *", "rp"], ["] }", "rp"]
  ],
  [
    ["Shift", "lp", "wide-2"], ["Z", "lp"], ["X", "lr"], ["C", "lm"], ["V", "li"],
    ["B", "li"], ["N", "ri"], ["M", "ri"], [", <", "rm"], [". >", "rr"],
    ["/ ?", "rp"], ["\\ _", "rp"], ["Shift", "rp", "wide-225"]
  ],
  [
    ["Ctrl", "lp", "wide-125"], ["Win", "lp"], ["Alt", "lp"], ["無変換", "thumb", "wide-15"],
    ["Space", "thumb", "space"], ["変換", "thumb", "wide-15"], ["かな", "rp"],
    ["Alt", "rp"], ["Menu", "rp"], ["Ctrl", "rp", "wide-125"]
  ]
];

const CHARACTER_KEYS = {
  " ": "Space", "<": ", <", ">": ". >", "/": "/ ?", "?": "/ ?", ".": ". >",
  ",": ", <", "\"": "2 \"", "'": "7 '", "{": "[ {", "}": "] }", "[": "[ {",
  "]": "] }", ":": ": *", ";": "; +", "#": "3 #", "@": "@ `", "-": "- =",
  "=": "- =", "_": "\\ _", "\\": "\\ _", "|": "¥ |", "!": "1 !", "$": "4 $",
  "%": "5 %", "&": "6 &", "(": "8 (", ")": "9 )", "*": ": *", "+": "; +",
  "^": "^ ~", "~": "^ ~", "`": "@ `"
};

const SHIFTED_CHARACTERS = new Set("<>?\"{}:#_!$%&()*+|~".split(""));
const CONTROL_KEY_LABELS = {
  Backspace: "Back", Enter: "Enter", Shift: "Shift", Control: "Ctrl",
  Alt: "Alt", Meta: "Win", Tab: "Tab", CapsLock: "Caps", " ": "Space"
};

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function loadProgress() {
  const empty = { mastered: [], totalCorrect: 0, maxCombo: 0, perfectRuns: 0, unlocked: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY));
    if (!saved) return empty;
    const loaded = { ...empty, ...saved };
    if (loaded.mastered.some(value => !value.includes(":"))) {
      loaded.mastered = ITEMS
        .filter(item => item.course !== "recall" && loaded.mastered.includes(item.target))
        .map(itemKey);
    }
    return loaded;
  } catch {
    return empty;
  }
}

function itemKey(item) {
  return `${item.course}:${item.target}`;
}

function saveProgress() {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

function courseComplete(data, course) {
  const courseTargets = ITEMS.filter(item => item.course === course).map(itemKey);
  return courseTargets.every(target => data.mastered.includes(target));
}

function recordCorrect(item) {
  progress.totalCorrect += 1;
  if (!progress.mastered.includes(itemKey(item))) progress.mastered.push(itemKey(item));
  progress.maxCombo = Math.max(progress.maxCombo, combo);
  checkAchievements();
  saveProgress();
  renderProgress();
}

function checkAchievements() {
  const newlyUnlocked = ACHIEVEMENTS.filter(item =>
    !progress.unlocked.includes(item.id) && item.test(progress)
  );
  newlyUnlocked.forEach((item, index) => {
    progress.unlocked.push(item.id);
    window.setTimeout(() => showAchievementToast(item), index * 3500);
  });
}

function showAchievementToast(item) {
  window.clearTimeout(toastTimer);
  els.toastTitle.textContent = item.title;
  els.achievementToast.classList.remove("is-visible");
  void els.achievementToast.offsetWidth;
  els.achievementToast.classList.add("is-visible");
  launchConfetti(30);
  toastTimer = window.setTimeout(() => els.achievementToast.classList.remove("is-visible"), 3500);
}

function renderProgress() {
  const rate = Math.round(progress.mastered.length / ITEMS.length * 100);
  els.completionRate.textContent = `${rate}%`;
  els.completionBar.style.width = `${rate}%`;
  els.masteredCount.textContent = progress.mastered.length;
  els.totalWords.textContent = ITEMS.length;
  els.achievementCount.textContent = progress.unlocked.length;
  els.achievementGrid.innerHTML = ACHIEVEMENTS.map(item => {
    const unlocked = progress.unlocked.includes(item.id);
    return `<article class="achievement${unlocked ? " is-unlocked" : ""}">
      <span class="achievement-icon" aria-hidden="true">${unlocked ? item.icon : "🔒"}</span>
      <h3>${item.title}</h3>
      <p>${item.detail}</p>
    </article>`;
  }).join("");
}

function renderKeyboard() {
  els.keyboard.innerHTML = KEYBOARD_ROWS.map(row => `
    <div class="keyboard-row">
      ${row.map(([label, finger, width = "", home = ""]) => `
        <span class="key finger-${finger}${width ? ` key-${width}` : ""}${home ? " is-home" : ""}"
          data-key="${label}" aria-label="${label}キー">${label}</span>`).join("")}
    </div>`).join("") + `
      <span class="key finger-rp key-enter-tall" data-key="Enter" aria-label="Enterキー">Enter</span>`;
}

function renderCourses() {
  els.courseList.innerHTML = COURSES.map(course => `
    <button class="course-button" type="button" role="radio"
      aria-checked="${course.id === selectedCourse}" data-course="${course.id}">
      <span aria-hidden="true">${course.icon}</span>
      <span><strong>${course.name}</strong><small>${course.note}</small></span>
    </button>`).join("");
  els.courseList.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
      selectedCourse = button.dataset.course;
      renderCourses();
      updateBest();
      resetToStart();
    });
  });
}

function bestKey() {
  return `code-type-quest-best-${selectedCourse}`;
}

function updateBest() {
  els.bestScore.textContent = localStorage.getItem(bestKey()) || "0";
}

function buildQueue(source = null) {
  if (source) return shuffle(source);
  const pool = selectedCourse === "mix" ? ITEMS : ITEMS.filter(item => item.course === selectedCourse);
  return shuffle(pool).slice(0, Math.min(10, pool.length));
}

function startGame(reviewItems = null) {
  queue = buildQueue(reviewItems);
  currentIndex = 0;
  score = 0;
  combo = 0;
  highestCombo = 0;
  correct = 0;
  baseScore = 0;
  comboBonusScore = 0;
  clearBonusScore = 0;
  examCorrectCharacters = 0;
  examMistakes = 0;
  mistakes = [];
  answerLocked = false;
  startElapsedTimer();
  els.startView.hidden = true;
  els.resultView.hidden = true;
  els.questionView.hidden = false;
  updateStatus();
  showQuestion();
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function updateElapsedTime() {
  elapsedSeconds = Math.floor((Date.now() - gameStartedAt) / 1000);
  setAnimatedText(els.elapsedTime, formatTime(elapsedSeconds));
}

function setAnimatedText(element, value) {
  const nextValue = String(value);
  if (element.textContent === nextValue) return;
  element.textContent = nextValue;
  element.classList.remove("is-changing");
  void element.offsetWidth;
  element.classList.add("is-changing");
}

function startElapsedTimer() {
  window.clearInterval(elapsedTimer);
  gameStartedAt = Date.now();
  elapsedSeconds = 0;
  els.elapsedTime.textContent = "0:00";
  elapsedTimer = window.setInterval(updateElapsedTime, 250);
}

function stopElapsedTimer() {
  updateElapsedTime();
  window.clearInterval(elapsedTimer);
  elapsedTimer = undefined;
}

function showQuestion() {
  const item = queue[currentIndex];
  answerLocked = false;
  const course = COURSES.find(candidate => candidate.id === item.course);
  els.categoryBadge.textContent = course?.name ?? item.course;
  const displayedQuestion = item.prompt || showSpaces(item.target);
  els.target.textContent = displayedQuestion;
  els.target.classList.toggle("is-long", displayedQuestion.length > 24);
  const showsPronunciation = item.course === "words";
  els.reading.hidden = !showsPronunciation;
  els.reading.textContent = showsPronunciation ? item.reading : "";
  els.meaning.textContent = item.meaning;
  els.example.textContent = item.example;
  els.skipButton.hidden = !item.canReveal;
  showMeaningVisual(item);
  els.typingInput.value = "";
  els.typingInput.className = "typing-input";
  setBackspaceCorrection(false);
  els.feedback.textContent = "";
  els.typingInput.disabled = false;
  wrongInputActive = false;
  els.typingInput.focus();
  scheduleKeyHelp();
  speakQuestion(item);
  updateStatus();
}

function showSpaces(text) {
  return text.replaceAll(" ", "␣");
}

function showMeaningVisual(item) {
  if (item.logo) {
    els.meaningVisual.hidden = false;
    els.meaningVisual.classList.add("is-logo");
    els.meaningVisual.style.backgroundImage = `url("${item.logo}")`;
    els.meaningVisual.setAttribute("aria-label", `${item.target}のロゴ`);
    return;
  }
  els.meaningVisual.classList.remove("is-logo");
  els.meaningVisual.style.removeProperty("background-image");
  if (!Number.isInteger(item.visual)) {
    els.meaningVisual.hidden = true;
    els.meaningVisual.removeAttribute("aria-label");
    return;
  }
  const column = item.visual % 5;
  const row = Math.floor(item.visual / 5);
  els.meaningVisual.hidden = false;
  els.meaningVisual.style.setProperty("--visual-x", `${column * 25}%`);
  els.meaningVisual.style.setProperty("--visual-y", `${row * 100}%`);
  els.meaningVisual.setAttribute("aria-label", `${item.target}の意味を表すイラスト：${item.meaning}`);
}

function updateStatus() {
  els.score.textContent = score;
  els.liveCorrect.textContent = correct;
  els.combo.textContent = combo;
  setAnimatedText(els.remaining, Math.max(queue.length - currentIndex, 0));
  els.progressBar.style.width = `${queue.length ? currentIndex / queue.length * 100 : 0}%`;
}

function submitAnswer() {
  if (answerLocked) return;
  const item = queue[currentIndex];
  const isCorrect = els.typingInput.value === item.target;
  answerLocked = true;
  els.typingInput.disabled = true;

  if (isCorrect) {
    combo += 1;
    highestCombo = Math.max(highestCombo, combo);
    correct += 1;
    examCorrectCharacters += item.target.length;
    const comboPoints = Math.min(combo - 1, 5) * 20;
    baseScore += 100;
    comboBonusScore += comboPoints;
    score = baseScore + comboBonusScore;
    recordCorrect(item);
    els.typingInput.classList.add("is-correct");
    els.feedback.textContent = combo >= 3 ? `正解！ ${combo}コンボ！` : "正解！いい調子！";
    els.feedback.style.color = "var(--mint)";
    launchConfetti(combo >= 3 ? 34 : 20);
    if (combo >= 2) showComboBurst();
    beep(660, .08);
  } else {
    combo = 0;
    mistakes.push(item);
    els.typingInput.classList.add("is-wrong");
    els.feedback.textContent = `あと少し！ 正解は「${showSpaces(item.target)}」`;
    els.feedback.style.color = "var(--coral)";
    beep(180, .12);
  }
  updateStatus();
  window.setTimeout(nextQuestion, 900);
}

function showComboBurst() {
  els.comboBurstNumber.textContent = combo;
  els.comboBurst.classList.remove("is-active");
  void els.comboBurst.offsetWidth;
  els.comboBurst.classList.add("is-active");
}

function checkWhileTyping() {
  if (answerLocked) return;
  const value = els.typingInput.value;
  const target = queue[currentIndex].target;
  clearKeyHelp();

  if (value === target) {
    submitAnswer();
    return;
  }

  const isWrong = value.length > 0 && !target.startsWith(value);
  els.typingInput.classList.toggle("is-wrong", isWrong);
  setBackspaceCorrection(isWrong);
  if (isWrong && !wrongInputActive) {
    examMistakes += 1;
    showWrongEffect();
  }
  if (!isWrong) {
    els.feedback.textContent = "";
  }
  wrongInputActive = isWrong;
  scheduleKeyHelp();
}

function keyboardLabelForKey(key) {
  if (CONTROL_KEY_LABELS[key]) return CONTROL_KEY_LABELS[key];
  if (key.length === 1) return CHARACTER_KEYS[key] || key.toUpperCase();
  return null;
}

function keysWithLabel(label) {
  if (!label) return [];
  return [...els.keyboard.querySelectorAll(".key")]
    .filter(key => key.dataset.key === label);
}

function showPressedKey(keyName, pressed) {
  const label = keyboardLabelForKey(keyName);
  keysWithLabel(label).forEach(key => key.classList.toggle("is-pressed", pressed));
}

function setBackspaceCorrection(active) {
  keysWithLabel("Back").forEach(key => key.classList.toggle("is-correction", active));
}

function clearKeyHelp() {
  window.clearTimeout(keyHelpTimer);
  els.keyboard.querySelectorAll(".is-next, .is-shift-helper").forEach(key => {
    key.classList.remove("is-next", "is-shift-helper");
  });
  els.keyHint.classList.remove("is-helping");
  els.keyHint.textContent = "3秒止まると、次に押すキーが光るよ";
}

function scheduleKeyHelp() {
  window.clearTimeout(keyHelpTimer);
  if (answerLocked || !queue[currentIndex] || queue[currentIndex].canReveal) return;
  keyHelpTimer = window.setTimeout(highlightNextKey, 3000);
}

function highlightNextKey() {
  const item = queue[currentIndex];
  const typed = els.typingInput.value;
  let nextPosition = 0;
  while (nextPosition < typed.length && typed[nextPosition] === item.target[nextPosition]) {
    nextPosition += 1;
  }
  const nextCharacter = item.target.charAt(nextPosition);
  if (!nextCharacter) return;
  const upper = nextCharacter.toUpperCase();
  const keyLabel = CHARACTER_KEYS[nextCharacter] || upper;
  const candidates = els.keyboard.querySelectorAll(".key");
  const key = [...candidates].find(candidate => candidate.dataset.key === keyLabel);
  if (!key) return;

  key.classList.add("is-next");
  if (SHIFTED_CHARACTERS.has(nextCharacter) || /[A-Z]/.test(nextCharacter)) {
    const shiftKeys = [...candidates].filter(candidate => candidate.dataset.key === "Shift");
    shiftKeys.forEach(shift => shift.classList.add("is-shift-helper"));
    els.keyHint.textContent = `Shiftを押しながら「${keyLabel}」を押そう`;
  } else {
    els.keyHint.textContent = `次は「${nextCharacter === " " ? "Space" : nextCharacter}」キーだよ`;
  }
  els.keyHint.classList.add("is-helping");
}

function restartAnimation(element, className) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

function showWrongEffect() {
  restartAnimation(els.playPanel, "screen-shake");
  restartAnimation(els.redAlert, "is-active");
  els.feedback.textContent = "文字がちがうよ！ 画面のお手本をもう一度見よう";
  els.feedback.style.color = "var(--coral)";
  beep(150, .08);
  window.setTimeout(() => {
    els.playPanel.classList.remove("screen-shake");
    els.redAlert.classList.remove("is-active");
  }, 450);
}

function launchConfetti(amount = 24) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["#4263eb", "#23b58d", "#ffd43b", "#ff6b6b", "#9c6ade"];
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < amount; i += 1) {
    const piece = document.createElement("i");
    const angle = Math.random() * Math.PI * 2;
    const distance = 110 + Math.random() * 240;
    piece.className = "confetti-piece";
    piece.style.setProperty("--confetti-color", colors[i % colors.length]);
    piece.style.setProperty("--confetti-x", `${Math.cos(angle) * distance}px`);
    piece.style.setProperty("--confetti-y", `${Math.sin(angle) * distance + 130}px`);
    piece.style.setProperty("--start-rotation", `${Math.random() * 180}deg`);
    piece.style.setProperty("--end-rotation", `${360 + Math.random() * 720}deg`);
    piece.style.setProperty("--fall-time", `${.65 + Math.random() * .45}s`);
    fragment.appendChild(piece);
    window.setTimeout(() => piece.remove(), 1200);
  }
  els.confettiLayer.appendChild(fragment);
}

function revealAnswer() {
  if (answerLocked) return;
  const item = queue[currentIndex];
  answerLocked = true;
  combo = 0;
  mistakes.push(item);
  examMistakes += 1;
  clearKeyHelp();
  els.typingInput.disabled = true;
  els.typingInput.value = item.target;
  els.typingInput.classList.add("is-wrong");
  els.feedback.textContent = `答えは「${showSpaces(item.target)}」。次は自分で入力してみよう！`;
  els.feedback.style.color = "var(--coral)";
  updateStatus();
  window.setTimeout(nextQuestion, 1800);
}

function nextQuestion() {
  currentIndex += 1;
  if (currentIndex >= queue.length) {
    finishGame();
  } else {
    showQuestion();
  }
}

function finishGame() {
  stopElapsedTimer();
  clearKeyHelp();
  els.questionView.hidden = true;
  els.resultView.hidden = false;
  els.progressBar.style.width = "100%";
  setAnimatedText(els.remaining, 0);
  els.finalScore.textContent = score;
  els.correctCount.textContent = `${correct} / ${queue.length}`;
  els.maxCombo.textContent = highestCombo;
  els.clearTime.textContent = formatTime(elapsedSeconds);
  renderEstimatedRank();
  const ratio = queue.length ? correct / queue.length : 0;
  clearBonusScore = ratio === 1 ? 500 : 0;
  score = baseScore + comboBonusScore + clearBonusScore;
  els.score.textContent = score;
  els.finalScore.textContent = score;
  if (ratio === 1) {
    progress.perfectRuns += 1;
    checkAchievements();
    saveProgress();
    renderProgress();
  }
  els.resultTitle.textContent = ratio === 1 ? "パーフェクト！" : ratio >= .7 ? "すごい、レベルアップ！" : "ナイスチャレンジ！";
  els.resultMessage.textContent = ratio === 1
    ? "意味も思い出せたら、今日のコースは完全クリア！"
    : "速さより正確さ。まちがえた言葉をもう一度打ってみよう。";
  els.reviewButton.hidden = mistakes.length === 0;
  playScoreReel();
  launchConfetti(ratio === 1 ? 90 : 50);
  const best = Number(localStorage.getItem(bestKey()) || 0);
  if (score > best) {
    localStorage.setItem(bestKey(), String(score));
    updateBest();
  }
  beep(523, .08);
  window.setTimeout(() => beep(784, .14), 100);
}

function estimateWordProcessingRank() {
  const seconds = Math.max(elapsedSeconds, 1);
  const grossCharacters = Math.floor(examCorrectCharacters * 600 / seconds);
  for (const rank of WORD_PROCESSING_RANKS) {
    const adjustedCharacters = Math.max(0, grossCharacters - examMistakes * rank.penalty);
    if (adjustedCharacters >= rank.threshold) {
      return { ...rank, grossCharacters, adjustedCharacters };
    }
  }
  return {
    name: "練習中", threshold: 200, penalty: 1, grossCharacters,
    adjustedCharacters: Math.max(0, grossCharacters - examMistakes)
  };
}

function renderEstimatedRank() {
  const rank = estimateWordProcessingRank();
  els.rankScore.textContent = rank.adjustedCharacters;
  els.examMistakeCount.textContent = examMistakes;
  els.rankName.textContent = rank.name;
  els.rankNote.textContent = rank.name === "練習中"
    ? "4級の目安は、減点後200文字以上です。"
    : `${rank.name}基準：${rank.threshold}文字以上・1ミス${rank.penalty}文字減。`;
  els.rankStamp.classList.remove("is-stamped");
}

function showRankStamp() {
  els.rankStamp.classList.remove("is-stamped");
  void els.rankStamp.offsetWidth;
  els.rankStamp.classList.add("is-stamped");
  beep(110, .09);
  window.setTimeout(() => beep(80, .15), 80);
}

function playScoreReel() {
  const values = [
    [els.baseScoreResult, baseScore],
    [els.comboBonusResult, comboBonusScore],
    [els.clearBonusResult, clearBonusScore],
    [els.totalScoreResult, score]
  ];
  els.scoreReel.classList.remove("is-finished");
  els.scoreReel.classList.add("is-spinning");
  const startedAt = performance.now();
  const duration = 1450;

  function tick(now) {
    const progressValue = Math.min((now - startedAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progressValue, 3);
    values.forEach(([element, finalValue], index) => {
      const jitter = progressValue < .88 ? Math.floor(Math.random() * 90) : 0;
      element.textContent = Math.min(finalValue, Math.floor(finalValue * eased) + jitter);
    });
    if (progressValue < 1) {
      requestAnimationFrame(tick);
      return;
    }
    values.forEach(([element, finalValue]) => { element.textContent = finalValue; });
    els.scoreReel.classList.remove("is-spinning");
    els.scoreReel.classList.add("is-finished");
    launchConfetti(clearBonusScore ? 100 : 60);
    window.setTimeout(showRankStamp, 280);
  }
  requestAnimationFrame(tick);
}

function resetToStart() {
  window.clearInterval(elapsedTimer);
  elapsedTimer = undefined;
  elapsedSeconds = 0;
  els.elapsedTime.textContent = "0:00";
  clearKeyHelp();
  setBackspaceCorrection(false);
  els.questionView.hidden = true;
  els.resultView.hidden = true;
  els.startView.hidden = false;
  els.progressBar.style.width = "0";
  score = 0;
  baseScore = 0;
  comboBonusScore = 0;
  clearBonusScore = 0;
  correct = 0;
  examCorrectCharacters = 0;
  examMistakes = 0;
  els.rankStamp.classList.remove("is-stamped");
  combo = 0;
  currentIndex = 0;
  queue = [];
  updateStatus();
}

function beep(frequency, duration) {
  if (!soundOn) return;
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(.05, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function updateVoiceButton(state) {
  const labels = {
    ready: ["●", "読み上げ ON"],
    off: ["×", "読み上げ OFF"],
    error: ["!", "音声を再生できません"],
    loading: ["…", "音声を準備中"]
  };
  const [icon, label] = labels[state];
  els.voiceButton.className = `voice-button${state === "ready" ? " is-ready" : ""}${state === "error" ? " is-error" : ""}`;
  els.voiceButton.innerHTML = `<span aria-hidden="true">${icon}</span> ${label}`;
  els.voiceButton.setAttribute("aria-pressed", String(voiceEnabled));
  els.voiceButton.title = state === "error" ? "教材の音声アセットを確認してください" : "";
}

function speakQuestion(item) {
  if (!voiceEnabled || !item.audio) return;
  currentVoiceAudio?.pause();
  currentVoiceAudio = new Audio(item.audio);
  currentVoiceAudio.play()
    .then(() => updateVoiceButton("ready"))
    .catch(() => updateVoiceButton("error"));
}

els.startButton.addEventListener("click", () => startGame());
els.retryButton.addEventListener("click", () => startGame());
els.reviewButton.addEventListener("click", () => startGame([...new Set(mistakes)]));
els.skipButton.addEventListener("click", revealAnswer);
els.typingInput.addEventListener("input", checkWhileTyping);
els.typingInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    submitAnswer();
  }
});
els.soundButton.addEventListener("click", () => {
  soundOn = !soundOn;
  els.soundButton.setAttribute("aria-pressed", String(soundOn));
  els.soundButton.innerHTML = `<span aria-hidden="true">${soundOn ? "♪" : "×"}</span> 効果音 ${soundOn ? "ON" : "OFF"}`;
});
els.voiceButton.addEventListener("click", async () => {
  voiceEnabled = !voiceEnabled;
  localStorage.setItem("code-type-quest-voice", voiceEnabled ? "on" : "off");
  if (!voiceEnabled) {
    currentVoiceAudio?.pause();
    updateVoiceButton("off");
    return;
  }
  updateVoiceButton("ready");
  if (queue[currentIndex] && !els.questionView.hidden) {
    speakQuestion(queue[currentIndex]);
  }
});
document.addEventListener("keydown", event => {
  showPressedKey(event.key, true);
  if (event.key === "Escape") resetToStart();
  if (event.key === "Enter" && !els.startView.hidden) startGame();
});
document.addEventListener("keyup", event => {
  showPressedKey(event.key, false);
});
window.addEventListener("blur", () => {
  els.keyboard.querySelectorAll(".is-pressed").forEach(key => key.classList.remove("is-pressed"));
});

renderCourses();
renderKeyboard();
renderProgress();
updateBest();
resetToStart();
updateVoiceButton(voiceEnabled ? "ready" : "off");
