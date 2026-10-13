"use strict";

const SPEED_KEY = "code-type-rsvp-speed-v1";
const CALIBRATION_KEY = "code-type-rsvp-calibration-v1";
const DEFAULT_SPEED = 180;

const CALIBRATION_STAGES = [
  {
    speed: 180,
    label: "ゆっくり読んでみよう",
    text: "Webページは、情報を見つけやすく整理すると読みやすくなります。見出しを使うと、内容のまとまりが伝わります。",
    question: "文章で、読みやすさにつながる工夫として紹介されていたのは？",
    choices: ["見出しで内容をまとめる", "画像をすべて大きくする", "文字をすべて赤くする"],
    answer: 0
  },
  {
    speed: 240,
    label: "標準の速さで読もう",
    text: "スマートフォン向けのページでは、ボタンを指で押しやすい大きさにします。画面が狭くても、重要な情報と次の操作が見つかるように余白を確保します。",
    question: "スマートフォン向けページで大切なことは？",
    choices: ["すべての文章を小さくする", "ボタンを押しやすくし、重要な情報を見つけやすくする", "余白をなくして情報を詰め込む"],
    answer: 1
  },
  {
    speed: 300,
    label: "少し速めに挑戦",
    text: "公開前の確認では、ページ間のリンク、画像の代替テキスト、狭い画面での表示を順に確かめます。変更したファイルと確認内容を記録すると、引き継ぎも安全です。",
    question: "公開前の確認に含まれていないものはどれ？",
    choices: ["ページ間のリンク", "画像の代替テキスト", "キーボードの色を毎回変える"],
    answer: 2
  }
];

const READING_CONTENTS = {
  assignment: {
    type: "課題文",
    title: "カフェサイトの公開前チェック",
    summary: "制作したページを、公開前に確認する課題文です。",
    text: "課題では、地域のカフェサイトを公開できる状態に仕上げます。まずトップページ、メニュー、アクセスの三ページを確認してください。見出しはページごとに一つにし、営業時間と住所はスマートフォンでも見つけやすくします。最後にリンクを押し、画像の代替テキストと、狭い画面での表示を確かめます。問題がなければ、変更したファイルと確認した内容を記録してから公開します。"
  },
  htmlExplanation: {
    type: "解説文",
    title: "HTMLの役割",
    summary: "文章や画像の意味を、ブラウザーへ伝える解説文です。",
    text: "HTMLは、ページに何が書かれているかを表す設計図です。見出しにはh1やh2、段落にはp、リンクにはaを使います。見た目を先に決めるのではなく、内容の役割に合う要素を選ぶと、読み上げソフトや検索エンジンにも構造が伝わります。画像には、見えない人にも内容が分かるようにalt属性を用意します。"
  },
  cssExplanation: {
    type: "解説文",
    title: "CSSで見た目を整える",
    summary: "レイアウトと余白を、CSSで調整する解説文です。",
    text: "CSSは、HTMLで分けた内容の見た目を整える仕組みです。colorで文字色、backgroundで背景、marginで外側の余白、paddingで内側の余白を指定します。display flexやgridを使うと、カードやナビゲーションを並べられます。画面幅が変わっても読めるように、狭い画面では列を一つにするなど、レスポンシブなルールも加えます。"
  },
  workflowExplanation: {
    type: "解説文",
    title: "依頼から公開まで",
    summary: "依頼を読み、制作・確認・報告する流れの解説文です。",
    text: "Web制作は、依頼を読んですぐにコードを書く仕事ではありません。まず目的、対象者、変えてよい範囲、完成条件を整理します。次に必要なファイルを編集し、ブラウザーで表示と操作を確認します。最後に、変更した場所、確認した結果、残っている課題を短く報告します。記録を残すと、別の人が安全に続きを作れます。"
  },
  custom: {
    type: "貼り付けた文章",
    title: "自分の文章",
    summary: "課題や解説文を貼り付けて読めます。",
    text: ""
  }
};

const elementIds = [
  "readerSpeedStatus", "readerCalibrationStatus", "calibrationBadge", "calibrationSteps",
  "calibrationIntro", "startCalibration", "calibrationRun", "calibrationStageLabel",
  "calibrationStageTitle", "calibrationStageSpeed", "calibrationInstruction", "calibrationWord",
  "calibrationProgressBar", "startCalibrationStage", "pauseCalibration", "calibrationQuestion",
  "calibrationQuestionTitle", "calibrationChoices", "calibrationFeedback", "nextCalibrationStage",
  "calibrationComplete", "calibrationResultTitle", "calibrationResultText", "calibrationResultSpeed",
  "restartCalibration", "readerGate", "contentSelect", "contentType", "contentTitle",
  "contentSummary", "contentCount", "contentMinutes", "customInput", "customText", "loadCustomText",
  "speedRange", "speedOutput", "playerState", "rsvpWord", "readerAccessibleText",
  "readerProgressTrack", "readerProgressBar", "readerProgressText", "readerRemainingText",
  "readerBack", "readerPlay", "readerNext", "readerRestart"
];

const els = Object.fromEntries(elementIds.map(id => [id, document.getElementById(id)]));
const calibrationSteps = [...els.calibrationSteps.querySelectorAll("[data-step]")];

let speed = loadSpeed();
let calibrated = false;
let calibrationResults = [];
let calibrationStageIndex = 0;
let calibrationUnits = [];
let calibrationCursor = -1;
let calibrationTimer;
let calibrationPlaying = false;
let calibrationChoiceLocked = false;
let readerUnits = [];
let readerCursor = -1;
let readerTimer;
let readerPlaying = false;
let selectedContent = "assignment";

function loadSpeed() {
  const saved = Number(window.CourseStorage.getItem(SPEED_KEY));
  return Number.isFinite(saved) && saved >= 120 ? Math.min(saved, 600) : DEFAULT_SPEED;
}

function loadCalibration() {
  try {
    const saved = JSON.parse(window.CourseStorage.getItem(CALIBRATION_KEY));
    if (!saved || saved.completed !== true) return;
    calibrated = true;
    calibrationResults = Array.isArray(saved.results) ? saved.results : [];
    const currentSpeed = Number(window.CourseStorage.getItem(SPEED_KEY));
    if (!(Number.isFinite(currentSpeed) && currentSpeed >= 120) && Number.isFinite(saved.speed)) {
      speed = Math.min(Math.max(saved.speed, 120), 600);
    }
  } catch {
    calibrated = false;
  }
}

function saveCalibration(recommendedSpeed) {
  speed = recommendedSpeed;
  window.CourseStorage.setItem(SPEED_KEY, String(speed));
  window.CourseStorage.setItem(CALIBRATION_KEY, JSON.stringify({
    completed: true,
    results: calibrationResults,
    speed,
    completedAt: new Date().toISOString()
  }));
}

function tokenize(text) {
  const normalized = String(text || "").replace(/\s+/gu, " ").trim();
  if (!normalized) return [];
  const matches = normalized.match(/[A-Za-z0-9][A-Za-z0-9+#._:/-]*|[\u3040-\u30ff\u3400-\u9fff々ー]{1,3}|[。、！？!?.,;:…]+|[^\s]/gu);
  return matches ? matches.map(unit => unit.trim()).filter(Boolean) : [];
}

function formatSpeed(value) {
  return `${value}文字/分`;
}

function formatMinutes(characterCount, currentSpeed = speed) {
  if (!characterCount) return "0";
  return String(Math.max(1, Math.ceil(characterCount / currentSpeed)));
}

function renderRsvpUnit(element, unit, fallbackText) {
  element.replaceChildren();
  if (!unit) {
    element.textContent = fallbackText;
    return;
  }
  const fragment = document.createDocumentFragment();
  const chars = Array.from(unit);
  const pivotIndex = Math.min(chars.length - 1, Math.floor(chars.length / 2));
  chars.forEach((char, index) => {
    const span = document.createElement("span");
    span.textContent = char;
    if (index === pivotIndex) span.className = "rsvp-pivot";
    fragment.appendChild(span);
  });
  element.appendChild(fragment);
}

function unitDelay(unit, currentSpeed = speed) {
  const characterCount = Math.max(Array.from(unit || "").length, 1);
  let delay = characterCount * 60000 / currentSpeed;
  if (/^[。！？!?]/u.test(unit)) delay *= 1.65;
  if (/^[、,;:]/u.test(unit)) delay *= 1.2;
  return Math.max(delay, 90);
}

function clearTimer(timerName) {
  window.clearTimeout(timerName);
}

function updateCalibrationSteps() {
  calibrationSteps.forEach((step, index) => {
    step.classList.toggle("is-current", index === calibrationStageIndex && !calibrated);
    step.classList.toggle("is-passed", calibrationResults[index] === true);
    step.classList.toggle("is-failed", calibrationResults[index] === false);
  });
}

function updateCalibrationHeader() {
  els.readerSpeedStatus.textContent = calibrated ? formatSpeed(speed) : "未測定";
  els.readerCalibrationStatus.textContent = calibrated ? "キャリブレーション済み" : "まずはキャリブレーション";
  els.calibrationBadge.textContent = calibrated ? "測定済み" : "未測定";
  els.calibrationBadge.classList.toggle("is-complete", calibrated);
  els.speedRange.value = String(speed);
  els.speedOutput.textContent = formatSpeed(speed);
}

function updateReaderAccess() {
  const canRead = calibrated && readerUnits.length > 0;
  [els.readerPlay, els.readerBack, els.readerNext, els.readerRestart].forEach(button => {
    button.disabled = !canRead;
  });
  els.readerGate.textContent = calibrated ? "準備OK。速度はあとから調整できます" : "キャリブレーション後に開始できます";
  els.readerGate.classList.toggle("is-ready", calibrated);
  if (!calibrated) {
    els.playerState.textContent = "準備中";
    els.playerState.classList.remove("is-playing");
    els.readerAccessibleText.textContent = "キャリブレーション後に読書を開始できます。";
  }
}

function renderProgress(index, units, bar, text, remaining) {
  const total = units.length;
  const current = index < 0 ? 0 : Math.min(index + 1, total);
  const percentage = total ? current / total * 100 : 0;
  bar.style.width = `${percentage}%`;
  if (text) text.textContent = `${current} / ${total}`;
  if (remaining) remaining.textContent = total ? (current >= total ? "読了" : `あと${total - current}まとまり`) : "準備中";
  return percentage;
}

function setupCalibrationStage() {
  const stage = CALIBRATION_STAGES[calibrationStageIndex];
  calibrationUnits = tokenize(stage.text);
  calibrationCursor = -1;
  calibrationPlaying = false;
  calibrationChoiceLocked = false;
  clearTimer(calibrationTimer);
  els.calibrationStageLabel.textContent = `第${calibrationStageIndex + 1}段階`;
  els.calibrationStageTitle.textContent = stage.label;
  els.calibrationStageSpeed.textContent = formatSpeed(stage.speed);
  els.calibrationInstruction.textContent = "読み終わったら、文章の内容を三択で答えます。";
  renderRsvpUnit(els.calibrationWord, "", "準備");
  els.calibrationProgressBar.style.width = "0%";
  els.startCalibrationStage.hidden = false;
  els.startCalibrationStage.textContent = `第${calibrationStageIndex + 1}段階を読む`;
  els.pauseCalibration.hidden = true;
  els.calibrationQuestion.hidden = true;
  els.calibrationFeedback.textContent = "";
  els.nextCalibrationStage.hidden = true;
  updateCalibrationSteps();
}

function renderCalibrationUnit() {
  const unit = calibrationUnits[calibrationCursor];
  renderRsvpUnit(els.calibrationWord, unit, "準備");
  const percentage = calibrationUnits.length ? Math.min((calibrationCursor + 1) / calibrationUnits.length * 100, 100) : 0;
  els.calibrationProgressBar.style.width = `${percentage}%`;
}

function finishCalibrationReading() {
  calibrationPlaying = false;
  clearTimer(calibrationTimer);
  els.pauseCalibration.hidden = true;
  els.calibrationInstruction.textContent = "読み終わりました。覚えている内容を一つ選んでください。";
  els.calibrationQuestion.hidden = false;
  const stage = CALIBRATION_STAGES[calibrationStageIndex];
  els.calibrationQuestionTitle.textContent = stage.question;
  els.calibrationChoices.replaceChildren();
  stage.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-button";
    button.textContent = choice;
    button.addEventListener("click", () => answerCalibration(index));
    els.calibrationChoices.appendChild(button);
  });
}

function scheduleCalibrationUnit() {
  clearTimer(calibrationTimer);
  if (!calibrationPlaying) return;
  calibrationTimer = window.setTimeout(() => {
    if (!calibrationPlaying) return;
    if (calibrationCursor >= calibrationUnits.length - 1) {
      finishCalibrationReading();
      return;
    }
    calibrationCursor += 1;
    renderCalibrationUnit();
    scheduleCalibrationUnit();
  }, unitDelay(calibrationUnits[calibrationCursor], CALIBRATION_STAGES[calibrationStageIndex].speed));
}

function startCalibrationStage() {
  if (calibrationPlaying) return;
  if (calibrationCursor < 0) calibrationCursor = 0;
  calibrationPlaying = true;
  els.startCalibrationStage.hidden = true;
  els.pauseCalibration.hidden = false;
  els.pauseCalibration.textContent = "一時停止";
  renderCalibrationUnit();
  scheduleCalibrationUnit();
}

function toggleCalibrationPause() {
  if (!calibrationPlaying) {
    if (calibrationCursor >= 0 && !els.calibrationQuestion.hidden) return;
    calibrationPlaying = true;
    els.pauseCalibration.textContent = "一時停止";
    scheduleCalibrationUnit();
    return;
  }
  calibrationPlaying = false;
  clearTimer(calibrationTimer);
  els.pauseCalibration.textContent = "再開";
}

function answerCalibration(answerIndex) {
  if (calibrationChoiceLocked) return;
  calibrationChoiceLocked = true;
  const stage = CALIBRATION_STAGES[calibrationStageIndex];
  const isCorrect = answerIndex === stage.answer;
  calibrationResults[calibrationStageIndex] = isCorrect;
  [...els.calibrationChoices.children].forEach((button, index) => {
    button.disabled = true;
    if (index === stage.answer) button.classList.add("is-correct");
    if (index === answerIndex && !isCorrect) button.classList.add("is-wrong");
  });
  els.calibrationFeedback.className = `calibration-feedback ${isCorrect ? "is-correct" : "is-wrong"}`;
  els.calibrationFeedback.textContent = isCorrect
    ? "正解です。次の速度へ進みます。"
    : `今回は不正解です。正解は「${stage.choices[stage.answer]}」でした。`;
  els.nextCalibrationStage.hidden = false;
  els.nextCalibrationStage.textContent = calibrationStageIndex === CALIBRATION_STAGES.length - 1
    ? "結果を見る"
    : `第${calibrationStageIndex + 2}段階へ`;
  updateCalibrationSteps();
}

function beginCalibration() {
  clearTimer(calibrationTimer);
  calibrated = false;
  calibrationResults = [];
  calibrationStageIndex = 0;
  els.calibrationIntro.hidden = true;
  els.calibrationComplete.hidden = true;
  els.calibrationRun.hidden = false;
  updateCalibrationHeader();
  updateReaderAccess();
  setupCalibrationStage();
}

function nextCalibrationStage() {
  if (!calibrationChoiceLocked) return;
  if (calibrationStageIndex >= CALIBRATION_STAGES.length - 1) {
    finishCalibration();
    return;
  }
  calibrationStageIndex += 1;
  setupCalibrationStage();
}

function finishCalibration() {
  let passedStages = 0;
  for (const result of calibrationResults) {
    if (!result) break;
    passedStages += 1;
  }
  const correctCount = calibrationResults.filter(Boolean).length;
  const recommendedSpeed = passedStages > 0 ? CALIBRATION_STAGES[passedStages - 1].speed : 140;
  saveCalibration(recommendedSpeed);
  calibrated = true;
  calibrationPlaying = false;
  clearTimer(calibrationTimer);
  els.calibrationRun.hidden = true;
  els.calibrationComplete.hidden = false;
  els.calibrationResultSpeed.textContent = formatSpeed(speed);
  els.calibrationResultTitle.textContent = passedStages === CALIBRATION_STAGES.length
    ? "300文字/分まで読めました"
    : `${formatSpeed(speed)}を基準にします`;
  els.calibrationResultText.textContent = `${correctCount} / 3問正解。連続して正答できた段階の速度を、あなたの読みやすい速度として設定しました。`;
  updateCalibrationHeader();
  updateCalibrationSteps();
  updateReaderAccess();
}

function renderReaderUnit() {
  const unit = readerUnits[readerCursor];
  renderRsvpUnit(els.rsvpWord, unit, calibrated ? "準備完了" : "要測定");
  els.readerAccessibleText.textContent = unit || (calibrated ? "準備できたら読書を開始できます。" : "キャリブレーション後に読書を開始できます。");
  const percentage = renderProgress(readerCursor, readerUnits, els.readerProgressBar, els.readerProgressText, els.readerRemainingText);
  els.readerProgressTrack.value = Math.round(percentage);
}

function finishReader() {
  readerPlaying = false;
  clearTimer(readerTimer);
  readerCursor = readerUnits.length - 1;
  renderReaderUnit();
  if (selectedContent !== "custom") {
    const key = "code-type-rsvp-completed-v1";
    let completed = {};
    try { completed = JSON.parse(window.CourseStorage.getItem(key)) || {}; } catch {}
    completed[selectedContent] = new Date().toISOString();
    window.CourseStorage.setItem(key, JSON.stringify(completed));
  }
  els.playerState.textContent = "読了";
  els.playerState.classList.remove("is-playing");
  els.readerPlay.textContent = "↻ もう一度";
}

function scheduleReaderUnit() {
  clearTimer(readerTimer);
  if (!readerPlaying) return;
  readerTimer = window.setTimeout(() => {
    if (!readerPlaying) return;
    if (readerCursor >= readerUnits.length - 1) {
      finishReader();
      return;
    }
    readerCursor += 1;
    renderReaderUnit();
    scheduleReaderUnit();
  }, unitDelay(readerUnits[readerCursor]));
}

function startReader() {
  if (!calibrated || !readerUnits.length) return;
  if (readerCursor >= readerUnits.length - 1) readerCursor = -1;
  if (readerCursor < 0) readerCursor = 0;
  readerPlaying = true;
  els.playerState.textContent = "再生中";
  els.playerState.classList.add("is-playing");
  els.readerPlay.textContent = "Ⅱ 一時停止";
  renderReaderUnit();
  scheduleReaderUnit();
}

function toggleReader() {
  if (!calibrated || !readerUnits.length) return;
  if (readerPlaying) {
    readerPlaying = false;
    clearTimer(readerTimer);
    els.playerState.textContent = "一時停止";
    els.playerState.classList.remove("is-playing");
    els.readerPlay.textContent = "▶ 再開";
    return;
  }
  startReader();
}

function moveReader(delta) {
  if (!calibrated || !readerUnits.length) return;
  clearTimer(readerTimer);
  readerCursor = Math.min(Math.max(readerCursor < 0 ? 0 : readerCursor + delta, 0), readerUnits.length - 1);
  renderReaderUnit();
  if (readerPlaying) scheduleReaderUnit();
}

function restartReader() {
  if (!calibrated || !readerUnits.length) return;
  readerPlaying = false;
  clearTimer(readerTimer);
  readerCursor = -1;
  els.playerState.textContent = "準備完了";
  els.playerState.classList.remove("is-playing");
  els.readerPlay.textContent = "▶ 読む";
  renderReaderUnit();
}

function updateContentSummary(content) {
  const characterCount = Array.from(content.text).length;
  els.contentType.textContent = content.type;
  els.contentTitle.textContent = content.title;
  els.contentSummary.textContent = content.summary;
  els.contentCount.textContent = String(characterCount);
  els.contentMinutes.textContent = formatMinutes(characterCount);
}

function loadSelectedContent() {
  const content = READING_CONTENTS[selectedContent];
  readerPlaying = false;
  clearTimer(readerTimer);
  readerUnits = tokenize(content.text);
  readerCursor = -1;
  updateContentSummary(content);
  if (selectedContent !== "custom") {
    try {
      const completed = JSON.parse(window.CourseStorage.getItem("code-type-rsvp-completed-v1")) || {};
      if (completed[selectedContent]) els.contentSummary.textContent += "（読了済み）";
    } catch { /* A damaged local record does not block reading. */ }
  }
  els.playerState.textContent = calibrated ? "準備完了" : "準備中";
  els.playerState.classList.remove("is-playing");
  els.readerPlay.textContent = "▶ 読む";
  renderReaderUnit();
  updateReaderAccess();
}

function loadCustomContent() {
  const text = els.customText.value.trim();
  if (!text) {
    els.customText.focus();
    return;
  }
  READING_CONTENTS.custom.text = text;
  selectedContent = "custom";
  els.contentSelect.value = "custom";
  loadSelectedContent();
}

function updateSpeed() {
  speed = Number(els.speedRange.value);
  els.speedOutput.textContent = formatSpeed(speed);
  if (calibrated) window.CourseStorage.setItem(SPEED_KEY, String(speed));
  if (readerPlaying) scheduleReaderUnit();
  const content = READING_CONTENTS[selectedContent];
  els.contentMinutes.textContent = formatMinutes(Array.from(content.text).length);
}

els.startCalibration.addEventListener("click", beginCalibration);
els.startCalibrationStage.addEventListener("click", startCalibrationStage);
els.pauseCalibration.addEventListener("click", toggleCalibrationPause);
els.nextCalibrationStage.addEventListener("click", nextCalibrationStage);
els.restartCalibration.addEventListener("click", beginCalibration);
els.contentSelect.addEventListener("change", event => {
  selectedContent = event.target.value;
  els.customInput.hidden = selectedContent !== "custom";
  loadSelectedContent();
});
els.loadCustomText.addEventListener("click", loadCustomContent);
els.speedRange.addEventListener("input", updateSpeed);
els.readerPlay.addEventListener("click", toggleReader);
els.readerBack.addEventListener("click", () => moveReader(-1));
els.readerNext.addEventListener("click", () => moveReader(1));
els.readerRestart.addEventListener("click", restartReader);

document.addEventListener("keydown", event => {
  if (event.target.matches("input, textarea, select, button, a")) return;
  if (event.code === "Space") {
    event.preventDefault();
    toggleReader();
  }
  if (event.key === "ArrowLeft") moveReader(-1);
  if (event.key === "ArrowRight") moveReader(1);
});

loadCalibration();
updateCalibrationHeader();
if (calibrated) {
  els.calibrationIntro.hidden = true;
  els.calibrationComplete.hidden = false;
  els.calibrationResultSpeed.textContent = formatSpeed(speed);
  els.calibrationResultTitle.textContent = `${formatSpeed(speed)}を基準にします`;
  const passed = calibrationResults.filter(Boolean).length;
  els.calibrationResultText.textContent = `${passed} / 3問を正答した記録があります。速度はスライダーで調整できます。`;
} else {
  els.calibrationIntro.hidden = false;
  els.calibrationRun.hidden = true;
  els.calibrationComplete.hidden = true;
}
updateCalibrationSteps();
els.customInput.hidden = true;
loadSelectedContent();
